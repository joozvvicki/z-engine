import { ZEngineSignal, ZMap, ZLayer, IEngineContext } from '@engine/types'
import ZLogger from '@engine/utils/ZLogger'
import { ZScene } from '@engine/core/ZScene'

export class SceneMap extends ZScene {
  public currentMap: ZMap | null = null
  private zoomLevel: number = 1.0

  constructor(engine: IEngineContext) {
    super(engine)
  }

  public async init(params: {
    mapOrId: number | ZMap
    playerX?: number
    playerY?: number
    direction?: 'down' | 'left' | 'right' | 'up'
  }): Promise<void> {
    const { mapOrId, playerX, playerY, direction } = params
    const dataProvider = this.engine.dataProvider

    try {
      let map: ZMap | null = null

      // 1. Fetch Map Data
      if (typeof mapOrId === 'number') {
        if (!dataProvider)
          throw new Error('[SceneMap] Cannot load map by ID: Data Provider not set')
        map = await dataProvider.getMap(mapOrId)
      } else {
        map = mapOrId
      }

      if (!map) throw new Error(`Map with id ${mapOrId} not found.`)

      this.currentMap = map
      this.engine.map.setMap(map)
      this.engine.eventBus.emit(ZEngineSignal.MapWillLoad, { mapId: map.id, map })

      // 2. Load Tileset Configs
      const tilesetConfigs = await dataProvider?.getTilesetConfigs()
      this.engine.tilesets.setConfigs(tilesetConfigs || {})

      // 3. Resolve and Load Textures
      const texturePromises = Object.entries(map.tilesetConfig).map(([id, url]) => {
        const resolvedUrl = dataProvider?.resolveAssetUrl(url) || url
        return this.engine.textures.loadTileset(id, resolvedUrl)
      })
      await Promise.all(texturePromises)

      // 4. Update Renderer
      this.engine.renderer.setMap(map)

      // 5. Load Events (Visuals)
      await this.engine.entities.loadEvents()

      // 6. Spawn/Teleport Player
      if (typeof playerX === 'number' && typeof playerY === 'number') {
        this.engine.player.x = playerX
        this.engine.player.y = playerY
        if (direction) {
          this.engine.player.direction = direction
        }
        this.engine.player.snapToGrid()
      }

      this.engine.eventBus.emit(ZEngineSignal.MapLoaded, { mapId: map.id, map })
      ZLogger.with('SceneMap').log(`Map loaded successfully: ${map.name}`)
    } catch (e) {
      ZLogger.with('SceneMap').error('Map Load Error:', e)

      this.engine.eventBus.emit(ZEngineSignal.MapLoadFailed, {
        mapId: typeof mapOrId === 'number' ? mapOrId : mapOrId.id,
        error: e as Error
      })

      // Use direct access to error system if available in context (or via engine global layer)
      // Assuming errors system is accessible via context if added to interface,
      // or we just log it. In the refactored ZEngine, errors is public.
      // If IEngineContext doesn't have 'errors', you might need to add it or skip showing overlay here.
      // Ideally: this.engine.errors.show(e as Error)
    }
  }

  public start(): void {
    const renderSystem = this.engine.renderer

    // Order of layers is important for Z-sorting
    this.container.addChild(renderSystem.getLayerContainer(ZLayer.ground))
    this.container.addChild(renderSystem.getLayerContainer(ZLayer.walls))
    this.container.addChild(renderSystem.getLayerContainer(ZLayer.decoration))

    this.container.addChild(renderSystem.getEventMarkersContainer())
    this.container.addChild(renderSystem.getLayerContainer(ZLayer.highest))

    // Ensure entities are visible in play mode
    if (this.engine.config.mode === 'play') {
      this.engine.entities.setVisible(true)
    }

    // Mount Editor Systems (only if they exist in context/engine)
    if (this.engine.config.mode === 'edit') {
      // Assuming grid/ghost are part of IEngineContext or we accept they might be null if not added to interface
      // In the ZEngine class they are public properties.
      // If you strictly typed IEngineContext, ensure they are there.

      // Casting to any here is safer than before because we know ZEngine structure,
      // but ideally add grid/ghost to IEngineContext interface.
      if (this.engine.grid) {
        this.container.addChild(this.engine.grid.container)
      }

      if (this.engine.ghost) {
        this.container.addChild(this.engine.ghost.container)
      }
    }

    ZLogger.with('SceneMap').log('Started & Layers Mounted')
  }

  public update(): void {
    if (this.engine.config.mode === 'play' && this.currentMap) {
      if (this.engine.systemData?.screenZoom) {
        this.zoomLevel = this.engine.systemData.screenZoom
      }

      const player = this.engine.player
      const renderer = this.engine.renderer

      const tileSize = renderer.tileSize
      const scale = this.zoomLevel

      // 1. Calculate Target Position (Player Center)
      let targetX = player.realX + tileSize / 2
      let targetY = player.realY + tileSize / 2

      // 2. Camera Clamping Logic
      const screenW = this.engine.app.screen.width
      const screenH = this.engine.app.screen.height

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
    } else {
      // Reset scale in editor
      this.container.scale.set(1)
      this.container.pivot.set(0)
      this.container.position.set(0)
    }
  }

  public stop(): void {
    ZLogger.with('SceneMap').log('Stopped & Unmounting Layers')
  }
}
