import PIXI from '../utils/pixi'
import { TextureManager } from '../managers/TextureManager'
import { AutotileSolver } from '@engine/utils/AutotileSolver'
import { ZSystem, type ZMap, type TileSelection, ZLayer } from '@engine/types'
import { MapManager } from '@engine/managers/MapManager'

export class RenderSystem extends ZSystem {
  private layers: Record<ZLayer, PIXI.Container>
  private tileContainers: Record<ZLayer, PIXI.Container[][][]>

  private textureManager: TextureManager
  private tileSize: number

  private wrapper: PIXI.Container
  private mapManager: MapManager

  private fullRenderDirty: boolean = false
  private tileUpdates: { x: number; y: number; layer: ZLayer; tiles: TileSelection[] }[] = []

  constructor(
    stage: PIXI.Container,
    textureManager: TextureManager,
    mapManager: MapManager,
    tileSize: number
  ) {
    super()
    this.wrapper = stage

    this.textureManager = textureManager
    this.mapManager = mapManager
    this.tileSize = tileSize

    this.layers = null!
    this.tileContainers = null!
  }

  public onBoot(): void {
    // We attach layers directly to wrapper (Stage) to allow interleaving with Entities (Player)
    // Z-Index Strategy:
    // Ground: 0
    // Walls: 100
    // Decoration: 200
    // Events: 300 (Player will be here, maybe 350)
    // Trees: 400
    // Roofs: 500

    this.layers = {
      [ZLayer.ground]: new PIXI.Container({ label: 'GroundLayer' }),
      [ZLayer.walls]: new PIXI.Container({ label: 'WallsLayer' }),
      [ZLayer.decoration]: new PIXI.Container({ label: 'DecorationLayer' }),
      [ZLayer.trees]: new PIXI.Container({ label: 'TreesLayer' }),
      [ZLayer.events]: new PIXI.Container({ label: 'EventsLayer' }),
      [ZLayer.roofs]: new PIXI.Container({ label: 'RoofsLayer' })
    }

    this.layers[ZLayer.ground].zIndex = 0
    this.layers[ZLayer.walls].zIndex = 100
    this.layers[ZLayer.decoration].zIndex = 200
    this.layers[ZLayer.events].zIndex = 300
    this.layers[ZLayer.trees].zIndex = 400
    this.layers[ZLayer.roofs].zIndex = 500

    // Enable Y-sorting / Priority sorting
    this.layers[ZLayer.trees].sortableChildren = true
    this.layers[ZLayer.decoration].sortableChildren = true // For "Stars"
    this.layers[ZLayer.walls].sortableChildren = true // Maybe?
    this.layers[ZLayer.events].sortableChildren = true // Events are Y-sorted
    this.layers[ZLayer.roofs].sortableChildren = true // Ensure roofs are sortable if we move stuff there

    const sortedLayers = Object.values(this.layers)
    this.wrapper.addChild(...sortedLayers)
    // Since wrapper (Stage) has sortableChildren=true, zIndex will be respected.

    this.tileContainers = this.createEmptyContainerStructure(0, 0)
  }

  public getLayerContainer(layer: ZLayer): PIXI.Container {
    return this.layers[layer]
  }

  public refresh(): void {
    this.fullRenderDirty = true
  }

  public onUpdate(): void {
    if (this.fullRenderDirty && this.mapManager.currentMap) {
      this.performFullRender(this.mapManager.currentMap)
      this.fullRenderDirty = false
    }

    if (this.tileUpdates.length > 0) {
      const batch = this.tileUpdates.splice(0, this.tileUpdates.length)
      batch.forEach((update) => {
        this.performDrawTile(
          update.x,
          update.y,
          update.tiles,
          update.layer,
          this.mapManager.currentMap!
        )
      })
    }
  }

  public onDestroy(): void {
    Object.values(this.layers).forEach((layer) => {
      this.wrapper.removeChild(layer)
      layer.destroy({ children: true })
    })
  }

  public requestTileUpdate(x: number, y: number, tiles: TileSelection[], layer: ZLayer): void {
    if (!this.mapManager.currentMap) return
    this.tileUpdates.push({ x, y, layer, tiles })
  }

  public setMap(mapData: ZMap): void {
    this.mapManager.setMap(mapData)
    this.fullRenderDirty = true
    this.tileUpdates = []
  }

  private performDrawTile(
    x: number,
    y: number,
    tiles: TileSelection[],
    layer: ZLayer,
    mapData: ZMap
  ): void {
    // 1. Clear existing containers for this cell
    this.clearTileAt(x, y, layer)

    if (!tiles || tiles.length === 0) return

    const configs = this.mapManager.getTilesetConfigs()

    // 2. Iterate each tile in the stack individually
    tiles.forEach((selection, index) => {
      const tex = this.textureManager.get(selection.tilesetId)
      if (!tex) return

      // --- Determine Priority & Offset for THIS tile ---
      let isHighPriority = false
      let ySortOffset = 0

      // Look up config
      if (configs) {
        const key = `${selection.x}_${selection.y}`
        const config = configs[selection.tilesetId]?.[key]
        if (config) {
          if (config.isHighPriority) isHighPriority = true
          if (config.sortYOffset) ySortOffset = Number(config.sortYOffset)
        }
      }

      // --- Create Wrapper ---
      const wrapper = new PIXI.Container()

      // Render execution
      if (selection.isAutotile) {
        this.renderAutotile(x, y, selection, layer, wrapper, tex, mapData, index)
      } else {
        const sprite = new PIXI.Sprite(
          new PIXI.Texture({
            source: tex.source,
            frame: new PIXI.Rectangle(
              selection.x * this.tileSize,
              selection.y * this.tileSize,
              selection.w * this.tileSize,
              selection.h * this.tileSize
            )
          })
        )
        wrapper.addChild(sprite)
      }

      // --- Create Host Container Positioned in World ---
      const cellContainer = new PIXI.Container({ label: `Cell_${x}_${y}_Layer${index}` })
      cellContainer.x = x * this.tileSize
      cellContainer.y = y * this.tileSize
      cellContainer.addChild(wrapper)

      // --- Sorting Logic ---

      // Default Base Z (standard sort)
      // For Trees layer, we match Player sorting:
      // Player Z ~= (y + 1) * tileSize + 1 (feet)
      // Tile Base Z ~= (y + 1) * tileSize
      const baseZ = (y + 1) * this.tileSize

      if (!isHighPriority) {
        // Normal Layer (Ground, Walls, Trees, Decoration)
        // If sorting is enabled on this layer (Trees, Decoration), respect Y + Offset
        if (layer === ZLayer.trees || layer === ZLayer.decoration) {
          cellContainer.zIndex = baseZ + ySortOffset
        }

        // Add to Normal Layer
        this.layers[layer].addChild(cellContainer)
      } else {
        // High Priority (Roofs)
        // Move to top layer
        // Apply Y-sort logic but boosted to Roofs space
        // Roofs layer index is 500, but inside it we sort by Y relative to other roof tiles
        // to maintain depth even "above" player.
        // We use same baseZ formula so Roof tiles sort among themselves correctly.
        // We add a huge offset? No, Roofs layer (DisplayObject) is visually above Trees layer.
        // So internal zIndex just needs to be consistent within Roofs.

        // However, if we want to "interleave" very precisely with other High Priority things?
        // Usually fine.

        cellContainer.zIndex = baseZ + ySortOffset
        this.layers[ZLayer.roofs].addChild(cellContainer)
      }

      // Track it
      if (!this.tileContainers[layer][y]) this.tileContainers[layer][y] = []
      if (!this.tileContainers[layer][y][x]) this.tileContainers[layer][y][x] = []

      this.tileContainers[layer][y][x].push(cellContainer)
    })
  }

  public clearTileAt(x: number, y: number, layer: ZLayer): void {
    if (!this.tileContainers[layer] || !this.tileContainers[layer][y]) return

    const containers = this.tileContainers[layer][y][x]
    if (containers && containers.length > 0) {
      containers.forEach((c) => {
        c.parent?.removeChild(c)
        c.destroy({ children: true })
      })
      // Clear array
      this.tileContainers[layer][y][x] = []
    }
  }

  private performFullRender(mapData: ZMap): void {
    this.resetLayers(mapData.width, mapData.height)

    const layersOrder: ZLayer[] = [
      ZLayer.ground,
      ZLayer.walls,
      ZLayer.decoration,
      ZLayer.trees,
      ZLayer.events,
      ZLayer.roofs
    ]

    layersOrder.forEach((layer) => {
      const grid = mapData.layers[layer].data
      for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
          const stack = grid[y][x]
          if (stack && stack.length > 0) {
            this.performDrawTile(x, y, stack, layer, mapData)
          }
        }
      }
    })
  }

  public IsMapLoaded(): boolean {
    return this.tileUpdates.length === 0
  }

  private renderAutotile(
    x: number,
    y: number,
    sel: TileSelection,
    layer: ZLayer,
    parent: PIXI.Container,
    tex: PIXI.Texture,
    mapData: ZMap,
    stackIndex: number
  ): void {
    const isA1 = sel.tilesetId === 'A1'
    let frameCount = 1

    if (isA1) {
      const blockXIndex = Math.floor(sel.x / 2)
      if (blockXIndex !== 3 && blockXIndex !== 7) frameCount = 3
    }

    for (let qy = 0; qy < 2; qy++) {
      for (let qx = 0; qx < 2; qx++) {
        const offset = AutotileSolver.getQuadrantOffset(
          x,
          y,
          qx,
          qy,
          this.tileSize,
          sel,
          layer,
          mapData,
          mapData.width,
          mapData.height,
          stackIndex
        )

        const textures: PIXI.Texture[] = []
        for (let i = 0; i < frameCount; i++) {
          const animOffset = isA1 ? i * (this.tileSize * 2) : 0
          textures.push(
            new PIXI.Texture({
              source: tex.source,
              frame: new PIXI.Rectangle(
                sel.x * this.tileSize + animOffset + offset.x,
                sel.y * this.tileSize + offset.y,
                this.tileSize / 2,
                this.tileSize / 2
              )
            })
          )
        }

        if (textures.length > 1) {
          const anim = new PIXI.AnimatedSprite(textures)
          anim.x = qx * (this.tileSize / 2)
          anim.y = qy * (this.tileSize / 2)
          anim.animationSpeed = 0.025
          anim.play()
          parent.addChild(anim)
        } else {
          const spr = new PIXI.Sprite(textures[0])
          spr.x = qx * (this.tileSize / 2)
          spr.y = qy * (this.tileSize / 2)
          parent.addChild(spr)
        }
      }
    }
  }

  private resetLayers(w: number, h: number): void {
    Object.values(this.layers).forEach((c) => c.removeChildren())
    this.tileContainers = this.createEmptyContainerStructure(w, h)
  }

  private createEmptyContainerStructure(
    w: number,
    h: number
  ): Record<ZLayer, PIXI.Container[][][]> {
    const create = (): PIXI.Container[][][] =>
      Array.from({ length: h }, () => Array.from({ length: w }, () => []))
    // Note: Array(w).fill([]) would share the same empty array reference! Must use Array.from or loop logic.
    // Array.from({length: w}, () => []) creates fresh arrays.

    return {
      [ZLayer.ground]: create(),
      [ZLayer.walls]: create(),
      [ZLayer.decoration]: create(),
      [ZLayer.trees]: create(),
      [ZLayer.events]: create(),
      [ZLayer.roofs]: create()
    } as Record<ZLayer, PIXI.Container[][][]>
  }
}
