import PIXI from '../utils/pixi'
import { TextureManager } from '../managers/TextureManager'
import { MapRenderSystem } from '../systems/MapRenderSystem'
import { GhostSystem } from '../systems/GhostSystem'
import { GridSystem } from '../systems/GridSystem'
import { initDevtools } from '@pixi/devtools'
import ZLogger from './ZLogger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T

export class ZEngine {
  public app: PIXI.Application
  public textureManager: TextureManager

  public get mapSystem(): MapRenderSystem | undefined {
    return this.getSystem(MapRenderSystem)
  }
  public get ghostSystem(): GhostSystem | undefined {
    return this.getSystem(GhostSystem)
  }
  public get gridSystem(): GridSystem | undefined {
    return this.getSystem(GridSystem)
  }

  private systems: Map<string, ZSystem> = new Map()

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
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0xffffff,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      eventMode: 'static'
    })
    container.appendChild(this.app.canvas)

    PIXI.TextureSource.defaultOptions.scaleMode = 'nearest'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.sortableChildren = true

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

  public getSystem<T extends ZSystem>(type: Constructor<T>): T | undefined {
    const system = this.systems.get(type.name)
    if (!system) {
      ZLogger.warn(`System ${type.name} not found in ZEngine`)
      return undefined
    }
    return system as T
  }

  public destroy(): void {
    this.systems.forEach((s) => s.onDestroy())
    this.app.destroy({ removeView: true })
  }
}
