import { Container } from '@engine/utils/pixi'
import { ZLayer, ZEngineSignal, type ZSignalData } from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { EventSystem } from '@engine/systems/EventSystem'
import { CharacterSprite } from '@engine/sprites/CharacterSprite'

/**
 * Manages the rendering of entities (Player and Events) on the map.
 * Now refactored to be PURELY visual, tracking EventSystem state.
 */
export class EntityRenderSystem extends ZSystem {
  public container: Container
  private playerSystem: PlayerSystem
  private eventSystem: EventSystem
  private tileSize: number

  private playerCharacter: CharacterSprite | null = null
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

    // Entities share the decoration layer for Y-sorting with tiles
    this.container = renderSystem.getLayerContainer(ZLayer.decoration)

    await this.createPlayerCharacter()

    this.bus.on(ZEngineSignal.EventInternalStateChanged, this.onEventStateChanged.bind(this))
    // We listen to visual cues if needed, but EventSystem handles logic.
    // We just poll state in update.
  }

  /**
   * Loads all events from the current map.
   */
  public async loadEvents(): Promise<void> {
    this.eventCharacters.forEach((char) => char.destroy())
    this.eventCharacters.clear()

    const map = this.map.currentMap
    if (!map || !map.events) return

    for (const event of map.events) {
      if (event.name === 'PlayerStart') continue

      const eventSystem = this.eventSystem || this.services.get(EventSystem)
      if (!eventSystem) {
        console.error('EntityRenderSystem: EventSystem not found during loadEvents')
        return
      }

      const activePage = eventSystem.getActivePage(event)
      const char = new CharacterSprite(event.id, this.textures, this.tileSize)
      char.setGridPosition(event.x, event.y)

      // Initialize initial properties for sprite
      char.moveSpeed = activePage?.moveSpeed || 3
      char.walkAnim = activePage?.options?.walkAnim ?? true
      char.stepAnim = activePage?.options?.stepAnim ?? false
      char.directionFix = activePage?.options?.directionFix ?? false
      char.transparent = false // TODO: if event has transparent flag

      await char.setGraphic(activePage?.graphic || null)

      this.container.addChild(char.container)
      this.eventCharacters.set(event.id, char)
    }
  }

  public forceSetEventPosition(eventId: string, x: number, y: number): void {
    // With Logic separation, this might be tricky if used for Logic placement.
    // But if used for visual snap, we update sprite.
    // Ideally we ask EventSystem to update state.
    const char = this.eventCharacters.get(eventId)
    if (char) {
      char.setGridPosition(x, y) // Snap visual
    }
    // We assume caller also updated EventSystem or Map event data if this was a logic change.
  }

  private onEventStateChanged(data: ZSignalData[ZEngineSignal.EventInternalStateChanged]): void {
    const { eventId, graphic, moveSpeed, walkAnim, stepAnim, directionFix, isThrough } = data
    const char = this.eventCharacters.get(eventId)
    if (!char) return

    // Visual only updates (props that CharacterSprite uses for rendering)
    if (moveSpeed !== undefined) char.moveSpeed = moveSpeed
    if (walkAnim !== undefined) char.walkAnim = walkAnim
    if (stepAnim !== undefined) char.stepAnim = stepAnim
    if (directionFix !== undefined) char.directionFix = directionFix
    // isThrough is logical but CharacterSprite might use it for debug tint?
    if (isThrough !== undefined) char.isThrough = isThrough

    // Update graphic
    if (graphic !== undefined) {
      char.setGraphic(graphic)
    }
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

  // DEPRECATED/MOVED: This method is now in EventSystem / used by PhysicsSystem via EventSystem
  // We keep it here returning false or error if something still calls it, or remove it.
  // PhysicsSystem no longer calls it.

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
      // Sync with EventSystem State
      const state = this.eventSystem.getEventState(eventId)
      if (state) {
        char.realX = state.realX
        char.realY = state.realY
        char.isMoving = state.isMoving
        char.direction = state.direction
        char.opacity = state.opacity ?? 255
        char.transparent = state.transparent ?? false
      }

      char.update(delta)
    })

    this.container.sortChildren()
  }

  public onDestroy(): void {
    if (this.playerCharacter) this.playerCharacter.destroy()
    this.eventCharacters.forEach((char) => char.destroy())
    this.eventCharacters.clear()
  }
}
