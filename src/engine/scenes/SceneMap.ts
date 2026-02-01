import { ZEngineSignal, ZMap, ZLayer } from '@engine/types'
import ZLogger from '@engine/utils/ZLogger'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZScene } from '@engine/core/ZScene'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { TextureManager } from '@engine/managers/TextureManager'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { ErrorSystem } from '@engine/systems/ErrorSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { GridSystem } from '@engine/systems/GridSystem'
import { GhostSystem } from '@engine/systems/GhostSystem'

export class SceneMap extends ZScene {
  public currentMap: ZMap | null = null

  constructor(services: ServiceLocator) {
    super(services)
  }

  public async init(params: {
    mapOrId: number | ZMap
    playerX?: number
    playerY?: number
  }): Promise<void> {
    const { mapOrId, playerX, playerY } = params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = this.services.get('ZEngine') as any
    const dataProvider = engine?.dataProvider
    // Note: We need a better way to get dataProvider than casting ZEngine
    // But for now we'll match existing patterns or rely on SceneManager setup.

    try {
      let map: ZMap | null = null
      if (typeof mapOrId === 'number') {
        if (!dataProvider)
          throw new Error('[SceneMap] Cannot load map by ID: Data Provider not set')
        map = await dataProvider.getMap(mapOrId)
      } else {
        map = mapOrId
      }

      if (!map) throw new Error(`Map with id ${mapOrId} not found.`)

      this.currentMap = map
      this.bus.emit(ZEngineSignal.MapWillLoad, { mapId: map.id, map })

      // Load tileset configs
      const tilesetConfigs = await dataProvider?.getTilesetConfigs()
      const tilesetManager = this.services.require(TilesetManager)
      tilesetManager.setConfigs(tilesetConfigs || {})

      // Resolve and Load Textures
      const textureManager = this.services.require(TextureManager)
      const texturePromises = Object.entries(map.tilesetConfig).map(([id, url]) => {
        const resolvedUrl = dataProvider?.resolveAssetUrl(url) || url
        return textureManager.loadTileset(id, resolvedUrl)
      })
      await Promise.all(texturePromises)

      // Load map tiles in RenderSystem
      const renderSystem = this.services.get(RenderSystem)
      if (renderSystem) {
        renderSystem.setMap(map)
      }

      // Load events
      const entityRenderSystem = this.services.get(EntityRenderSystem)
      await entityRenderSystem?.loadEvents()

      // Handle Player Spawn
      if (typeof playerX === 'number' && typeof playerY === 'number') {
        const playerSystem = this.services.get(PlayerSystem)
        if (playerSystem) {
          playerSystem.x = playerX
          playerSystem.y = playerY
          playerSystem.snapToGrid()
        }
      }

      this.bus.emit(ZEngineSignal.MapLoaded, { mapId: map.id, map })
      ZLogger.with('SceneMap').log(`Map loaded successfully: ${map.name}`)
    } catch (e) {
      ZLogger.with('SceneMap').error('Map Load Error:', e)
      this.bus.emit(ZEngineSignal.MapLoadFailed, {
        mapId: typeof mapOrId === 'number' ? mapOrId : mapOrId.id,
        error: e as Error
      })
      this.services.get(ErrorSystem)?.show(e as Error)
    }
  }

  public start(): void {
    const renderSystem = this.services.require(RenderSystem)

    // Order of layers is important for Z-sorting
    this.container.addChild(renderSystem.getLayerContainer(ZLayer.ground))
    this.container.addChild(renderSystem.getLayerContainer(ZLayer.walls))
    this.container.addChild(renderSystem.getLayerContainer(ZLayer.decoration))

    this.container.addChild(renderSystem.getLayerContainer(ZLayer.events))
    this.container.addChild(renderSystem.getLayerContainer(ZLayer.highest))

    // Ensure entities are visible in play mode
    if (this.mode === 'play') {
      this.services.get(EntityRenderSystem)?.setVisible(true)
    }

    // Mount Editor Grid (if exists and in edit mode)
    if (this.mode === 'edit') {
      const grid = this.services.get(GridSystem)
      if (grid) {
        this.container.addChild(grid.container)
      }

      // Mount Editor Ghost (if exists and in edit mode)
      const ghost = this.services.get(GhostSystem)
      if (ghost) {
        this.container.addChild(ghost.container)
      }
    }

    ZLogger.with('SceneMap').log('Started & Layers Mounted')
  }

  private zoomLevel: number = 1.0

  public update(): void {
    if (this.mode === 'play' && this.currentMap) {
      const playerSystem = this.services.get(PlayerSystem)
      const renderSystem = this.services.get(RenderSystem)
      if (playerSystem && renderSystem) {
        const tileSize = renderSystem.tileSize
        const scale = this.zoomLevel

        // 1. Calculate Target Position (Player Center)
        let targetX = playerSystem.realX + tileSize / 2
        let targetY = playerSystem.realY + tileSize / 2

        // 2. Camera Clamping Logic
        // We need to account for SCALE. If scale is 2.0, we see HALF the pixels.
        const screenW = this.app.screen.width
        const screenH = this.app.screen.height

        // Effective screen size in world (map) coordinates
        const viewW = screenW / scale
        const viewH = screenH / scale

        const mapW = this.currentMap.width * tileSize
        const mapH = this.currentMap.height * tileSize

        // Only clamp if map is larger than effectively visible view
        if (mapW > viewW) {
          targetX = Math.max(viewW / 2, Math.min(targetX, mapW - viewW / 2))
        } else {
          targetX = mapW / 2
        }

        if (mapH > viewH) {
          targetY = Math.max(viewH / 2, Math.min(targetY, mapH - viewH / 2))
        } else {
          targetY = mapH / 2
        }

        // 3. Apply Camera Transform
        this.container.scale.set(scale)
        this.container.pivot.x = targetX
        this.container.pivot.y = targetY
        this.container.x = screenW / 2
        this.container.y = screenH / 2
      }
    } else {
      // Reset scale in editor if needed (though SceneManager usually clears it)
      this.container.scale.set(1)
    }
  }

  public stop(): void {
    ZLogger.with('SceneMap').log('Stopped & Unmounting Layers')
    // Detach system containers so they aren't destroyed when the scene container is destroyed
    this.container.removeChildren()
  }
}
