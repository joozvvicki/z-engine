import type { TileSelection, ZLayer, ZMap } from '@ui/stores/editor'
import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval'

export class MapRenderer {
  public app: PIXI.Application
  private tileSize: number

  private currentMapData: ZMap | null = null
  private mapWidth: number
  private mapHeight: number

  private mapContainer: PIXI.Container
  private gridGraphics: PIXI.Graphics
  private layers: Record<ZLayer, PIXI.Container>
  private tilesetTextures: Map<string, PIXI.Texture> = new Map()

  private tileSprites: Record<ZLayer, (PIXI.Sprite | null)[][]>
  private ghostContainer: PIXI.Container = new PIXI.Container()

  constructor(tileSize: number = 48, width: number = 20, height: number = 15) {
    this.tileSize = tileSize
    this.mapWidth = width
    this.mapHeight = height

    PIXI.TextureSource.defaultOptions.scaleMode = 'nearest'

    this.app = new PIXI.Application()
    this.mapContainer = new PIXI.Container()
    this.gridGraphics = new PIXI.Graphics()

    this.layers = {
      ground: new PIXI.Container(),
      decoration: new PIXI.Container(),
      events: new PIXI.Container()
    }

    this.tileSprites = {
      ground: this.createEmptyArray(),
      decoration: this.createEmptyArray(),
      events: this.createEmptyArray()
    }
  }

  public async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0xffffff,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    })
    container.appendChild(this.app.canvas)

    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen

    this.setupScene()
  }

  private setupScene(): void {
    this.mapContainer.addChild(
      this.layers.ground,
      this.layers.decoration,
      this.layers.events,
      this.ghostContainer,
      this.gridGraphics
    )
    this.app.stage.addChild(this.mapContainer)
    this.drawGrid()
  }

  public async loadTileset(id: string, url: string): Promise<void> {
    try {
      const texture = await PIXI.Assets.load(url)
      this.tilesetTextures.set(id, texture)
    } catch (e) {
      console.error(`Failed to load tileset ${id}`, e)
    }
  }
  private getQuadrantOffset(
    x: number,
    y: number,
    qx: number,
    qy: number,
    sel: TileSelection,
    layer: ZLayer
  ): { x: number; y: number } {
    // 1. Określamy kierunki sprawdzenia sąsiadów dla konkretnej ćwiartki
    const dx = qx === 0 ? -1 : 1 // Lewo dla ćwiartek lewych, prawo dla prawych
    const dy = qy === 0 ? -1 : 1 // Góra dla ćwiartek górnych, dół dla dolnych

    const hasH = this.isSameTile(x + dx, y, layer, sel) // Sąsiad Poziomy
    const hasV = this.isSameTile(x, y + dy, layer, sel) // Sąsiad Pionowy
    const hasD = this.isSameTile(x + dx, y + dy, layer, sel) // Sąsiad po skosie (Diagonal)

    // 2. MATRYCA WSPÓŁRZĘDNYCH (Pixel-Perfect RM MV Map)
    // Każda ćwiartka ma 5 stanów połączeń.

    // --- TOP-LEFT (qx: 0, qy: 0) ---
    if (qx === 0 && qy === 0) {
      if (!hasH && !hasV) return { x: 0, y: 0 } // Narożnik zewnętrzny
      if (hasH && !hasV) return { x: 48, y: 48 } // Krawędź pozioma
      if (!hasH && hasV) return { x: 0, y: 96 } // Krawędź pionowa
      if (hasH && hasV && !hasD) return { x: 48, y: 0 } // Narożnik wewnętrzny
      return { x: 48, y: 72 } // Środek (Fill)
    }

    // --- TOP-RIGHT (qx: 1, qy: 0) ---
    if (qx === 1 && qy === 0) {
      if (!hasH && !hasV) return { x: 24, y: 0 } // Narożnik zewnętrzny
      if (hasH && !hasV) return { x: 24, y: 48 } // Krawędź pozioma
      if (!hasH && hasV) return { x: 72, y: 96 } // Krawędź pionowa
      if (hasH && hasV && !hasD) return { x: 72, y: 0 } // Narożnik wewnętrzny
      return { x: 48, y: 72 } // Środek (Fill)
    }

    // --- BOTTOM-LEFT (qx: 0, qy: 1) ---
    if (qx === 0 && qy === 1) {
      if (!hasH && !hasV) return { x: 0, y: 120 } // Narożnik zewnętrzny
      if (hasH && !hasV) return { x: 48, y: 120 } // Krawędź pozioma
      if (!hasH && hasV) return { x: 0, y: 72 } // Krawędź pionowa
      if (hasH && hasV && !hasD) return { x: 48, y: 24 } // Narożnik wewnętrzny
      return { x: 48, y: 72 } // Środek (Fill) - Specyfika A1
    }

    // --- BOTTOM-RIGHT (qx: 1, qy: 1) ---
    if (qx === 1 && qy === 1) {
      if (!hasH && !hasV) return { x: 24, y: 24 } // Narożnik zewnętrzny
      if (hasH && !hasV) return { x: 24, y: 120 } // Krawędź pozioma
      if (!hasH && hasV) return { x: 72, y: 72 } // Krawędź pionowa
      if (hasH && hasV && !hasD) return { x: 72, y: 24 } // Narożnik wewnętrzny
      return { x: 48, y: 72 } // Środek (Fill)
    }

    return { x: 48, y: 72 }
  }

  private isSameTile(x: number, y: number, layer: ZLayer, sel: TileSelection): boolean {
    if (!this.currentMapData) return false
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return true // Poza mapą = połączone

    const tile = this.currentMapData.layers[layer][y][x]
    // Sprawdzamy czy to ten sam tileset i ten sam bazowy kafelek (id)
    return tile !== null && tile.tilesetId === sel.tilesetId && tile.x === sel.x && tile.y === sel.y
  }

  public drawTile(x: number, y: number, selection: TileSelection, layer: ZLayer): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return
    this.clearTileAt(x, y, layer)

    const tex = this.tilesetTextures.get(selection.tilesetId)
    if (!tex) return

    let container = new PIXI.Container()

    if (selection.isAutotile && selection.tilesetId === 'A1') {
      // Rysujemy 4 ćwiartki niezależnie
      for (let qy = 0; qy < 2; qy++) {
        for (let qx = 0; qx < 2; qx++) {
          const offset = this.getQuadrantOffset(x, y, qx, qy, selection, layer)
          const frames: PIXI.Texture[] = []

          for (let i = 0; i < 3; i++) {
            /**
             * frameX logic:
             * selection.x * 48 -> Start bloku w tilesecie
             * i * 96 -> Skok do kolejnej klatki animacji (blok 2x3 ma 96px szerokości)
             * offset.x -> Precyzyjny sub-tile 24px wyliczony przez getQuadrantOffset
             */
            const frameX = selection.x * 48 + i * 96 + offset.x
            const frameY = selection.y * 48 + offset.y

            frames.push(
              new PIXI.Texture({
                source: tex.source,
                frame: new PIXI.Rectangle(frameX, frameY, 24, 24)
              })
            )
          }

          const anim = new PIXI.AnimatedSprite(frames)
          anim.x = qx * 24 // Pozycja wewnątrz kafelka 48x48
          anim.y = qy * 24
          anim.animationSpeed = 0.15
          anim.play()
          container.addChild(anim)
        }
      }
    } else {
      container = new PIXI.Sprite(
        new PIXI.Texture({
          source: tex.source,
          frame: new PIXI.Rectangle(
            selection.x * this.tileSize,
            selection.y * this.tileSize,
            this.tileSize,
            this.tileSize
          )
        })
      )
    }

    container.x = x * this.tileSize
    container.y = y * this.tileSize
    this.layers[layer].addChild(container)
    this.tileSprites[layer][y][x] = container as any
  }

  public placeSelection(mx: number, my: number, sel: TileSelection, l: ZLayer): void {
    if (sel.isAutotile) {
      this.drawTile(mx, my, sel, l)
      return
    }

    for (let ox = 0; ox < sel.w; ox++) {
      for (let oy = 0; oy < sel.h; oy++) {
        const currentSel = { ...sel, x: sel.x + ox, y: sel.y + oy, w: 1, h: 1 }
        this.drawTile(mx + ox, my + oy, currentSel, l)
      }
    }
  }

  public clearTileAt(x: number, y: number, layer: ZLayer): void {
    const existing = this.tileSprites[layer][y][x]
    if (existing) {
      this.layers[layer].removeChild(existing)
      existing.destroy()
      this.tileSprites[layer][y][x] = null
    }
  }

  public renderMapFromStore(mapData: ZMap): void {
    this.currentMapData = mapData

    this.layers.ground.removeChildren()
    this.layers.decoration.removeChildren()
    this.layers.events.removeChildren()

    this.tileSprites.ground = this.createEmptyArray()
    this.tileSprites.decoration = this.createEmptyArray()
    this.tileSprites.events = this.createEmptyArray()

    const layers: ZLayer[] = ['ground', 'decoration', 'events']

    layers.forEach((layer) => {
      const grid = mapData.layers[layer]
      if (!grid) return

      for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
          const tile = grid[y][x]
          if (tile) {
            this.drawTile(x, y, tile, layer)
          }
        }
      }
    })
  }

  public getTileCoordsFromEvent(e: PIXI.FederatedPointerEvent): { x: number; y: number } | null {
    const l = this.mapContainer.toLocal(e.global)
    const x = Math.floor(l.x / this.tileSize)
    const y = Math.floor(l.y / this.tileSize)
    return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight ? { x, y } : null
  }

  public clearSelection(mx: number, my: number, sel: TileSelection, l: ZLayer): void {
    for (let ox = 0; ox < sel.w; ox++) {
      for (let oy = 0; oy < sel.h; oy++) {
        this.clearTileAt(mx + ox, my + oy, l)
      }
    }
  }

  public updateGhost(tx: number, ty: number, sel: TileSelection, eraser: boolean): void {
    this.ghostContainer.removeChildren()
    this.ghostContainer.x = tx * this.tileSize
    this.ghostContainer.y = ty * this.tileSize

    if (eraser) {
      this.ghostContainer.addChild(
        new PIXI.Graphics()
          .rect(0, 0, sel.w * this.tileSize, sel.h * this.tileSize)
          .fill({ color: 0xff0000, alpha: 0.3 })
          .stroke({ width: 1, color: 0xff0000, alpha: 0.5 })
      )
    } else if (sel.isAutotile && sel.tilesetId === 'A1') {
      const t = this.tilesetTextures.get(sel.tilesetId)
      if (t) {
        const s = new PIXI.Sprite(
          new PIXI.Texture({
            source: t.source,
            frame: new PIXI.Rectangle(
              sel.x * this.tileSize,
              sel.y * this.tileSize,
              this.tileSize, // 48px
              this.tileSize // 72px
            )
          })
        )
        s.alpha = 0.5
        this.ghostContainer.addChild(s)
      }
    } else {
      const t = this.tilesetTextures.get(sel.tilesetId)
      if (t) {
        const s = new PIXI.Sprite(
          new PIXI.Texture({
            source: t.source,
            frame: new PIXI.Rectangle(
              sel.x * this.tileSize,
              sel.y * this.tileSize,
              sel.w * this.tileSize,
              sel.h * this.tileSize
            )
          })
        )
        s.alpha = 0.5
        this.ghostContainer.addChild(s)
      }
    }
    this.ghostContainer.visible = true
  }

  public hideGhost(): void {
    this.ghostContainer.visible = false
  }

  public drawGrid(): void {
    this.gridGraphics.clear()

    this.gridGraphics.rect(0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize)

    for (let x = 0; x <= this.mapWidth; x++) {
      const isMajor = x % 2 === 0
      this.gridGraphics
        .moveTo(x * this.tileSize, 0)
        .lineTo(x * this.tileSize, this.mapHeight * this.tileSize)
        .stroke({
          width: isMajor ? 1 : 0.5,
          color: 0x000000,
          alpha: isMajor ? 0.2 : 0.05
        })
    }

    for (let y = 0; y <= this.mapHeight; y++) {
      const isMajor = y % 2 === 0
      this.gridGraphics
        .moveTo(0, y * this.tileSize)
        .lineTo(this.mapWidth * this.tileSize, y * this.tileSize)
        .stroke({
          width: isMajor ? 1 : 0.5,
          color: 0x000000,
          alpha: isMajor ? 0.2 : 0.05
        })
    }
  }

  private createEmptyArray(): (PIXI.Sprite | null)[][] {
    return Array.from({ length: this.mapHeight }, () => Array(this.mapWidth).fill(null))
  }

  public destroy(): void {
    this.app.destroy({ removeView: true })
  }
}
