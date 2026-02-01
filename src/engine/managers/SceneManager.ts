import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZManager } from '@engine/managers/ZManager'
import { ZEngineSignal, ZMap } from '@engine/types'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { TransitionSystem } from '@engine/systems/TransitionSystem'
import { ErrorSystem } from '@engine/systems/ErrorSystem'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { TextureManager } from '@engine/managers/TextureManager'
import ZLogger from '@engine/core/ZLogger'

export class SceneManager extends ZManager {
  private onMapChangeRequest: ((mapId: number, x: number, y: number) => Promise<void>) | null = null
  public isLoading: boolean = false
  public currentMap: ZMap | null = null

  constructor(services: ServiceLocator) {
    super(services)
  }

  public setMapChangeCallback(
    callback: (mapId: number, x: number, y: number) => Promise<void>
  ): void {
    this.onMapChangeRequest = callback
  }

  public async loadMap(mapOrId: number | ZMap): Promise<void> {
    try {
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
        throw new Error(`Map with id ${mapOrId} not found.`)
      }

      console.log(`[SceneManager] Loading map: ${map.name} (${map.width}x${map.height})`)

      this.currentMap = map
      this.bus.emit(ZEngineSignal.MapWillLoad, { mapId: map.id, map })

      // Load tileset configs
      const tilesetConfigs = await this.dataProvider?.getTilesetConfigs()
      const tilesetManager = this.services.require(TilesetManager)
      tilesetManager.setConfigs(tilesetConfigs || {})

      // Resolve and Load Textures
      const textureManager = this.services.require(TextureManager)
      const texturePromises = Object.entries(map.tilesetConfig).map(([id, url]) => {
        const resolvedUrl = this.dataProvider?.resolveAssetUrl(url) || url
        return textureManager.loadTileset(id, resolvedUrl)
      })
      await Promise.all(texturePromises)

      // Load map tiles in RenderSystem
      // Load map tiles in RenderSystem
      const renderSystem = this.services.get(RenderSystem)
      if (renderSystem) {
        renderSystem.setMap(map)
      }

      // Load events
      const entityRenderSystem = this.services.get(EntityRenderSystem)
      await entityRenderSystem?.loadEvents()

      this.bus.emit(ZEngineSignal.MapLoaded, { mapId: map.id, map })
      console.log(`[SceneManager] Map loaded successfully: ${map.name}`)
    } catch (e) {
      console.error('[SceneManager] Map Load Error:', e)
      this.services.get(ErrorSystem)?.show(e as Error)
    } finally {
      this.isLoading = false
    }
  }

  public async changeScene(mapId: number, x: number, y: number): Promise<void> {
    ZLogger.log(`[SceneManager] Changing Scene to Map ${mapId} @ ${x},${y}`)

    const transitionSystem = this.services.get(TransitionSystem)

    await transitionSystem?.fadeOut(300)

    if (this.onMapChangeRequest) {
      await this.onMapChangeRequest(mapId, x, y)
    } else {
      ZLogger.warn('[SceneManager] onMapChangeRequest not set, transfer may fail or be incomplete')
    }

    await transitionSystem?.fadeIn(300)
  }
}
