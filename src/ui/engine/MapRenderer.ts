import { TileSelection } from '@ui/stores/editor'
import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval'

export type ZLayer = 'ground' | 'decoration' | 'events'

export class MapRenderer {
  public app: PIXI.Application
  private tileSize: number
  private mapWidth: number
  private mapHeight: number

  private mapContainer: PIXI.Container
  private gridGraphics: PIXI.Graphics
  private layers: Record<ZLayer, PIXI.Container>

  // NOWOŚĆ: Mapa tekstur zamiast pojedynczego pliku
  private tilesetTextures: Map<string, PIXI.Texture> = new Map()

  private tileSprites: Record<ZLayer, (PIXI.Sprite | null)[][]>
  private ghostContainer: PIXI.Container = new PIXI.Container()

  constructor(tileSize: number = 32, width: number = 20, height: number = 15) {
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
      ground: this.createEmptySpriteArray(),
      decoration: this.createEmptySpriteArray(),
      events: this.createEmptySpriteArray()
    }
  }

  public async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0xffffff,
      autoDensity: true,
      antialias: false,
      resolution: window.devicePixelRatio || 1
    })

    container.appendChild(this.app.canvas)
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen

    this.setupScene()
  }

  private setupScene(): void {
    const mapBg = new PIXI.Graphics()
      .rect(0, 0, this.mapWidth * this.tileSize, this.mapHeight * this.tileSize)
      .fill(0x121212, 0.2)

    this.mapContainer.addChild(mapBg)
    this.mapContainer.addChild(this.layers.ground)
    this.mapContainer.addChild(this.layers.decoration)
    this.mapContainer.addChild(this.layers.events)

    this.ghostContainer.alpha = 0.5
    this.ghostContainer.visible = false
    this.mapContainer.addChild(this.ghostContainer)

    this.mapContainer.addChild(this.gridGraphics)
    this.app.stage.addChild(this.mapContainer)

    this.drawGrid()
  }

  /**
   * Ładowanie konkretnego arkusza pod kluczem (np. 'A1', 'B')
   */
  public async loadTileset(id: string, url: string): Promise<void> {
    try {
      const texture = await PIXI.Assets.load(url)
      this.tilesetTextures.set(id, texture)
      console.log(`[Z Engine] Tileset ${id} loaded.`)
    } catch (error) {
      console.error(`[Z Engine] Error loading tileset ${id}:`, error)
    }
  }

  /**
   * Tworzy sprite kafelka pobierając teksturę z konkretnego arkusza
   */
  private createTileSprite(sx: number, sy: number, tilesetId: string): PIXI.Sprite | null {
    const baseTex = this.tilesetTextures.get(tilesetId)
    if (!baseTex) return null

    const frame = new PIXI.Rectangle(
      sx * this.tileSize,
      sy * this.tileSize,
      this.tileSize,
      this.tileSize
    )

    const tex = new PIXI.Texture({
      source: baseTex.source,
      frame: frame
    })
    return new PIXI.Sprite(tex)
  }

  public updateGhost(
    targetX: number,
    targetY: number,
    selection: TileSelection,
    isEraser: boolean
  ): void {
    this.ghostContainer.removeChildren()

    if (isEraser) {
      const rect = new PIXI.Graphics()
        .rect(0, 0, selection.w * this.tileSize, selection.h * this.tileSize)
        .fill({ color: 0xff0000, alpha: 0.3 })
        .stroke({ width: 2, color: 0xff0000, alpha: 0.8 })
      this.ghostContainer.addChild(rect)
    } else {
      for (let ox = 0; ox < selection.w; ox++) {
        for (let oy = 0; oy < selection.h; oy++) {
          // Używamy tilesetId z obiektu zaznaczenia
          const sprite = this.createTileSprite(
            selection.x + ox,
            selection.y + oy,
            selection.tilesetId
          )
          if (sprite) {
            sprite.x = ox * this.tileSize
            sprite.y = oy * this.tileSize
            this.ghostContainer.addChild(sprite)
          }
        }
      }
    }

    this.ghostContainer.x = targetX * this.tileSize
    this.ghostContainer.y = targetY * this.tileSize
    this.ghostContainer.visible = true
  }

  public hideGhost(): void {
    this.ghostContainer.visible = false
  }

  public placeSelection(mapX: number, mapY: number, selection: TileSelection, layer: ZLayer): void {
    for (let ox = 0; ox < selection.w; ox++) {
      for (let oy = 0; oy < selection.h; oy++) {
        this.drawTile(
          mapX + ox,
          mapY + oy,
          selection.x + ox,
          selection.y + oy,
          layer,
          selection.tilesetId
        )
      }
    }
  }

  public drawTile(
    x: number,
    y: number,
    sx: number,
    sy: number,
    layer: ZLayer,
    tilesetId: string // NOWOŚĆ: musimy wiedzieć co rysujemy
  ): void {
    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return

    this.clearTileAt(x, y, layer)

    const sprite = this.createTileSprite(sx, sy, tilesetId)
    if (!sprite) return

    sprite.x = x * this.tileSize
    sprite.y = y * this.tileSize

    this.layers[layer].addChild(sprite)
    this.tileSprites[layer][y][x] = sprite
  }

  public clearTileAt(x: number, y: number, layer: ZLayer): void {
    const existing = this.tileSprites[layer][y][x]
    if (existing) {
      this.layers[layer].removeChild(existing)
      existing.destroy({ texture: false })
      this.tileSprites[layer][y][x] = null
    }
  }

  public getTileCoordsFromEvent(
    event: PIXI.FederatedPointerEvent
  ): { x: number; y: number } | null {
    const local = this.mapContainer.toLocal(event.global)
    const x = Math.floor(local.x / this.tileSize)
    const y = Math.floor(local.y / this.tileSize)

    if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return null
    return { x, y }
  }

  public clearSelection(mapX: number, mapY: number, selection: TileSelection, layer: ZLayer): void {
    for (let ox = 0; ox < selection.w; ox++) {
      for (let oy = 0; oy < selection.h; oy++) {
        this.clearTileAt(mapX + ox, mapY + oy, layer)
      }
    }
  }

  public drawGrid(): void {
    this.gridGraphics.clear()
    const w = this.mapWidth * this.tileSize
    const h = this.mapHeight * this.tileSize
    for (let x = 0; x <= this.mapWidth; x++) {
      this.gridGraphics
        .moveTo(x * this.tileSize, 0)
        .lineTo(x * this.tileSize, h)
        .stroke({ width: 1, color: 0x000000, alpha: 0.1 })
    }
    for (let y = 0; y <= this.mapHeight; y++) {
      this.gridGraphics
        .moveTo(0, y * this.tileSize)
        .lineTo(w, y * this.tileSize)
        .stroke({ width: 1, color: 0x000000, alpha: 0.1 })
    }
  }

  private createEmptySpriteArray(): (PIXI.Sprite | null)[][] {
    return Array.from({ length: this.mapHeight }, () => Array(this.mapWidth).fill(null))
  }

  public destroy(): void {
    this.app.destroy({})
  }
}
