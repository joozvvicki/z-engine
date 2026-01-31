import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZManager } from '@engine/managers/ZManager'
import { ZEngineSignal, ZMap } from '@engine/types'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { TransitionSystem } from '@engine/systems/TransitionSystem'
import ZLogger from '@engine/core/ZLogger'

export class SceneManager extends ZManager {
  private onMapChangeRequest: ((mapId: number, x: number, y: number) => Promise<void>) | null = null
  public isLoading: boolean = false

  constructor(services: ServiceLocator) {
    super(services)
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

    const renderSystem = this.services.get(RenderSystem)
    const entityRenderSystem = this.services.get(EntityRenderSystem)

    if (this.dataProvider) {
      const resolvedConfig: Record<string, string> = {}
      const slots = ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'Roofs']
      slots.forEach((slot) => {
        resolvedConfig[slot] = map!.tilesetConfig?.[slot] || this.dataProvider!.getTilesetUrl(slot)
      })
      map.tilesetConfig = resolvedConfig

      const configs = await this.dataProvider.getTilesetConfigs()
      this.tilesets.setConfigs(configs)
    }

    const texturePromises = Object.entries(map.tilesetConfig).map(([id, url]) =>
      this.textures.loadTileset(id, this.dataProvider?.resolveAssetUrl(url) || url)
    )
    await Promise.all(texturePromises)

    this.map.setMap(map)
    renderSystem?.setMap(map)
    await entityRenderSystem?.loadEvents()

    this.isLoading = false
    ZLogger.log(`[SceneManager] Map ${map.id} loaded and rendered`)

    this.bus.emit(ZEngineSignal.MapLoaded, { mapId: map.id, map })
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
