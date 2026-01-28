import * as PIXI from 'pixi.js'
import 'pixi.js/unsafe-eval'
import { TextureManager } from '../managers/TextureManager'
import { MapRenderSystem } from '../systems/MapRenderSystem'
import { GhostSystem } from '../systems/GhostSystem'
import { GridSystem } from '../systems/GridSystem'
import { ZMap, TileSelection, ZLayer, ZTool } from '@ui/stores/editor'
import { initDevtools } from '@pixi/devtools'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T

export class ZEngine {
  public app: PIXI.Application
  public textureManager: TextureManager

  // Keep these as getters for backward compatibility or ease of use
  public get mapSystem(): MapRenderSystem {
    return this.getSystem(MapRenderSystem)
  }
  public get ghostSystem(): GhostSystem {
    return this.getSystem(GhostSystem)
  }
  public get gridSystem(): GridSystem {
    return this.getSystem(GridSystem)
  }

  private systems: Map<string, ZSystem> = new Map()
  private tileSize: number = 48

  public boot(): void {
    this.systems.forEach((system) => system.onBoot())
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS))
  }

  private tick(delta: number): void {
    this.systems.forEach((system) => system.onPreUpdate(delta))
    this.systems.forEach((system) => system.onUpdate(delta))
    this.systems.forEach((system) => system.onPostUpdate(delta))
  }

  constructor() {
    this.app = new PIXI.Application()
    this.textureManager = new TextureManager()
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

    // PIXI Configuration
    PIXI.TextureSource.defaultOptions.scaleMode = 'nearest'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.sortableChildren = true

    // Initialize Systems
    this.addSystem(new MapRenderSystem(this.app.stage, this.textureManager, tileSize))
    this.addSystem(new GhostSystem(this.app.stage, this.textureManager, tileSize))
    this.addSystem(new GridSystem(this.app.stage, this.textureManager, tileSize))

    this.boot()

    if (import.meta.env.DEV) {
      window.__PIXI_APP__ = this.app
    }

    initDevtools({ app: this.app })
  }

  public addSystem<T extends ZSystem>(system: T): T {
    this.systems.set(system.constructor.name, system)
    return system
  }

  public getSystem<T extends ZSystem>(type: Constructor<T>): T {
    const system = this.systems.get(type.name)
    if (!system) {
      throw new Error(`System ${type.name} not found in ZEngine`)
    }
    return system as T
  }

  // --- API FOR VIEWPORT ---

  public async loadTileset(id: string, url: string): Promise<void> {
    await this.textureManager.loadTileset(id, url)
  }

  public renderMap(mapData: ZMap, isEventTool: boolean): void {
    this.mapSystem.renderFullMap(mapData)

    this.gridSystem.drawGrid(isEventTool ? mapData.width : 0, isEventTool ? mapData.height : 0)
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

  public destroy(): void {
    this.systems.forEach((s) => s.onDestroy())
    this.app.destroy({ removeView: true })
  }
}
