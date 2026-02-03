import { Container, Sprite, Rectangle, Graphics, Texture } from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import { ZLayer, ZEngineSignal, type ZEventGraphic, type ZMoveCommand } from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'

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
}

export class EntityRenderSystem extends ZSystem {
  public container: Container
  private playerSystem: PlayerSystem
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
  }

  public async loadEvents(): Promise<void> {
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
      if (!activePage || !activePage.graphic) continue

      // Ensure texture is loaded
      const assetPath = activePage.graphic.assetId
      await this.textures.load(assetPath)

      const sprite = SpriteUtils.createEventSprite(
        activePage.graphic,
        this.textures,
        this.tileSize,
        false
      )

      if (sprite) {
        sprite.x = event.x * this.tileSize
        sprite.y = event.y * this.tileSize

        if (activePage.graphic.group === 'character' && sprite instanceof Sprite) {
          sprite.x += this.tileSize / 2
          sprite.y += this.tileSize

          const tex = this.textures.get(assetPath)!
          const { frameW, frameH, divW, divH } = SpriteUtils.getFrameRect(activePage.graphic, tex)
          const colsPerChar = divW % 4 === 0 && divW % 3 !== 0 ? 4 : 3
          const snapX = colsPerChar
          const snapY = divH % 4 === 0 ? 4 : 1

          const baseY = Math.floor((activePage.graphic.y || 0) / snapY) * snapY
          const dirMap: ('down' | 'left' | 'right' | 'up')[] = ['down', 'left', 'right', 'up']
          const initialDir = dirMap[(activePage.graphic.y || 0) % 4] || 'down'

          this.eventMetadata.set(event.id, {
            id: event.id,
            sprite,
            colsPerChar,
            baseX: Math.floor((activePage.graphic.x || 0) / snapX) * snapX,
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
            moveSpeed: activePage.moveSpeed || 3,
            moveFrequency: activePage.moveFrequency || 3,
            moveRoute: activePage.moveRoute || [],
            moveRouteIndex: (activePage.moveRoute?.length || 0) > 0 ? 0 : -1,
            moveRouteRepeat: activePage.moveRouteRepeat ?? true,
            moveRouteSkip: activePage.moveRouteSkip ?? true,
            moveType: activePage.moveType || 'fixed',
            isThrough: event.isThrough || false,
            waitTimer: 0,
            walkAnim: activePage.options?.walkAnim ?? true,
            stepAnim: activePage.options?.stepAnim ?? false,
            directionFix: activePage.options?.directionFix ?? false,
            transparent: false,
            opacity: 255
          })
        }
        sprite.zIndex = (event.y + 1) * this.tileSize

        this.container.addChild(sprite)
        this.eventSprites.set(event.id, sprite)
      }
    }
  }

  public async onBoot(): Promise<void> {
    this.playerSystem = this.services.require(PlayerSystem)
    const renderSystem = this.services.require(RenderSystem)
    this.movementProcessor = new MovementProcessor(this.services.require(PhysicsSystem))

    // Entities share the decoration layer for Y-sorting with tiles
    this.container = renderSystem.getLayerContainer(ZLayer.decoration)

    await this.createPlayerSprite()

    this.bus.on(ZEngineSignal.EventInternalStateChanged, this.onEventStateChanged.bind(this))
  }

  private async onEventStateChanged({
    eventId,
    direction,
    graphic,
    moveRoute
  }: {
    eventId: string
    direction?: 'down' | 'left' | 'right' | 'up'
    graphic?: ZEventGraphic
    moveRoute?: ZMoveCommand[]
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
    this.container.visible = visible

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
      const speed = (meta.moveSpeed * delta) / 16.66
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
      // 2. Process next command in move route
      this.movementProcessor.processNextCommand(meta, {
        x: this.playerSystem.x,
        y: this.playerSystem.y
      })
    }

    // Always update alpha/transparency based on current state
    meta.sprite.alpha = meta.transparent ? 0 : meta.opacity / 255
  }

  private updateEntityAnimation(meta: SpriteMetadata, delta: number): void {
    if (!meta.sprite || meta.sprite.destroyed || !meta.sprite.texture) return

    const shouldAnimate = (meta.isMoving && meta.walkAnim) || meta.stepAnim

    if (shouldAnimate) {
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
