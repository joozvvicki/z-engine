import { Container } from '@engine/utils/pixi'
import { ZLayer, ZEngineSignal, type ZEvent } from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'
import { EventSystem } from '@engine/systems/EventSystem'
import { CharacterSprite } from '@engine/sprites/CharacterSprite'
import { MovementProcessor } from '@engine/core/MovementProcessor'

/**
 * Manages the rendering of entities (Player and Events) on the map.
 * Now refactored to use CharacterSprite for improved modularity.
 */
export class EntityRenderSystem extends ZSystem {
  public container: Container
  private playerSystem: PlayerSystem
  private eventSystem: EventSystem
  private tileSize: number

  private playerCharacter: CharacterSprite | null = null
  private movementProcessor: MovementProcessor | null = null
  private eventCharacters: Map<string, CharacterSprite> = new Map()

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

  /**
   * Initializes systems and triggers initial entity creation.
   */
  public async onBoot(): Promise<void> {
    this.playerSystem = this.services.require(PlayerSystem)
    this.eventSystem = this.services.require(EventSystem)
    const renderSystem = this.services.require(RenderSystem)
    this.movementProcessor = new MovementProcessor(this.services.require(PhysicsSystem))

    // Entities share the decoration layer for Y-sorting with tiles
    this.container = renderSystem.getLayerContainer(ZLayer.decoration)

    await this.createPlayerCharacter()

    this.bus.on(ZEngineSignal.EventInternalStateChanged, this.onEventStateChanged.bind(this))
    this.bus.on(ZEngineSignal.EventExecutionStarted, ({ eventId, triggererPos }) => {
      this.onEventExecutionStarted(eventId, triggererPos)
    })
    this.bus.on(ZEngineSignal.EventExecutionFinished, ({ eventId }) => {
      this.onEventExecutionFinished(eventId)
    })
  }

  /**
   * Loads all events from the current map.
   */
  public async loadEvents(): Promise<void> {
    this.restoreEventPositions()

    this.eventCharacters.forEach((char) => char.destroy())
    this.eventCharacters.clear()

    const map = this.map.currentMap
    if (!map || !map.events) return

    for (const event of map.events) {
      if (event.name === 'PlayerStart') continue

      const activePage = event.pages[0]
      const char = new CharacterSprite(event.id, this.textures, this.tileSize)
      char.setGridPosition(event.x, event.y)

      // Initialize state from event/page
      char.moveSpeed = activePage?.moveSpeed || 5
      char.moveFrequency = activePage?.moveFrequency || 3
      char.moveRoute = activePage?.moveRoute || []
      char.moveRouteIndex = (activePage?.moveRoute?.length || 0) > 0 ? 0 : -1
      char.moveRouteRepeat = activePage?.moveRouteRepeat ?? true
      char.moveRouteSkip = activePage?.moveRouteSkip ?? true
      char.moveType = activePage?.moveType || 'fixed'
      char.isThrough = (() => {
        const val = event.isThrough ?? activePage?.options?.through ?? false
        if (val) event.isThrough = true
        return val
      })()
      char.walkAnim = activePage?.options?.walkAnim ?? true
      char.stepAnim = activePage?.options?.stepAnim ?? false
      char.directionFix = activePage?.options?.directionFix ?? false

      // Store event instance for persistence (casting for safe access)
      ;(char as unknown as Record<string, unknown>).eventInstance = event
      ;(char as unknown as Record<string, unknown>).initialX = event.x
      ;(char as unknown as Record<string, unknown>).initialY = event.y

      await char.setGraphic(activePage?.graphic || null)

      this.container.addChild(char.container)
      this.eventCharacters.set(event.id, char)
    }
  }

  private restoreEventPositions(): void {
    for (const char of this.eventCharacters.values()) {
      const it = char as unknown as Record<string, unknown>
      const event = it.eventInstance as ZEvent
      if (event) {
        event.x = it.initialX as number
        event.y = it.initialY as number
      }
    }
  }

  public forceSetEventPosition(eventId: string, x: number, y: number): void {
    const char = this.eventCharacters.get(eventId)
    if (char) {
      char.setGridPosition(x, y)
      const event = this.map.currentMap?.events.find((e) => e.id === eventId)
      if (event) {
        event.x = x
        event.y = y
      }
    }
  }

  private async onEventStateChanged(data: any): Promise<void> {
    const {
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
    } = data
    const char = this.eventCharacters.get(eventId)
    if (!char) return

    if (direction) char.direction = direction
    if (moveRoute) {
      char.moveRoute = moveRoute
      char.moveRouteIndex = 0
    }
    if (moveType) char.moveType = moveType
    if (moveSpeed !== undefined) char.moveSpeed = moveSpeed
    if (moveFrequency !== undefined) char.moveFrequency = moveFrequency
    if (moveRouteRepeat !== undefined) char.moveRouteRepeat = moveRouteRepeat
    if (moveRouteSkip !== undefined) char.moveRouteSkip = moveRouteSkip
    if (isThrough !== undefined) {
      char.isThrough = isThrough
      const mapEvent = this.map.currentMap?.events.find((e) => e.id === eventId)
      if (mapEvent) mapEvent.isThrough = isThrough
    }

    if (graphic) await char.setGraphic(graphic)
  }

  private onEventExecutionStarted(eventId: string, triggererPos?: { x: number; y: number }): void {
    const char = this.eventCharacters.get(eventId)
    if (!char) return

    char.isInteracting = true

    if (char.isMoving) {
      char.realX = char.targetX * this.tileSize
      char.realY = char.targetY * this.tileSize
      char.x = char.targetX
      char.y = char.targetY
      char.isMoving = false
      char.updateVisualPosition()

      const it = char as unknown as Record<string, unknown>
      const event = it.eventInstance as ZEvent
      if (event) {
        event.x = char.x
        event.y = char.y
      }
    }

    if (!triggererPos || char.directionFix) return

    if (!char.preInteractionDirection) char.preInteractionDirection = char.direction

    const dx = triggererPos.x - char.x
    const dy = triggererPos.y - char.y

    if (Math.abs(dx) > Math.abs(dy)) {
      char.direction = dx > 0 ? 'right' : 'left'
    } else if (dy !== 0 || dx !== 0) {
      char.direction = dy > 0 ? 'down' : 'up'
    }
  }

  private onEventExecutionFinished(eventId: string): void {
    const char = this.eventCharacters.get(eventId)
    if (!char) return

    char.isInteracting = false
    if (!char.preInteractionDirection) return

    char.direction = char.preInteractionDirection
    char.preInteractionDirection = null
  }

  private async createPlayerCharacter(): Promise<void> {
    const charPath = 'img/characters/character.png'
    this.playerCharacter = new CharacterSprite('PLAYER', this.textures, this.tileSize)
    await this.playerCharacter.setGraphic({
      assetId: charPath,
      group: 'character',
      x: 0,
      y: 0,
      w: 1,
      h: 1
    })
    this.playerCharacter.autoUpdateMovement = false
    this.container.addChild(this.playerCharacter.container)
  }

  public setVisible(visible: boolean): void {
    if (this.playerCharacter) this.playerCharacter.container.visible = visible
    this.eventCharacters.forEach((char) => (char.container.visible = visible))
    if (visible) this.loadEvents()
  }

  public isTileOccupiedByMovingEntity(x: number, y: number): boolean {
    for (const char of this.eventCharacters.values()) {
      if (char.isThrough) continue
      if (char.x === x && char.y === y) return true
      if (char.isMoving && char.targetX === x && char.targetY === y) return true
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
    if (!this.playerCharacter) return
    await this.playerCharacter.setGraphic({
      assetId: assetPath,
      group: 'character',
      x,
      y,
      w: 0,
      h: 0,
      srcX: 0,
      srcY: 0,
      srcW,
      srcH
    })
  }

  public onUpdate(delta: number): void {
    if (!this.playerCharacter) return

    // Ensure sprites are in the correct container
    if (this.playerCharacter.container.parent !== this.container) {
      this.container.addChild(this.playerCharacter.container)
    }

    this.eventCharacters.forEach((char) => {
      if (char.container.parent !== this.container) {
        this.container.addChild(char.container)
      }
    })

    // Sync PlayerCharacter with PlayerSystem
    this.playerCharacter.realX = this.playerSystem.realX
    this.playerCharacter.realY = this.playerSystem.realY
    this.playerCharacter.isMoving = this.playerSystem.isMoving
    this.playerCharacter.direction = this.playerSystem.direction
    this.playerCharacter.moveSpeed = this.playerSystem.moveSpeed
    this.playerCharacter.walkAnim = this.playerSystem.walkAnim
    this.playerCharacter.stepAnim = this.playerSystem.stepAnim
    this.playerCharacter.transparent = this.playerSystem.transparent
    this.playerCharacter.opacity = this.playerSystem.opacity
    this.playerCharacter.update(delta)

    this.eventCharacters.forEach((char, eventId) => {
      const wasMoving = char.isMoving
      this.updateEventMovement(char, eventId, delta)
      char.update(delta)

      // If movement just finished, sync back to logical data
      if (wasMoving && !char.isMoving) {
        const event = (char as unknown as Record<string, unknown>).eventInstance as ZEvent
        if (event) {
          event.x = char.x
          event.y = char.y
        }
      }
    })

    this.container.sortChildren()
  }

  private updateEventMovement(char: CharacterSprite, eventId: string, delta: number): void {
    const map = this.map.currentMap
    if (!map || !this.movementProcessor) return
    const event = map.events.find((e) => e.id === eventId)
    if (!event) return

    if (!char.isMoving) {
      // Sync from map data (for editor/teleport)
      if (char.x !== event.x || char.y !== event.y) {
        char.setGridPosition(event.x, event.y)
      }

      const isCustomMove = char.moveType === 'custom'
      if (isCustomMove || (!char.isInteracting && !this.eventSystem.isProcessing)) {
        const engine = this.services.get('ZEngine') as { mode: string }
        if (engine && engine.mode === 'play') {
          this.movementProcessor.processNextCommand(
            char,
            { x: this.playerSystem.x, y: this.playerSystem.y },
            delta
          )

          const routeFinished = char.moveRouteIndex >= char.moveRoute.length
          if (
            routeFinished &&
            !char.isMoving &&
            char.waitTimer <= 0 &&
            !char.moveRouteRepeat &&
            char.moveRouteIndex !== -1
          ) {
            char.moveRouteIndex = -1
            this.bus.emit(ZEngineSignal.MoveRouteFinished, { eventId })
          }
        }
      }
    }

    const mapEvent = this.map.currentMap?.events.find((e) => e.id === eventId)
    if (mapEvent) mapEvent.isThrough = char.isThrough
  }

  public onDestroy(): void {
    this.restoreEventPositions()
    if (this.playerCharacter) this.playerCharacter.destroy()
    this.eventCharacters.forEach((char) => char.destroy())
    this.eventCharacters.clear()
  }
}
