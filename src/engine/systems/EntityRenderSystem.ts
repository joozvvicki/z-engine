import { Container, Sprite, Rectangle, Graphics, Texture } from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import { ZLayer, ZEngineSignal, type ZEventGraphic, type ZMoveCommand } from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'
import { EventSystem } from '@engine/systems/EventSystem'

import { MovementProcessor, type ZMoveable } from '@engine/core/MovementProcessor'

interface SpriteMetadata extends ZMoveable {
  sprite: Sprite
  colsPerChar: number
  baseX: number
  baseY: number
  frameW: number
  frameH: number
  animationFrame: number
  animationTimer: number
  realX: number
  realY: number
  preInteractionDirection?: 'down' | 'left' | 'right' | 'up' | null
  isInteracting?: boolean
  initialX: number
  initialY: number
}

export class EntityRenderSystem extends ZSystem {
  public container: Container
  private playerSystem: PlayerSystem
  private eventSystem: EventSystem
  private tileSize: number

  private playerSprite: Sprite | null = null
  private playerBaseX: number = 0
  private playerBaseY: number = 0
  private playerColsPerChar: number = 3 // 3 for RM standard, 4 for square sheets

  private frameWidth: number = 0
  private frameHeight: number = 0
  private animationFrame: number = 0
  private animationTimer: number = 0
  private readonly ANIMATION_SPEED: number = 150 // ms
  private movementProcessor: MovementProcessor | null = null
  private eventMetadata: Map<string, SpriteMetadata> = new Map()
  private eventSprites: Map<string, Container | Sprite> = new Map()

  constructor(services: ServiceLocator, tileSize: number) {
    super(services)
    this.updateMode = SystemMode.PLAY
    this.tileSize = tileSize

    this.container = new Container()
    this.container.label = 'EntityLayer'
    this.container.sortableChildren = true

    this.playerSystem = undefined as unknown as PlayerSystem
    this.eventSystem = undefined as unknown as EventSystem
  }

  public async loadEvents(): Promise<void> {
    // Restore positions of current events before clearing metadata
    this.restoreEventPositions()

    this.eventSprites.forEach((sprite) => {
      sprite.destroy()
    })
    this.eventSprites.clear()
    this.eventMetadata.clear()

    const map = this.map.currentMap
    if (!map || !map.events) return

    for (const event of map.events) {
      if (event.name === 'PlayerStart') continue

      const activePage = event.pages[0]
      // REMOVED: if (!activePage || !activePage.graphic) continue
      // FIX: Process event even if no graphic, to allow 'invisible' movers/controllers.

      let sprite: Sprite | null = null

      if (activePage && activePage.graphic) {
        // Ensure texture is loaded
        const assetPath = activePage.graphic.assetId
        await this.textures.load(assetPath)

        sprite = SpriteUtils.createEventSprite(
          activePage.graphic,
          this.textures,
          this.tileSize,
          false
        )
      } else {
        // Create dummy sprite for invisible events so they have state/metadata
        sprite = new Sprite()
        sprite.visible = false
      }

      if (sprite) {
        sprite.x = event.x * this.tileSize
        sprite.y = event.y * this.tileSize

        let colsPerChar = 1
        let baseX = 0
        let baseY = 0
        let frameW = 0
        let frameH = 0
        let initialDir: 'down' | 'left' | 'right' | 'up' = 'down'

        if (activePage?.graphic && sprite instanceof Sprite) {
          sprite.x += this.tileSize / 2
          sprite.y += this.tileSize

          const assetPath = activePage.graphic.assetId
          const tex = this.textures.get(assetPath)!
          const {
            frameW: fw,
            frameH: fh,
            divW,
            divH
          } = SpriteUtils.getFrameRect(activePage.graphic, tex)
          frameW = fw
          frameH = fh

          colsPerChar = divW % 4 === 0 && divW % 3 !== 0 ? 4 : 3
          const snapX = colsPerChar
          const snapY = divH % 4 === 0 ? 4 : 1

          baseX = Math.floor((activePage.graphic.x || 0) / snapX) * snapX
          baseY = Math.floor((activePage.graphic.y || 0) / snapY) * snapY

          const dirMap: ('down' | 'left' | 'right' | 'up')[] = ['down', 'left', 'right', 'up']
          initialDir = dirMap[(activePage.graphic.y || 0) % 4] || 'down'
        }

        this.eventMetadata.set(event.id, {
          id: event.id,
          sprite,
          colsPerChar,
          baseX,
          baseY,
          frameW,
          frameH,
          animationFrame: 0,
          animationTimer: 0,
          isMoving: false,
          direction: initialDir,
          realX: event.x * this.tileSize,
          realY: event.y * this.tileSize,
          targetX: event.x,
          targetY: event.y,
          x: event.x,
          y: event.y,
          initialX: event.x,
          initialY: event.y,
          moveSpeed: activePage?.moveSpeed || 3,
          moveFrequency: activePage?.moveFrequency || 3,
          moveRoute: activePage?.moveRoute || [],
          moveRouteIndex: (activePage?.moveRoute?.length || 0) > 0 ? 0 : -1,
          moveRouteRepeat: activePage?.moveRouteRepeat ?? true,
          moveRouteSkip: activePage?.moveRouteSkip ?? true,
          moveType: activePage?.moveType || 'fixed',
          isThrough: (() => {
            const val = event.isThrough ?? activePage?.options?.through ?? false
            if (val) event.isThrough = true // Sync to map event for PhysicsSystem
            return val
          })(),
          waitTimer: 0,
          walkAnim: activePage?.options?.walkAnim ?? true,
          stepAnim: activePage?.options?.stepAnim ?? false,
          directionFix: activePage?.options?.directionFix ?? false,
          transparent: false,
          opacity: 255
        })
        sprite.zIndex = (event.y + 1) * this.tileSize

        this.container.addChild(sprite)
        this.eventSprites.set(event.id, sprite)
      }
    }
  }

  public async onBoot(): Promise<void> {
    this.playerSystem = this.services.require(PlayerSystem)
    this.eventSystem = this.services.require(EventSystem)
    const renderSystem = this.services.require(RenderSystem)
    this.movementProcessor = new MovementProcessor(this.services.require(PhysicsSystem))

    // Entities share the decoration layer for Y-sorting with tiles
    this.container = renderSystem.getLayerContainer(ZLayer.decoration)

    await this.createPlayerSprite()

    this.bus.on(ZEngineSignal.EventInternalStateChanged, this.onEventStateChanged.bind(this))
    this.bus.on(ZEngineSignal.EventExecutionStarted, ({ eventId, triggererPos }) => {
      this.onEventExecutionStarted(eventId, triggererPos)
    })
    this.bus.on(ZEngineSignal.EventExecutionFinished, ({ eventId }) => {
      this.onEventExecutionFinished(eventId)
    })
  }

  private restoreEventPositions(): void {
    const map = this.map.currentMap
    if (!map || !map.events) return

    for (const [eventId, meta] of this.eventMetadata.entries()) {
      const event = map.events.find((e) => e.id === eventId)
      if (event) {
        event.x = meta.initialX
        event.y = meta.initialY
      }
    }
  }

  public forceSetEventPosition(eventId: string, x: number, y: number): void {
    const meta = this.eventMetadata.get(eventId)
    if (meta) {
      meta.x = x
      meta.y = y
      meta.targetX = x
      meta.targetY = y
      meta.realX = x * this.tileSize
      meta.realY = y * this.tileSize
      meta.sprite.x = meta.realX + this.tileSize / 2
      meta.sprite.y = meta.realY + this.tileSize
      meta.sprite.zIndex = meta.sprite.y + 0.1

      const event = this.map.currentMap?.events.find((e) => e.id === eventId)
      if (event) {
        event.x = x
        event.y = y
      }
    }
  }

  private async onEventStateChanged({
    eventId,
    direction,
    graphic,
    moveType,
    moveSpeed,
    moveFrequency,
    moveRoute,
    moveRouteRepeat,
    moveRouteSkip,
    isThrough
  }: {
    eventId: string
    direction?: 'down' | 'left' | 'right' | 'up'
    graphic?: ZEventGraphic
    moveType?: 'fixed' | 'random' | 'approach' | 'custom'
    moveSpeed?: number
    moveFrequency?: number
    moveRoute?: ZMoveCommand[]
    moveRouteRepeat?: boolean
    moveRouteSkip?: boolean
    isThrough?: boolean
  }): Promise<void> {
    const meta = this.eventMetadata.get(eventId)
    if (!meta) return

    if (direction) {
      meta.direction = direction
    }

    if (moveRoute) {
      meta.moveRoute = moveRoute
      meta.moveRouteIndex = 0
    }

    if (moveType) meta.moveType = moveType
    if (moveSpeed !== undefined) meta.moveSpeed = moveSpeed
    if (moveFrequency !== undefined) meta.moveFrequency = moveFrequency
    if (moveRouteRepeat !== undefined) meta.moveRouteRepeat = moveRouteRepeat
    if (moveRouteSkip !== undefined) meta.moveRouteSkip = moveRouteSkip
    if (isThrough !== undefined) {
      meta.isThrough = isThrough
      // Sync with map event for PhysicsSystem
      const mapEvent = this.map.currentMap?.events.find((e) => e.id === eventId)
      if (mapEvent) {
        mapEvent.isThrough = isThrough
      }
    }

    if (graphic) {
      const tex = this.textures.get(graphic.assetId)
      if (tex) {
        const { frameW, frameH, divW, divH } = SpriteUtils.getFrameRect(graphic, tex)
        meta.colsPerChar = divW % 4 === 0 && divW % 3 !== 0 ? 4 : 3
        const snapX = meta.colsPerChar
        const snapY = divH % 4 === 0 ? 4 : 1

        meta.baseX = Math.floor((graphic.x || 0) / snapX) * snapX
        meta.baseY = Math.floor((graphic.y || 0) / snapY) * snapY
        meta.frameW = frameW
        meta.frameH = frameH

        // Update direction if the Y coordinate also implies one
        const dirMap: ('down' | 'left' | 'right' | 'up')[] = ['down', 'left', 'right', 'up']
        meta.direction = dirMap[(graphic.y || 0) % 4] || meta.direction
      }
    }
  }

  private onEventExecutionStarted(eventId: string, triggererPos?: { x: number; y: number }): void {
    const meta = this.eventMetadata.get(eventId)
    if (!meta) return

    meta.isInteracting = true

    // Force stop movement immediately
    if (meta.isMoving) {
      meta.realX = meta.targetX * this.tileSize
      meta.realY = meta.targetY * this.tileSize
      meta.x = meta.targetX
      meta.y = meta.targetY
      meta.isMoving = false

      // Update the event data as well (optional but good for consistency)
      const event = this.map.currentMap?.events.find((e) => e.id === eventId)
      if (event) {
        event.x = meta.x
        event.y = meta.y
      }
    }

    if (!triggererPos || meta.directionFix) return

    // Store current direction to restore later (only if not already stored)
    if (!meta.preInteractionDirection) {
      meta.preInteractionDirection = meta.direction
    }

    // Turn toward triggerer
    const dx = triggererPos.x - meta.x
    const dy = triggererPos.y - meta.y

    if (Math.abs(dx) > Math.abs(dy)) {
      meta.direction = dx > 0 ? 'right' : 'left'
    } else if (dy !== 0 || dx !== 0) {
      meta.direction = dy > 0 ? 'down' : 'up'
    }
  }

  private onEventExecutionFinished(eventId: string): void {
    const meta = this.eventMetadata.get(eventId)
    if (!meta) return

    meta.isInteracting = false

    if (!meta.preInteractionDirection) return

    // Restore direction
    meta.direction = meta.preInteractionDirection
    meta.preInteractionDirection = null
  }

  private async createPlayerSprite(): Promise<void> {
    try {
      const charPath = 'img/characters/character.png'

      // Ensure texture is loaded
      await this.textures.load(charPath)

      const graphic = {
        assetId: charPath,
        group: 'character' as const,
        x: 0,
        y: 0,
        w: 1,
        h: 1
      }

      this.playerSprite = SpriteUtils.createEventSprite(
        graphic,
        this.textures,
        this.tileSize,
        false
      )

      if (this.playerSprite) {
        const tex = this.textures.get(charPath)!
        const { frameW, frameH, divW } = SpriteUtils.getFrameRect(graphic, tex)
        this.playerColsPerChar = divW % 4 === 0 && divW % 3 !== 0 ? 4 : 3

        this.frameWidth = frameW
        this.frameHeight = frameH
        this.playerSprite.visible = true
        this.playerSprite.alpha = 1

        this.container.addChild(this.playerSprite)
      }
    } catch (e) {
      console.error('Failed to load character texture', e)
      // Fallback
      this.createFallbackSprite()
    }
  }

  private createFallbackSprite(): void {
    const graphics = new Graphics()
    graphics.rect(0, 0, this.tileSize, this.tileSize)
    graphics.fill(0xff0000)
    const c = new Container()
    c.addChild(graphics)
    this.playerSprite = c as unknown as Sprite
    this.container.addChild(this.playerSprite)
  }

  public setVisible(visible: boolean): void {
    // We NO LONGER toggle this.container.visible because it is shared with map tiles
    // and would hide the whole decoration layer!
    // Instead we toggle individual sprites.

    if (this.playerSprite) {
      this.playerSprite.visible = visible
      if (visible) this.playerSprite.alpha = 1
    }

    if (visible) {
      this.loadEvents()
      this.eventSprites.forEach((s) => {
        s.visible = true
        s.alpha = 1
      })
    } else {
      this.eventSprites.forEach((s) => (s.visible = false))
    }
  }

  public isTileOccupiedByMovingEntity(x: number, y: number): boolean {
    // Check Events
    for (const meta of this.eventMetadata.values()) {
      // FIX: Ignore events that are 'through'
      if (meta.isThrough) continue

      if (meta.x === x && meta.y === y) return true
      if (meta.isMoving && meta.targetX === x && meta.targetY === y) return true
    }
    return false
  }

  public async setPlayerGraphic(
    assetPath: string,
    x: number = 0,
    y: number = 0,
    srcW?: number,
    srcH?: number
  ): Promise<void> {
    if (!assetPath) return

    if (this.playerSprite) {
      this.playerSprite.destroy()
      this.playerSprite = null
    }

    const graphic = {
      assetId: assetPath,
      group: 'character' as const,
      x: x,
      y: y,
      w: 0,
      h: 0,
      srcX: 0,
      srcY: 0,
      srcW: srcW,
      srcH: srcH
    }

    try {
      // Ensure texture is loaded
      await this.textures.load(assetPath)

      this.playerSprite = SpriteUtils.createEventSprite(
        graphic,
        this.textures,
        this.tileSize,
        false
      )

      if (this.playerSprite) {
        const tex = this.textures.get(assetPath)!
        const { frameW, frameH, divW, divH } = SpriteUtils.getFrameRect(graphic, tex)

        // Determine if this is a 3-column character (standard) or 4-column (user's sheet)
        this.playerColsPerChar = divW % 4 === 0 && divW % 3 !== 0 ? 4 : 3

        // If it's a full sheet (12 cols), each char is 3 wide.
        // If it's 4 wide, it's 4.
        const snapX = this.playerColsPerChar
        const snapY = divH % 4 === 0 ? 4 : 1

        this.playerBaseX = Math.floor(x / snapX) * snapX
        this.playerBaseY = Math.floor(y / snapY) * snapY

        this.frameWidth = frameW
        this.frameHeight = frameH
        this.container.addChild(this.playerSprite)

        ZLogger.with('EntityRenderSystem').log('Player Graphic Set:', {
          path: assetPath,
          base: { x: this.playerBaseX, y: this.playerBaseY },
          frame: { w: frameW, h: frameH },
          colsPerChar: this.playerColsPerChar
        })

        // Refresh visibility
        this.setVisible(true)
      } else {
        ZLogger.with('EntityRenderSystem').warn('SpriteUtils returned null for asset:', assetPath)
        this.createFallbackSprite()
      }
    } catch (e) {
      ZLogger.with('EntityRenderSystem').warn('Could not set player graphic', assetPath, e)
      this.createFallbackSprite()
    }
  }

  public onUpdate(delta: number): void {
    // No longer return early based on container visibility as it's shared map tiles
    // SystemMode.PLAY ensures this ONLY runs in play mode.

    if (!this.playerSprite) return

    // Ensure sprites are in the correct container (e.g., after map switch or layer clear)
    if (this.playerSprite.parent !== this.container) {
      ZLogger.with('EntityRenderSystem').log('Re-adding player sprite to container')
      this.container.addChild(this.playerSprite)
    }

    this.eventSprites.forEach((s) => {
      if (s.parent !== this.container) {
        this.container.addChild(s)
      }
    })

    this.playerSprite.x = this.playerSystem.realX + this.tileSize / 2
    this.playerSprite.y = this.playerSystem.realY + this.tileSize

    // Y-sorting
    this.playerSprite.zIndex = this.playerSprite.y + 0.1

    // Force sorting of the decoration layer to reflect zIndex changes
    this.container.sortChildren()

    // 1. Update Player Animation
    if (this.playerSprite instanceof Sprite) {
      const playerMeta: SpriteMetadata = {
        id: 'PLAYER',
        sprite: this.playerSprite,
        colsPerChar: this.playerColsPerChar,
        baseX: this.playerBaseX,
        baseY: this.playerBaseY,
        frameW: this.frameWidth,
        frameH: this.frameHeight,
        isMoving: this.playerSystem.isMoving,
        direction: this.playerSystem.direction,
        animationFrame: this.animationFrame,
        animationTimer: this.animationTimer,
        realX: this.playerSystem.realX,
        realY: this.playerSystem.realY,
        targetX: this.playerSystem.targetX,
        targetY: this.playerSystem.targetY,
        x: this.playerSystem.x,
        y: this.playerSystem.y,
        initialX: this.playerSystem.x,
        initialY: this.playerSystem.y,
        moveSpeed: this.playerSystem.moveSpeed,
        moveFrequency: this.playerSystem.moveFrequency,
        moveRoute: this.playerSystem.moveRoute,
        moveRouteIndex: this.playerSystem.moveRouteIndex,
        moveRouteRepeat: this.playerSystem.moveRouteRepeat,
        moveRouteSkip: this.playerSystem.moveRouteSkip,
        moveType: this.playerSystem.moveType,
        isThrough: this.playerSystem.isThrough,
        waitTimer: this.playerSystem.waitTimer,
        walkAnim: this.playerSystem.walkAnim,
        stepAnim: this.playerSystem.stepAnim,
        directionFix: this.playerSystem.directionFix,
        transparent: this.playerSystem.transparent,
        opacity: this.playerSystem.opacity
      }
      this.updateEntityAnimation(playerMeta, delta)
      this.animationFrame = playerMeta.animationFrame
      this.animationTimer = playerMeta.animationTimer
    }

    // 2. Update Event Animations & Movement
    this.eventMetadata.forEach((meta, eventId) => {
      this.updateEventMovement(meta, eventId, delta)
      this.updateEntityAnimation(meta, delta)
    })

    // 3. Ensure all sprites (including tiles without metadata) have correct position/zIndex
    this.eventSprites.forEach((s, eventId) => {
      const meta = this.eventMetadata.get(eventId)
      if (!meta) {
        const event = this.map.currentMap?.events.find((e) => e.id === eventId)
        if (event) {
          s.x = event.x * this.tileSize
          s.y = event.y * this.tileSize
          s.zIndex = (event.y + 1) * this.tileSize
        }
      }
    })
  }

  private updateEventMovement(meta: SpriteMetadata, eventId: string, delta: number): void {
    const map = this.map.currentMap
    if (!map || !this.movementProcessor) return
    const event = map.events.find((e) => e.id === eventId)
    if (!event) return

    // 1. Process movement animation/interpolation
    if (meta.isMoving) {
      // RPG Maker style speed: Speed 4 = 1 tile per 32 frames (at 60fps)
      // actualSpeed = 2^(speed-4) * (tileSize / 32)
      const baseSpeed = Math.pow(2, meta.moveSpeed - 2) * (this.tileSize / 48)
      const speed = (baseSpeed * delta) / 16.66
      const targetRealX = meta.targetX * this.tileSize
      const targetRealY = meta.targetY * this.tileSize

      if (meta.realX < targetRealX) meta.realX = Math.min(meta.realX + speed, targetRealX)
      else if (meta.realX > targetRealX) meta.realX = Math.max(meta.realX - speed, targetRealX)

      if (meta.realY < targetRealY) meta.realY = Math.min(meta.realY + speed, targetRealY)
      else if (meta.realY > targetRealY) meta.realY = Math.max(meta.realY - speed, targetRealY)

      meta.sprite.x = meta.realX + this.tileSize / 2
      meta.sprite.y = meta.realY + this.tileSize
      meta.sprite.zIndex = meta.sprite.y + 0.1

      // Apply opacity/transparency
      meta.sprite.alpha = meta.transparent ? 0 : meta.opacity / 255

      if (meta.realX === targetRealX && meta.realY === targetRealY) {
        meta.isMoving = false
        meta.x = meta.targetX
        meta.y = meta.targetY
        event.x = meta.targetX
        event.y = meta.targetY
      }
    } else {
      // Sync with map data if not moving (crucial for editor updates)
      if (meta.x !== event.x || meta.y !== event.y) {
        meta.x = event.x
        meta.y = event.y
        meta.targetX = event.x
        meta.targetY = event.y
        meta.realX = event.x * this.tileSize
        meta.realY = event.y * this.tileSize
        meta.sprite.x = meta.realX + this.tileSize / 2
        meta.sprite.y = meta.realY + this.tileSize
        meta.sprite.zIndex = meta.sprite.y + 0.1
      }

      const isCustomMove = meta.moveType === 'custom'
      // FIX: Allow custom moves (Set Move Route) to override interaction lock
      if (isCustomMove || (!meta.isInteracting && !this.eventSystem.isProcessing)) {
        // 2. Process next command in move route (only if NOT interacting and no global event processing)
        // SKIP autonomous movement in Edit mode
        const engine = this.services.get('ZEngine') as { mode: string }
        if (engine && engine.mode === 'play') {
          // Process next command

          this.movementProcessor.processNextCommand(
            meta as unknown as ZMoveable,
            {
              x: this.playerSystem.x,
              y: this.playerSystem.y
            },
            delta
          )

          const routeFinished = meta.moveRouteIndex >= meta.moveRoute.length

          // State-Based Completion Check:
          // 1. Route commands exhausted?
          // 2. Not physically moving?
          // 3. Not waiting on a timer?
          if (
            routeFinished &&
            !meta.isMoving &&
            meta.waitTimer <= 0 &&
            !meta.moveRouteRepeat &&
            meta.moveRouteIndex !== -1 // Ensure we haven't already finished
          ) {
            console.log(`[EntityRenderSystem] Emitting MoveRouteFinished for ${eventId}`)
            // Disable further processing for this route to avoid repeated signals
            meta.moveRouteIndex = -1
            this.bus.emit(ZEngineSignal.MoveRouteFinished, { eventId })
          }
        }
      }
    }

    // Always update alpha/transparency based on current state
    meta.sprite.alpha = meta.transparent ? 0 : meta.opacity / 255
  }

  private updateEntityAnimation(meta: SpriteMetadata, delta: number): void {
    if (!meta.sprite || meta.sprite.destroyed || !meta.sprite.texture) return

    const shouldAnimate = (meta.isMoving && meta.walkAnim) || meta.stepAnim

    if (shouldAnimate && !meta.isInteracting) {
      meta.animationTimer += delta
      if (meta.animationTimer > this.ANIMATION_SPEED) {
        meta.animationTimer = 0
        meta.animationFrame = (meta.animationFrame + 1) % 4
      }
    } else {
      meta.animationFrame = SpriteUtils.getIdleFrameIndex(meta.colsPerChar)
      meta.animationTimer = 0
    }

    const row = this.getDirectionRow(meta.direction)
    const frames = meta.colsPerChar === 4 ? [0, 1, 2, 3] : [0, 1, 2, 1]
    const col = frames[meta.animationFrame] || 0

    const finalX = (meta.baseX + col) * meta.frameW
    const finalY = (meta.baseY + row) * meta.frameH

    meta.sprite.texture = new Texture({
      source: meta.sprite.texture.source,
      frame: new Rectangle(finalX, finalY, meta.frameW, meta.frameH)
    })
  }

  private getDirectionRow(dir: 'down' | 'left' | 'right' | 'up'): number {
    const map = {
      down: 0,
      left: 1,
      right: 2,
      up: 3
    }
    return map[dir] ?? 0
  }

  public onDestroy(): void {
    this.restoreEventPositions()

    if (this.playerSprite) {
      this.container.removeChild(this.playerSprite)
      this.playerSprite.destroy()
    }
    this.eventSprites.forEach((sprite) => {
      sprite.destroy()
    })
    this.eventSprites.clear()
    this.eventMetadata.clear()
  }
}
