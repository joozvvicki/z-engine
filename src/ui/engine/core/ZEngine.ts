import { Application as PIXIApplication } from '../utils/pixi'
import { TextureManager } from '../managers/TextureManager'
import { RenderSystem } from '../systems/RenderSystem'
import { GhostSystem } from '../systems/GhostSystem'
import { GridSystem } from '../systems/GridSystem'
import { PlayerSystem } from '../systems/PlayerSystem'
import { EntityRenderSystem } from '../systems/EntityRenderSystem'
import { EventSystem } from '../systems/EventSystem'
import { initDevtools } from '@pixi/devtools'
import { InputManager } from '../managers/InputManager'
import { MapManager } from '../managers/MapManager'
import { TransitionSystem } from '../systems/TransitionSystem'
import ZLogger from './ZLogger'
import { ZSystem } from '@engine/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T

export class ZEngine {
  public app: PIXIApplication
  public textureManager: TextureManager
  public inputManager: InputManager
  public mapManager: MapManager
  public mode: 'edit' | 'play' = 'edit'
  public onMapChangeRequest: ((mapId: number, x: number, y: number) => Promise<void>) | null = null

  public get renderSystem(): RenderSystem | undefined {
    return this.getSystem(RenderSystem)
  }
  public get ghostSystem(): GhostSystem | undefined {
    return this.getSystem(GhostSystem)
  }
  public get gridSystem(): GridSystem | undefined {
    return this.getSystem(GridSystem)
  }
  public get playerSystem(): PlayerSystem | undefined {
    return this.getSystem(PlayerSystem)
  }
  public get entityRenderSystem(): EntityRenderSystem | undefined {
    return this.getSystem(EntityRenderSystem)
  }
  public get eventSystem(): EventSystem | undefined {
    return this.getSystem(EventSystem)
  }
  public get transitionSystem(): TransitionSystem | undefined {
    return this.getSystem(TransitionSystem)
  }

  private systems: Map<string, ZSystem> = new Map()

  public boot(): void {
    this.systems.forEach((system) => {
      system.onBoot()
      ZLogger.with(system.constructor.name).info("I'm ready!")
    })
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS))
  }

  private tick(delta: number): void {
    // Edit Mode: Update Ghost, Grid, Render
    // Play Mode: Update Player, EntityRender, Render
    this.systems.forEach((system) => {
      // Filter systems based on mode
      if (this.mode === 'edit') {
        if (system instanceof PlayerSystem || system instanceof EntityRenderSystem) return
      } else {
        if (system instanceof GhostSystem) return // Hide ghost in play mode?
      }

      system.onPreUpdate(delta)
      system.onUpdate(delta)
      system.onPostUpdate(delta)
    })
  }

  public setMode(mode: 'edit' | 'play'): void {
    this.mode = mode
    ZLogger.log(`Switched to ${mode} mode`)

    const entitySystem = this.getSystem(EntityRenderSystem)
    const ghostSystem = this.getSystem(GhostSystem)
    const gridSystem = this.getSystem(GridSystem)

    if (mode === 'play') {
      entitySystem?.setVisible(true)
      ghostSystem?.setVisible(false)
      gridSystem?.setVisible(false)

      // Hide Editor Events Markers (keep layer visible for Player) - managed by Vue Store now
      // this.renderSystem?.setEventMarkersVisible(false)

      // Reset player
      this.getSystem(PlayerSystem)?.onBoot()
    } else {
      entitySystem?.setVisible(false)
      ghostSystem?.setVisible(true)
      gridSystem?.setVisible(true)

      // Show Editor Events Markers - managed by Vue Store now
      // this.renderSystem?.setEventMarkersVisible(true)
    }
  }

  constructor() {
    this.app = new PIXIApplication()
    this.textureManager = new TextureManager()
    this.inputManager = null!
    this.mapManager = null!
  }

  public async init(container: HTMLElement, tileSize: number): Promise<void> {
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0xffffff,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      eventMode: 'static'
    })
    this.app.canvas.tabIndex = 1
    this.app.canvas.style.outline = 'none'
    this.app.canvas.addEventListener('mouseenter', () => {
      this.app.canvas.focus()
    })
    container.appendChild(this.app.canvas)

    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.sortableChildren = true

    this.inputManager = new InputManager()
    this.mapManager = new MapManager()

    this.addSystem(new RenderSystem(this.app.stage, this.textureManager, this.mapManager, tileSize))
    this.addSystem(new GhostSystem(this.app.stage, this.textureManager, tileSize))
    this.addSystem(new GridSystem(this.app.stage, this.textureManager, tileSize))
    const transitionSystem = new TransitionSystem(this.app.stage)
    this.addSystem(transitionSystem)
    // Initial resize to match screen
    transitionSystem.resize(this.app.screen.width, this.app.screen.height)

    const playerSystem = new PlayerSystem(this.inputManager, this.mapManager, tileSize)
    this.addSystem(playerSystem)

    // EventSystem depends on PlayerSystem
    this.addSystem(new EventSystem(this, this.mapManager, playerSystem))

    // We need RenderSystem instance to pass to EntityRenderSystem
    const renderSystem = this.getSystem(RenderSystem)
    if (!renderSystem) throw new Error('RenderSystem not found')

    this.addSystem(
      new EntityRenderSystem(
        this.app.stage,
        playerSystem,
        this.textureManager,
        tileSize,
        renderSystem,
        this.mapManager
      )
    )

    this.boot()

    if (import.meta.env.DEV) {
      window.__PIXI_APP__ = this.app
      initDevtools({ app: this.app })
    }

    ZLogger.log('Hello 👋🏽 Everything is ready!')
  }

  public addSystem<T extends ZSystem>(system: T): T {
    this.systems.set(system.constructor.name, system)
    return system
  }

  public getSystem<T extends ZSystem>(type: Constructor<T>): T | undefined {
    const system = this.systems.get(type.name)
    return system as T
  }

  public async transferPlayer(mapId: number, x: number, y: number): Promise<void> {
    ZLogger.log(`[ZEngine] Transferring Player to Map ${mapId} @ ${x},${y}`)

    // 1. Fade Out
    await this.transitionSystem?.fadeOut(300)

    // 2. Request Map Change via Callback (Vue Store integration)
    if (this.onMapChangeRequest) {
      await this.onMapChangeRequest(mapId, x, y)
    } else {
      ZLogger.warn('[ZEngine] onMapChangeRequest not set, transfer may fail or be incomplete')
    }

    // 3. Fade In
    await this.transitionSystem?.fadeIn(300)
  }

  public destroy(): void {
    this.inputManager?.destroy()
    this.systems.forEach((s) => {
      s.onDestroy()
      ZLogger.with(s.constructor.name).info("I'm leaving!")
    })
    this.app.destroy({ removeView: true })
    ZLogger.log('Goodbye 👋🏽 Everything is gone!')
  }
}
