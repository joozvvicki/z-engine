import { ServiceLocator } from '../core/ServiceLocator'
import { ZEngineSignal } from '@engine/types'
import { ZMap, ZDataProvider } from '@engine/types'
import { MapManager } from './MapManager'
import { TextureManager } from './TextureManager'
import { TilesetManager } from './TilesetManager'
import { RenderSystem } from '../systems/RenderSystem'
import { EntityRenderSystem } from '../systems/EntityRenderSystem'
import { TransitionSystem } from '../systems/TransitionSystem'
import { ZEventBus } from '../core/ZEventBus'
import ZLogger from '../core/ZLogger'

export class SceneManager {
  private services: ServiceLocator
  private dataProvider: ZDataProvider | null = null
  private onMapChangeRequest: ((mapId: number, x: number, y: number) => Promise<void>) | null = null
  public isLoading: boolean = false

  constructor(services: ServiceLocator) {
    this.services = services
  }

  public setDataProvider(provider: ZDataProvider): void {
    this.dataProvider = provider
  }

  public setMapChangeCallback(
    callback: (mapId: number, x: number, y: number) => Promise<void>
  ): void {
    this.onMapChangeRequest = callback
  }

  public async loadMap(mapOrId: number | ZMap): Promise<void> {
    this.isLoading = true

    let map: ZMap | null = null
    if (typeof mapOrId === 'number') {
      if (!this.dataProvider) {
        throw new Error('[SceneManager] Cannot load map by ID: Data Provider not set')
      }
      map = await this.dataProvider.getMap(mapOrId)
    } else {
      map = mapOrId
    }

    if (!map) {
      ZLogger.error(`[SceneManager] Failed to load map: ${mapOrId}`)
      this.isLoading = false
      return
    }

    // Dependencies
    const tilesetManager = this.services.require(TilesetManager)
    const textureManager = this.services.require(TextureManager)
    const mapManager = this.services.require(MapManager)
    const renderSystem = this.services.get(RenderSystem)
    const entityRenderSystem = this.services.get(EntityRenderSystem)
    const eventBus = this.services.require(ZEventBus)

    // 1. Resolve full tileset URLs if not already present
    if (this.dataProvider) {
      const resolvedConfig: Record<string, string> = {}
      const slots = ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'Roofs']
      slots.forEach((slot) => {
        resolvedConfig[slot] = map!.tilesetConfig?.[slot] || this.dataProvider!.getTilesetUrl(slot)
      })
      map.tilesetConfig = resolvedConfig

      // 2. Load Collision Configs
      const configs = await this.dataProvider.getTilesetConfigs()
      tilesetManager.setConfigs(configs)
    }

    // 3. Preload all required textures
    const texturePromises = Object.entries(map.tilesetConfig).map(([id, url]) =>
      textureManager.loadTileset(id, url)
    )
    await Promise.all(texturePromises)

    // 4. Update core systems
    mapManager.setMap(map)
    renderSystem?.setMap(map)
    entityRenderSystem?.loadEvents()

    this.isLoading = false
    ZLogger.log(`[SceneManager] Map ${map.id} loaded and rendered`)

    eventBus.emit(ZEngineSignal.MapLoaded, { mapId: map.id, map })
  }

  public async changeScene(mapId: number, x: number, y: number): Promise<void> {
    ZLogger.log(`[SceneManager] Changing Scene to Map ${mapId} @ ${x},${y}`)

    const transitionSystem = this.services.get(TransitionSystem)

    // 1. Fade Out
    await transitionSystem?.fadeOut(300)

    // 2. Request Map Change via Callback (Vue Store integration)
    // The Store/Parent will call loadMap() eventually
    if (this.onMapChangeRequest) {
      await this.onMapChangeRequest(mapId, x, y)
    } else {
      ZLogger.warn('[SceneManager] onMapChangeRequest not set, transfer may fail or be incomplete')
      // Fallback: direct load if no store sync (e.g. testing)
      // await this.loadMap(mapId)
      // playerSystem?.teleport(x, y)
    }

    // 3. Fade In
    await transitionSystem?.fadeIn(300)
  }
}
