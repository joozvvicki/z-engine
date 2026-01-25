import { TileSelection, ZLayer } from '@ui/stores/editor'
import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval'

export class MapRenderer {
  public app: PIXI.Application
  private tileSize: number
  private mapWidth: number
  private mapHeight: number

  private mapContainer: PIXI.Container
  private gridGraphics: PIXI.Graphics
  private layers: Record<ZLayer, PIXI.Container>
  private tilesetTextures: Map<string, PIXI.Texture> = new Map()

  private tileSprites: Record<ZLayer, (PIXI.Sprite | null)[][]>
  private ghostContainer: PIXI.Container = new PIXI.Container()

  constructor(tileSize: number = 24, width: number = 60, height: number = 30) {
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
    const texture = await PIXI.Assets.load(url)
    this.tilesetTextures.set(id, texture)
  }

  public drawTile(x: number, y: number, selection: TileSelection, layer: ZLayer): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return

    this.clearTileAt(x, y, layer)

    const tex = this.tilesetTextures.get(selection.tilesetId)
    if (!tex) return

    const sprite = new PIXI.Sprite(
      new PIXI.Texture({
        source: tex.source,
        frame: new PIXI.Rectangle(
          selection.x * this.tileSize, // x * 24
          selection.y * this.tileSize, // y * 24
          this.tileSize, // 24
          this.tileSize // 24
        )
      })
    )

    sprite.x = x * this.tileSize
    sprite.y = y * this.tileSize

    this.layers[layer].addChild(sprite)
    this.tileSprites[layer][y][x] = sprite
  }

  public clearTileAt(x: number, y: number, layer: ZLayer): void {
    const existing = this.tileSprites[layer][y][x]
    if (existing) {
      this.layers[layer].removeChild(existing)
      existing.destroy()
      this.tileSprites[layer][y][x] = null
    }
  }

  // --- STANDARDOWE METODY ---

  public drawGrid(): void {
    this.gridGraphics.clear()

    // Rysujemy siatkę 24px (cienka)
    this.gridGraphics.rect(0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize)

    // Linie pionowe
    for (let x = 0; x <= this.mapWidth; x++) {
      const isMajor = x % 2 === 0 // Co 2 kratki (czyli co 48px) grubsza linia
      this.gridGraphics
        .moveTo(x * this.tileSize, 0)
        .lineTo(x * this.tileSize, this.mapHeight * this.tileSize)
        .stroke({
          width: isMajor ? 1 : 0.5,
          color: 0x000000,
          alpha: isMajor ? 0.2 : 0.05
        })
    }

    // Linie poziome
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

  public getTileCoordsFromEvent(e: PIXI.FederatedPointerEvent): { x: number; y: number } | null {
    const l = this.mapContainer.toLocal(e.global)
    const x = Math.floor(l.x / this.tileSize)
    const y = Math.floor(l.y / this.tileSize)
    return x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight ? { x, y } : null
  }

  public placeSelection(mx: number, my: number, sel: TileSelection, l: ZLayer): void {
    for (let ox = 0; ox < sel.w; ox++) {
      for (let oy = 0; oy < sel.h; oy++) {
        const currentSel = { ...sel, x: sel.x + ox, y: sel.y + oy }
        this.drawTile(mx + ox, my + oy, currentSel, l)
      }
    }
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
      )
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
        s.alpha = 0.6
        this.ghostContainer.addChild(s)
      }
    }
    this.ghostContainer.visible = true
  }

  public hideGhost(): void {
    this.ghostContainer.visible = false
  }

  private createEmptyArray(): (PIXI.Sprite | null)[][] {
    return Array.from({ length: this.mapHeight }, () => Array(this.mapWidth).fill(null))
  }

  public destroy(): void {
    this.app.destroy({ removeView: true })
  }
}
