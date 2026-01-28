import PIXI from '../utils/pixi'
import { TextureManager } from '../managers/TextureManager'
import { AutotileSolver } from '@engine/utils/AutotileSolver'
import { ZSystem, type ZMap, type TileSelection, ZLayer } from '@engine/types'
import { MapManager } from '@engine/managers/MapManager'

export class RenderSystem extends ZSystem {
  private layers: Record<ZLayer, PIXI.Container>
  private tileContainers: Record<ZLayer, (PIXI.Container | null)[][]>

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
    this.clearTileAt(x, y, layer)

    if (!tiles || tiles.length === 0) return

    const cellContainer = new PIXI.Container({ label: `Cell_${x}_${y}` })
    cellContainer.x = x * this.tileSize
    cellContainer.y = y * this.tileSize

    // For Trees layer, use Y-sorting
    // Sort by the BOTTOM of the tile to match Player's anchor
    // Player Z is usually (y + 1) * tileSize (feet position).
    // We want trees to sort relative to that.
    // If we use (y + 1), it matches player.
    // If we use (y + 3), trees are always "in front" (foreground).
    if (layer === ZLayer.trees) {
      cellContainer.zIndex = (y + 1) * this.tileSize
    }

    // Check High Priority (Star)
    let isHighPriority = false
    const configs = this.mapManager.getTilesetConfigs()

    if (configs) {
      tiles.forEach((t) => {
        const key = `${t.x}_${t.y}`
        if (configs[t.tilesetId]?.[key]?.isHighPriority) {
          isHighPriority = true
        }
      })
    }

    if (isHighPriority) {
      // Force sort above player by moving to Roofs layer (Index 500)
      cellContainer.zIndex = (y + 10) * this.tileSize

      this.layers[ZLayer.roofs].addChild(cellContainer)
      // Store in simple array structure corresponding to LOGICAL layer
      this.tileContainers[layer][y][x] = cellContainer
    } else {
      this.layers[layer].addChild(cellContainer)
      this.tileContainers[layer][y][x] = cellContainer
    }

    // Render Tiles inside cell
    tiles.forEach((selection) => {
      const tex = this.textureManager.get(selection.tilesetId)
      if (!tex) return

      const wrapper = new PIXI.Container()

      if (selection.isAutotile) {
        this.renderAutotile(x, y, selection, layer, wrapper, tex, mapData)
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
      cellContainer.addChild(wrapper)
    })
  }

  public clearTileAt(x: number, y: number, layer: ZLayer): void {
    if (!this.tileContainers[layer] || !this.tileContainers[layer][y]) return

    const existing = this.tileContainers[layer][y][x]
    if (existing) {
      // IMPORTANT: Use parent.removeChild because the tile might have been moved
      // to a different visual layer (e.g. Roofs) than 'layer' implies.
      existing.parent?.removeChild(existing)
      existing.destroy({ children: true })
      this.tileContainers[layer][y][x] = null
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
    mapData: ZMap
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
          mapData.height
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
  ): Record<ZLayer, (PIXI.Container | null)[][]> {
    const create = (): (PIXI.Container | null)[][] =>
      Array.from({ length: h }, () => Array(w).fill(null))
    return {
      [ZLayer.ground]: create(),
      [ZLayer.walls]: create(),
      [ZLayer.decoration]: create(),
      [ZLayer.trees]: create(),
      [ZLayer.events]: create(),
      [ZLayer.roofs]: create()
    } as Record<ZLayer, (PIXI.Container | null)[][]>
  }
}
