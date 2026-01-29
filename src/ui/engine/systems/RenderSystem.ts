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
    // Decoration: 200
    // Events: 300
    // Highest: 500

    this.layers = {
      [ZLayer.ground]: new PIXI.Container({ label: 'GroundLayer' }),
      [ZLayer.walls]: new PIXI.Container({ label: 'WallsLayer' }),
      [ZLayer.decoration]: new PIXI.Container({ label: 'DecorationLayer' }),
      [ZLayer.events]: new PIXI.Container({ label: 'EventsLayer' }),
      [ZLayer.highest]: new PIXI.Container({ label: 'HighestLayer' })
    }

    this.layers[ZLayer.ground].zIndex = 0
    this.layers[ZLayer.walls].zIndex = 100
    this.layers[ZLayer.decoration].zIndex = 200
    this.layers[ZLayer.events].zIndex = 300
    this.layers[ZLayer.highest].zIndex = 500

    // Enable Y-sorting / Priority sorting
    this.layers[ZLayer.walls].sortableChildren = true
    this.layers[ZLayer.decoration].sortableChildren = true
    this.layers[ZLayer.events].sortableChildren = true
    this.layers[ZLayer.highest].sortableChildren = true

    const sortedLayers = Object.values(this.layers)
    this.wrapper.addChild(...sortedLayers)
    // Since wrapper (Stage) has sortableChildren=true, zIndex will be respected.
    this.wrapper.sortableChildren = true

    this.tileContainers = this.createEmptyContainerStructure(0, 0)

    // Load Player Texture for Editor Visualization
    import('@ui/assets/img/characters/character.png').then((mod) => {
      PIXI.Assets.load(mod.default).then((tex) => {
        this.playerTexture = tex
        // Trigger refresh once loaded
        this.fullRenderDirty = true
      })
    })
  }

  private playerTexture: PIXI.Texture | null = null

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
      let baseZ = (y + 1) * this.tileSize

      // If this tile is manually placed on the Highest layer, we want it to ALWAYS be above
      // "Star" tiles that are promoted from lower layers (like Tree Tops).
      // We give it a massive boost to separate it into a "Roof/Flying" plane.
      if (layer === ZLayer.highest) {
        baseZ += 100000
      }

      if (!isHighPriority) {
        // Normal Layer (Ground, Walls, Decoration)
        // If sorting is enabled on this layer (Decoration, Walls, Highest), respect Y + Offset
        if (layer === ZLayer.decoration || layer === ZLayer.walls || layer === ZLayer.highest) {
          cellContainer.zIndex = baseZ + ySortOffset
        }

        // Add to Layer
        this.layers[layer].addChild(cellContainer)
      } else {
        // High Priority (Highest)
        // Move to Top Layer
        // We use Highest layer for Star tiles from any layer (usually Decoration).
        // Sorting: Maintain Y-sort logic.
        cellContainer.zIndex = baseZ + ySortOffset
        this.layers[ZLayer.highest].addChild(cellContainer)
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
      ZLayer.events,
      ZLayer.highest
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

    // Render Object Events
    this.renderEvents(mapData)
  }

  private eventMarkers: PIXI.Container[] = []
  private showEventMarkers: boolean = false

  public setEventMarkersVisible(visible: boolean): void {
    this.showEventMarkers = visible
    this.eventMarkers.forEach((c) => (c.visible = visible))
  }

  public updateLayerDimming(activeLayer: ZLayer | null, focusOnly: boolean = false): void {
    // If no active layer (or Play Mode), reset all to alpha 1
    if (!activeLayer) {
      Object.values(this.layers).forEach((c) => (c.alpha = 1))
      return
    }

    const activeContainer = this.layers[activeLayer]
    if (!activeContainer) return

    const activeZ = activeContainer.zIndex

    // Loop through all layers
    Object.values(this.layers).forEach((container) => {
      // If exclusive focus is on, DIM EVERYTHING except the active layer
      if (focusOnly) {
        if (container === activeContainer) {
          container.alpha = 1
        } else {
          container.alpha = 0.3 // Dim everything else
        }
        return
      }

      // Standard Edit Mode: Dim only layers ABOVE the active one
      if (container === activeContainer) {
        container.alpha = 1
      } else if (container.zIndex > activeZ) {
        // Higher layer -> DIM IT (so we can see the active layer)
        container.alpha = 0.3
      } else {
        // Lower layer -> Keep visible (context)
        container.alpha = 1
      }
    })
  }

  private renderEvents(mapData: ZMap): void {
    this.eventMarkers = [] // Reset list (containers cleared by resetLayers? No, renderEvents runs after resetLayers usually, wait)
    // resetLayers clears children of layers. So old markers are gone from PIXI.
    // We just need to clear our reference list.

    if (!mapData.events) return

    mapData.events.forEach((event) => {
      // Container for the event
      const container = new PIXI.Container()
      container.label = 'EditorEventMarker' // Tag it
      container.x = event.x * this.tileSize
      container.y = event.y * this.tileSize
      container.zIndex = (event.y + 1) * this.tileSize
      container.visible = this.showEventMarkers // Apply Saved Visibility State!

      let graphicSprite: PIXI.Sprite | null = null

      // 1. Determine Graphic
      if (event.name === 'PlayerStart' || event.graphic) {
        if (event.name === 'PlayerStart' && this.playerTexture) {
          // Player Sprite (Down Idle = 0,0?)
          // Assuming 4x4 layout, 0,0 is Down-Standing.
          // Frame size = W/4, H/4
          const fw = this.playerTexture.width / 4
          const fh = this.playerTexture.height / 4

          graphicSprite = new PIXI.Sprite(
            new PIXI.Texture({
              source: this.playerTexture.source,
              frame: new PIXI.Rectangle(0, 0, fw, fh)
            })
          )
          // Scale to fit within tileSize x tileSize
          // Use smaller scale to ensure it fits inside the box completely
          const maxDim = Math.max(fw, fh)
          const scale = (this.tileSize / maxDim) * 0.8

          graphicSprite.scale.set(scale)
          graphicSprite.anchor.set(0.5, 0.5)
          graphicSprite.x = this.tileSize / 2
          graphicSprite.y = this.tileSize / 2
        } else if (event.graphic) {
          const tex = this.textureManager.get(event.graphic.tilesetId)
          if (tex) {
            graphicSprite = new PIXI.Sprite(
              new PIXI.Texture({
                source: tex.source,
                frame: new PIXI.Rectangle(
                  event.graphic.x * this.tileSize,
                  event.graphic.y * this.tileSize,
                  event.graphic.w * this.tileSize,
                  event.graphic.h * this.tileSize
                )
              })
            )
          }
        }
      }

      // 2. Add Graphic (Bottom Layer)
      if (graphicSprite) {
        container.addChild(graphicSprite)
      }

      // 3. Add Event Box Overlay (Semi-transparent Black + Border)
      const overlay = new PIXI.Graphics()
      overlay.rect(0, 0, this.tileSize, this.tileSize)
      overlay.fill({ color: 0x000000, alpha: 0.5 })
      overlay.stroke({ color: 0x000000, width: 2 })
      container.addChild(overlay)

      this.layers[ZLayer.events].addChild(container)
      this.eventMarkers.push(container)
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
      [ZLayer.events]: create(),
      [ZLayer.highest]: create()
    } as Record<ZLayer, PIXI.Container[][][]>
  }
}
