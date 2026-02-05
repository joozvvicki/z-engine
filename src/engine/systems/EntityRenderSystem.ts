import { Container } from '@engine/utils/pixi'
import { ZLayer, ZEngineSignal, type ZSignalData } from '@engine/types'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { EventSystem } from '@engine/systems/EventSystem'
import { CharacterSprite } from '@engine/sprites/CharacterSprite'
import { TextureManager } from '@engine/managers/TextureManager'
import { MapManager } from '@engine/managers/MapManager'
import { ZEventBus } from '@engine/core/ZEventBus'

/**
 * Manages the rendering of entities (Player and Events) on the map.
 * Refactored for Manual Dependency Injection.
 */
export class EntityRenderSystem {
  // Dependencies
  private playerSystem: PlayerSystem
  private eventSystem: EventSystem
  private renderSystem: RenderSystem
  private textures: TextureManager
  private mapManager: MapManager
  private eventBus: ZEventBus

  public container: Container
  private tileSize: number

  private playerCharacter: CharacterSprite | null = null
  private eventCharacters: Map<string, CharacterSprite> = new Map()

  constructor(
    playerSystem: PlayerSystem,
    eventSystem: EventSystem,
    renderSystem: RenderSystem,
    textures: TextureManager,
    mapManager: MapManager,
    eventBus: ZEventBus,
    tileSize: number
  ) {
    this.playerSystem = playerSystem
    this.eventSystem = eventSystem
    this.renderSystem = renderSystem
    this.textures = textures
    this.mapManager = mapManager
    this.eventBus = eventBus
    this.tileSize = tileSize

    this.container = new Container()
    this.container.label = 'EntityLayer'
    this.container.sortableChildren = true
  }

  /**
   * Initializes systems and triggers initial entity creation.
   * Called explicitly by ZEngine.init()
   */
  public async onBoot(): Promise<void> {
    // Entities share the decoration layer for Y-sorting with tiles
    // We replace the internal container with the one from RenderSystem to allow interleaving
    this.container = this.renderSystem.getLayerContainer(ZLayer.decoration)

    await this.createPlayerCharacter()

    this.eventBus.on(ZEngineSignal.EventInternalStateChanged, this.onEventStateChanged.bind(this))
  }

  /**
   * Loads all events from the current map.
   */
  public async loadEvents(): Promise<void> {
    this.eventCharacters.forEach((char) => char.destroy())
    this.eventCharacters.clear()

    const map = this.mapManager.currentMap
    if (!map || !map.events) return

    for (const event of map.events) {
      if (event.name === 'PlayerStart') continue

      const activePage = this.eventSystem.getActivePage(event)
      const char = new CharacterSprite(event.id, this.textures, this.tileSize)
      char.setGridPosition(event.x, event.y)

      // Initialize initial properties for sprite
      char.moveSpeed = activePage?.moveSpeed || 3
      char.walkAnim = activePage?.options?.walkAnim ?? true
      char.stepAnim = activePage?.options?.stepAnim ?? false
      char.directionFix = activePage?.options?.directionFix ?? false
      char.transparent = false

      await char.setGraphic(activePage?.graphic || null)

      // Sync initial direction logic if the graphic enforced a specific one (e.g. Left-facing sprite)
      // activePage?.graphic can provide a Y offset that implies direction.
      // We accept the Sprite's interpretation as the initial truth.
      if (char.direction !== 'down') {
        this.eventSystem.setEventDirection(event.id, char.direction)
      }

      // Bind to Event Runtime State
      const state = this.eventSystem.getEventState(event.id)
      if (state) {
        char.bindState(state)
      }

      this.container.addChild(char.container)
      this.eventCharacters.set(event.id, char)
    }
  }

  public forceSetEventPosition(eventId: string, x: number, y: number): void {
    const char = this.eventCharacters.get(eventId)
    if (char) {
      char.setGridPosition(x, y) // Snap visual
    }
  }

  private onEventStateChanged(data: ZSignalData[ZEngineSignal.EventInternalStateChanged]): void {
    const { eventId, graphic, moveSpeed, walkAnim, stepAnim, directionFix, isThrough } = data
    const char = this.eventCharacters.get(eventId)
    if (!char) return

    // Visual only updates
    if (moveSpeed !== undefined) char.moveSpeed = moveSpeed
    if (walkAnim !== undefined) char.walkAnim = walkAnim
    if (stepAnim !== undefined) char.stepAnim = stepAnim
    if (directionFix !== undefined) char.directionFix = directionFix
    if (isThrough !== undefined) char.isThrough = isThrough

    // Update graphic
    if (graphic !== undefined) {
      // Runtime update: Smart heuristic in CharacterSprite handles direction
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

    // Bind Player Sprite to Player System (which implements ZMoveable)
    this.playerCharacter.bindState(this.playerSystem)

    this.container.addChild(this.playerCharacter.container)
  }

  public setVisible(visible: boolean): void {
    if (this.playerCharacter) this.playerCharacter.container.visible = visible
    this.eventCharacters.forEach((char) => (char.container.visible = visible))
    if (visible) this.loadEvents()
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

    // Ensure sprites are in the correct container (in case RenderSystem reset layers)
    if (this.playerCharacter.container.parent !== this.container) {
      this.container.addChild(this.playerCharacter.container)
    }

    this.eventCharacters.forEach((char) => {
      if (char.container.parent !== this.container) {
        this.container.addChild(char.container)
      }
    })

    // Sync PlayerCharacter with PlayerSystem
    // Sync PlayerCharacter with PlayerSystem
    // Note: Data binding handles property sync now.
    this.playerCharacter.update(delta)

    this.eventCharacters.forEach((char) => {
      // Sync with EventSystem State
      // Note: Data binding handles property sync now.

      char.update(delta)
    })

    this.container.sortChildren()
  }

  public getEntitySprite(eventId: string): CharacterSprite | null {
    if (eventId === 'PLAYER') return this.playerCharacter
    return this.eventCharacters.get(eventId) || null
  }

  public onDestroy(): void {
    if (this.playerCharacter) this.playerCharacter.destroy()
    this.eventCharacters.forEach((char) => char.destroy())
    this.eventCharacters.clear()
  }
}
