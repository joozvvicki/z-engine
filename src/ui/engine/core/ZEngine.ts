import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval'
import { TextureManager } from '../managers/TextureManager'
import { MapRenderSystem } from '../systems/MapRenderSystem'
import { GhostSystem } from '../systems/GhostSystem'
import { ZMap, TileSelection, ZLayer, ZTool } from '@ui/stores/editor'

export class ZEngine {
  public app: PIXI.Application
  public textureManager: TextureManager
  public mapSystem!: MapRenderSystem
  public ghostSystem!: GhostSystem

  private gridGraphics: PIXI.Graphics
  private tileSize: number = 48

  constructor() {
    this.app = new PIXI.Application()
    this.textureManager = new TextureManager()
    this.gridGraphics = new PIXI.Graphics()
    // Systemy inicjalizujemy w init(), gdy mamy stage
  }

  public async init(container: HTMLElement, tileSize: number): Promise<void> {
    this.tileSize = tileSize

    await this.app.init({
      resizeTo: container,
      backgroundColor: 0xffffff,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      eventMode: 'static'
    })
    container.appendChild(this.app.canvas)

    // Konfiguracja PIXI
    PIXI.TextureSource.defaultOptions.scaleMode = 'nearest'
    this.app.stage.hitArea = this.app.screen

    // Inicjalizacja systemów
    this.mapSystem = new MapRenderSystem(this.app.stage, this.textureManager, tileSize)
    this.ghostSystem = new GhostSystem(this.app.stage, this.textureManager, tileSize)

    // Grid
    this.app.stage.addChild(this.gridGraphics) // Grid na wierzchu (pod ghostem)
    this.app.stage.sortableChildren = true
  }

  // --- API DLA VIEWPORTU ---

  public async loadTileset(id: string, url: string): Promise<void> {
    await this.textureManager.loadTileset(id, url)
  }

  public renderMap(mapData: ZMap, isEventTool: boolean): void {
    if (!this.mapSystem) return
    this.mapSystem.renderFullMap(mapData)
    this.drawGrid(mapData.width, mapData.height, isEventTool)
  }

  public drawTile(
    x: number,
    y: number,
    tiles: TileSelection[],
    layer: ZLayer,
    mapData: ZMap
  ): void {
    this.mapSystem.drawTile(x, y, tiles, layer, mapData)
  }

  public clearTile(x: number, y: number, layer: ZLayer): void {
    this.mapSystem.clearTileAt(x, y, layer)
  }

  // Delegacja do GhostSystem
  public updateGhost(x: number, y: number, sel: TileSelection, tool: ZTool): void {
    this.ghostSystem.update(x, y, sel, tool)
  }

  public updateShapeGhost(
    start: { x: number; y: number },
    end: { x: number; y: number },
    tool: ZTool
  ): void {
    this.ghostSystem.updateShape(start, end, tool)
  }

  public hideGhost(): void {
    this.ghostSystem.hide()
  }

  public getTileCoords(globalEvent: PIXI.FederatedPointerEvent): { x: number; y: number } {
    const local = this.app.stage.toLocal(globalEvent.global)
    return {
      x: Math.floor(local.x / this.tileSize),
      y: Math.floor(local.y / this.tileSize)
    }
  }

  private drawGrid(w: number, h: number, isEventTool: boolean): void {
    const g = this.gridGraphics
    g.clear()
    g.zIndex = 100

    if (!isEventTool) return
    for (let x = 0; x <= w; x++) {
      g.moveTo(x * this.tileSize, 0)
        .lineTo(x * this.tileSize, h * this.tileSize)
        .stroke({ width: 1, color: 0x000000, alpha: 0.1 })
    }
    for (let y = 0; y <= h; y++) {
      g.moveTo(0, y * this.tileSize)
        .lineTo(w * this.tileSize, y * this.tileSize)
        .stroke({ width: 1, color: 0x000000, alpha: 0.1 })
    }
  }

  public destroy(): void {
    this.app.destroy({ removeView: true })
  }
}
