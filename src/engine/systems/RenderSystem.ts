import PIXI from '@engine/utils/pixi'
import { AutotileSolver } from '@engine/utils/AutotileSolver'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import { type ZMap, type ZEventGraphic, type TileSelection, ZLayer } from '@engine/types'
import { TextureManager } from '@engine/managers/TextureManager'
import { MapManager } from '@engine/managers/MapManager'
import { TilesetManager } from '@engine/managers/TilesetManager'

/**
 * Handles the rendering of the static Tilemap (Ground, Walls, Decorations).
 * Refactored for Manual Dependency Injection.
 */
export class RenderSystem {
  // Dependencies
  private wrapper: PIXI.Container
  private textures: TextureManager
  private mapManager: MapManager
  private tilesetManager: TilesetManager
  public tileSize: number

  // Internal State
  private layers: Record<ZLayer, PIXI.Container>
  private eventMarkersLayer: PIXI.Container // Dedicated layer for editor event markers
  private tileContainers: Record<ZLayer, PIXI.Container[][][]>

  private fullRenderDirty: boolean = false
  private tileUpdates: { x: number; y: number; layer: ZLayer; tiles: TileSelection[] }[] = []

  // Editor specific state (Player Start Marker)
  private playerStartMarker: PIXI.Container | null = null
  private showPlayerStart: boolean = false
  private playerStartX: number = 0
  private playerStartY: number = 0
  private playerStartGraphic: string = ''
  private playerStartCharX: number = 0
  private playerStartCharY: number = 0
  private playerStartSrcX?: number
  private playerStartSrcY?: number
  private playerStartSrcW?: number
  private playerStartSrcH?: number

  private eventMarkers: PIXI.Container[] = []
  private showEventMarkers: boolean = false

  constructor(
    stage: PIXI.Container,
    textures: TextureManager,
    mapManager: MapManager,
    tilesetManager: TilesetManager,
    tileSize: number
  ) {
    this.wrapper = stage
    this.textures = textures
    this.mapManager = mapManager
    this.tilesetManager = tilesetManager
    this.tileSize = tileSize

    // Initialize layers immediately
    this.layers = {
      [ZLayer.ground]: new PIXI.Container({ label: 'GroundLayer' }),
      [ZLayer.walls]: new PIXI.Container({ label: 'WallsLayer' }),
      [ZLayer.decoration]: new PIXI.Container({ label: 'DecorationLayer' }),
      [ZLayer.highest]: new PIXI.Container({ label: 'HighestLayer' })
    }
    this.eventMarkersLayer = new PIXI.Container({ label: 'EventMarkersLayer' })
    this.tileContainers = this.createEmptyContainerStructure(0, 0)

    this.initLayers()
  }

  private initLayers(): void {
    // Z-Index Strategy:
    // Ground: 0
    // Decoration: 200
    // Events: 300 (Handled by EntityRenderSystem usually, but markers are here)
    // Highest: 500

    this.layers[ZLayer.ground].zIndex = 0
    this.layers[ZLayer.walls].zIndex = 100
    this.layers[ZLayer.decoration].zIndex = 200
    this.layers[ZLayer.highest].zIndex = 500
    this.eventMarkersLayer.zIndex = 1000 // Always on top in editor

    // Enable Y-sorting / Priority sorting
    this.layers[ZLayer.walls].sortableChildren = true
    this.layers[ZLayer.decoration].sortableChildren = true
    this.eventMarkersLayer.sortableChildren = true
    this.layers[ZLayer.highest].sortableChildren = true
  }

  public getLayerContainer(layer: ZLayer): PIXI.Container {
    return this.layers[layer]
  }

  public getEventMarkersContainer(): PIXI.Container {
    return this.eventMarkersLayer
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
      // Remove from parent (wrapper/stage) if attached
      if (layer.parent === this.wrapper) {
        this.wrapper.removeChild(layer)
      }
      layer.destroy({ children: true })
    })

    if (this.eventMarkersLayer.parent === this.wrapper) {
      this.wrapper.removeChild(this.eventMarkersLayer)
    }
    this.eventMarkersLayer.destroy({ children: true })
  }

  public requestTileUpdate(x: number, y: number, tiles: TileSelection[], layer: ZLayer): void {
    if (!this.mapManager.currentMap) return
    this.tileUpdates.push({ x, y, layer, tiles })
  }

  public setMap(mapData: ZMap): void {
    this.mapManager.setMap(mapData)
    this.fullRenderDirty = true
    this.tileUpdates = []
    this.showPlayerStart = false // Hide marker on map change until explicitly updated
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

    // 2. Iterate each tile in the stack individually
    tiles.forEach((selection, index) => {
      if (!selection || !selection.tilesetId) return

      const tex = this.textures.get(selection.tilesetId)
      if (!tex) return

      // --- Determine Priority & Offset for THIS tile ---
      const tilesetUrl = mapData.tilesetConfig?.[selection.tilesetId] || selection.tilesetId
      const config = this.tilesetManager.getTileConfig(tilesetUrl, selection.x, selection.y)

      const isHighPriority = config?.isHighPriority || false
      const ySortOffset = config?.sortYOffset ? Number(config.sortYOffset) : 0

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
      if (!this.tileContainers[layer]) {
        return
      }
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

    const layersOrder: ZLayer[] = [ZLayer.ground, ZLayer.walls, ZLayer.decoration, ZLayer.highest]

    layersOrder.forEach((layer) => {
      const grid = mapData.layers[layer].data
      for (let y = 0; y < mapData.height; y++) {
        if (!grid[y]) continue

        for (let x = 0; x < mapData.width; x++) {
          const stack = grid[y][x]
          if (stack && stack.length > 0) {
            this.performDrawTile(x, y, stack, layer, mapData)
          }
        }
      }
    })

    this.drawPlayerStartMarker()
  }

  // --- Editor Visuals: Event Markers & Player Start ---

  public setEventMarkersVisible(visible: boolean): void {
    this.showEventMarkers = visible
    this.eventMarkers.forEach((c) => (c.visible = visible))
    if (this.playerStartMarker) {
      this.playerStartMarker.visible = visible && this.showPlayerStart
    }
  }

  public setPlayerStartMarker(
    x: number,
    y: number,
    graphicPath: string,
    charX: number = 0,
    charY: number = 0,
    srcX?: number,
    srcY?: number,
    srcW?: number,
    srcH?: number
  ): void {
    this.playerStartX = x
    this.playerStartY = y
    this.playerStartGraphic = graphicPath
    this.playerStartCharX = charX
    this.playerStartCharY = charY
    this.playerStartSrcX = srcX
    this.playerStartSrcY = srcY
    this.playerStartSrcW = srcW
    this.playerStartSrcH = srcH
    this.showPlayerStart = true
    this.drawPlayerStartMarker()
  }

  private drawPlayerStartMarker(): void {
    if (!this.showPlayerStart || !this.layers) return

    // Clean up existing
    if (this.playerStartMarker) {
      this.playerStartMarker.destroy({ children: true })
      this.playerStartMarker = null
    }

    const container = new PIXI.Container()
    container.label = 'PlayerStartMarker'
    container.x = this.playerStartX * this.tileSize
    container.y = this.playerStartY * this.tileSize
    container.zIndex = (this.playerStartY + 1) * this.tileSize
    container.visible = this.showEventMarkers

    // Helper to load graphic
    const graphicData: ZEventGraphic = {
      assetId: this.playerStartGraphic,
      group: 'character',
      x: this.playerStartCharX,
      y: this.playerStartCharY,
      srcX: this.playerStartSrcX,
      srcY: this.playerStartSrcY,
      srcW: this.playerStartSrcW,
      srcH: this.playerStartSrcH,
      w: 0,
      h: 0
    }

    // Determine idle frame if it's a character and no explicit pixels provided
    const tex = this.textures.get(this.playerStartGraphic)
    if (tex && !this.playerStartSrcW) {
      const { divW } = SpriteUtils.getFrameRect(graphicData, tex)
      graphicData.x = SpriteUtils.getIdleFrameIndex(divW)
    }

    const sprite = SpriteUtils.createEventSprite(graphicData, this.textures, this.tileSize, true)
    if (sprite) {
      sprite.alpha = 0.5 // Standard ghostly alpha for editor
      container.addChild(sprite)
    }

    // Add Overlay (Green for Player Start)
    const overlay = new PIXI.Graphics()
    overlay.rect(0, 0, this.tileSize, this.tileSize)
    overlay.fill({ color: 0x00ff00, alpha: 0.2 })
    overlay.stroke({ color: 0x00ff00, width: 2 })
    container.addChild(overlay)

    // Add Text Label "START"
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: '#00ff00',
      stroke: { color: '#000000', width: 2 },
      fontWeight: 'bold'
    })
    const text = new PIXI.Text({ text: 'START', style })
    text.anchor.set(0.5, 1)
    text.x = this.tileSize / 2
    text.y = 0
    container.addChild(text)

    this.eventMarkersLayer.addChild(container)
    this.playerStartMarker = container
  }

  public hidePlayerStartMarker(): void {
    this.showPlayerStart = false
    if (this.playerStartMarker) {
      this.playerStartMarker.visible = false
    }
  }

  public updateLayerDimming(activeLayer: ZLayer | null, focusOnly: boolean = false): void {
    const activeContainer = activeLayer ? this.layers[activeLayer] : null
    const activeZ = activeContainer ? activeContainer.zIndex : -1

    if (!activeLayer && !focusOnly) {
      Object.values(this.layers).forEach((c) => (c.alpha = 1))
      this.eventMarkersLayer.alpha = 1
      return
    }

    this.eventMarkersLayer.alpha = 1

    // Loop through all layers
    Object.values(this.layers).forEach((container) => {
      // If exclusive focus is on, DIM EVERYTHING except the active layer
      if (focusOnly) {
        if (activeContainer && container === activeContainer) {
          container.alpha = 1
        } else if (!activeContainer) {
          container.alpha = 1
        } else {
          container.alpha = 0.3
        }
        return
      }

      // Standard Edit Mode: Dim only layers ABOVE the active one
      if (container === activeContainer) {
        container.alpha = 1
      } else if (container.zIndex > activeZ) {
        container.alpha = 0.3
      } else {
        container.alpha = 1
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
    this.eventMarkersLayer.removeChildren()
    this.tileContainers = this.createEmptyContainerStructure(w, h)
  }

  private createEmptyContainerStructure(
    w: number,
    h: number
  ): Record<ZLayer, PIXI.Container[][][]> {
    const create = (): PIXI.Container[][][] =>
      Array.from({ length: h }, () => Array.from({ length: w }, () => []))

    return {
      [ZLayer.ground]: create(),
      [ZLayer.walls]: create(),
      [ZLayer.decoration]: create(),
      [ZLayer.highest]: create()
    } as Record<ZLayer, PIXI.Container[][][]>
  }
}
