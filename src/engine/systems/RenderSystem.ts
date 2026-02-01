import PIXI from '@engine/utils/pixi'
import { AutotileSolver } from '@engine/utils/AutotileSolver'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import { type ZMap, type ZEventGraphic, type TileSelection, ZLayer } from '@engine/types'
import { ZSystem } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { DEFAULT_PLAYER_GRAPHIC } from '@engine/constants'

export class RenderSystem extends ZSystem {
  private layers: Record<ZLayer, PIXI.Container>
  private eventMarkersLayer: PIXI.Container // Dedicated layer for editor event markers
  private tileContainers: Record<ZLayer, PIXI.Container[][][]>
  public tileSize: number

  private wrapper: PIXI.Container

  private fullRenderDirty: boolean = false
  private tileUpdates: { x: number; y: number; layer: ZLayer; tiles: TileSelection[] }[] = []

  constructor(stage: PIXI.Container, services: ServiceLocator, tileSize: number) {
    super(services)
    this.wrapper = stage

    this.tileSize = tileSize

    this.layers = null!
    this.eventMarkersLayer = null!
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
      [ZLayer.highest]: new PIXI.Container({ label: 'HighestLayer' })
    }
    this.eventMarkersLayer = new PIXI.Container({ label: 'EventMarkersLayer' })

    this.layers[ZLayer.ground].zIndex = 0
    this.layers[ZLayer.walls].zIndex = 100
    this.layers[ZLayer.decoration].zIndex = 200
    this.eventMarkersLayer.zIndex = 300
    this.layers[ZLayer.highest].zIndex = 500

    // Enable Y-sorting / Priority sorting
    this.layers[ZLayer.walls].sortableChildren = true
    this.layers[ZLayer.decoration].sortableChildren = true
    this.eventMarkersLayer.sortableChildren = true
    this.layers[ZLayer.highest].sortableChildren = true

    // Since wrapper (Stage) has sortableChildren=true, zIndex will be respected?
    // Actually, SceneMap will now manage these layers.
    this.tileContainers = this.createEmptyContainerStructure(0, 0)

    // Load Player Texture for Editor Visualization
    // We register it with TextureManager so SpriteUtils can find it.
    // Load Player Texture for Editor Visualization
    // We register it with TextureManager so SpriteUtils can find it.
    // TODO: This should be data-driven via TextureManager or Engine Config
    /*
    import('@ui/assets/img/characters/character.png').then((mod) => {
      // mod.default is the URL
      this.textures.loadTileset('@ui/assets/img/characters/character.png', mod.default).then(() => {
        this.fullRenderDirty = true
      })
    })
    */
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
    if (this.fullRenderDirty && this.map.currentMap) {
      this.performFullRender(this.map.currentMap)
      this.fullRenderDirty = false
    }

    if (this.tileUpdates.length > 0) {
      const batch = this.tileUpdates.splice(0, this.tileUpdates.length)
      batch.forEach((update) => {
        this.performDrawTile(update.x, update.y, update.tiles, update.layer, this.map.currentMap!)
      })
    }
  }

  public onDestroy(): void {
    Object.values(this.layers).forEach((layer) => {
      this.wrapper.removeChild(layer)
      layer.destroy({ children: true })
    })
    this.wrapper.removeChild(this.eventMarkersLayer)
    this.eventMarkersLayer.destroy({ children: true })
  }

  public requestTileUpdate(x: number, y: number, tiles: TileSelection[], layer: ZLayer): void {
    if (!this.map.currentMap) return
    this.tileUpdates.push({ x, y, layer, tiles })
  }

  public setMap(mapData: ZMap): void {
    this.map.setMap(mapData)
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

    // 2. Iterate each tile in the stack individually
    tiles.forEach((selection, index) => {
      if (!selection || !selection.tilesetId) return

      const tex = this.textures.get(selection.tilesetId)
      if (!tex) return

      // --- Determine Priority & Offset for THIS tile ---
      const tilesetUrl = mapData.tilesetConfig?.[selection.tilesetId] || selection.tilesetId
      const config = this.tilesets.getTileConfig(tilesetUrl, selection.x, selection.y)

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
        console.warn(`[RenderSystem] Layer ${layer} not initialized in tileContainers`)
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
        // Safety check for invalid map data
        if (!grid[y]) continue

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

    // Ensure startups are restored (they are cleared by resetLayers)
    this.drawPlayerStartMarker()
  }

  private eventMarkers: PIXI.Container[] = []
  private showEventMarkers: boolean = false

  private playerStartMarker: PIXI.Container | null = null
  private showPlayerStart: boolean = false
  private playerStartX: number = 0
  private playerStartY: number = 0
  private playerStartGraphic: string = ''

  public setEventMarkersVisible(visible: boolean): void {
    this.showEventMarkers = visible
    this.eventMarkers.forEach((c) => (c.visible = visible))
    if (this.playerStartMarker) {
      this.playerStartMarker.visible = visible && this.showPlayerStart
    }
  }

  public setPlayerStartMarker(x: number, y: number, graphicPath: string): void {
    this.playerStartX = x
    this.playerStartY = y
    this.playerStartGraphic = graphicPath
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
      x: 0,
      y: 0,
      w: 3,
      h: 4
    }

    const sprite = SpriteUtils.createEventSprite(graphicData, this.textures, this.tileSize, true)
    if (sprite) {
      sprite.alpha = 0.7 // Ghost effect
      container.addChild(sprite)
    }

    // Add Overlay (Distinct from normal events - maybe Green?)
    const overlay = new PIXI.Graphics()
    overlay.rect(0, 0, this.tileSize, this.tileSize)
    overlay.fill({ color: 0x00ff00, alpha: 0.2 }) // Green tint for Player Start
    overlay.stroke({ color: 0x00ff00, width: 2 })
    container.addChild(overlay)

    // Add Text Label "START"
    const style = new PIXI.TextStyle({
      fontFamily: 'Arial',
      fontSize: 10,
      fill: '#00ff00',
      stroke: { color: '#000000', width: 2 }, // Fixed V8 syntax
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

    this.eventMarkersLayer.alpha = 1 // Events markers usually stays visible

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

      // 2. Determine Graphic
      const activePage = event.pages[0] // Default to first page for now until Interpreter

      // Helper to construct a ZEventGraphic-like object for PlayerStart/Asset
      let graphicData: ZEventGraphic | null = null

      if (event.name === 'PlayerStart') {
        graphicData = DEFAULT_PLAYER_GRAPHIC
      } else if (activePage && activePage.graphic) {
        graphicData = activePage.graphic
      }

      if (graphicData) {
        // Ensure TextureManager has this loaded?
        // RenderSystem.onBoot preloads '@ui/assets/img/characters/character.png' manually,
        // but TextureManager needs to know it by that KEY.

        graphicSprite = SpriteUtils.createEventSprite(
          graphicData,
          this.textures,
          this.tileSize,
          true
        )
      }

      // 3. Add Graphic (Bottom Layer)
      if (graphicSprite) {
        container.addChild(graphicSprite)
      }

      // 3. Add Event Box Overlay (Semi-transparent Black + Border)
      const overlay = new PIXI.Graphics()
      overlay.rect(0, 0, this.tileSize, this.tileSize)
      overlay.fill({ color: 0x000000, alpha: 0.5 })
      overlay.stroke({ color: 0x000000, width: 2 })
      container.addChild(overlay)

      this.eventMarkersLayer.addChild(container)
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
