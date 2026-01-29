import { Application } from '../utils/pixi'
import { SceneManager } from '../managers/SceneManager'
import { TextureManager } from '../managers/TextureManager'
import { RenderSystem } from '../systems/RenderSystem'
import { GhostSystem } from '../systems/GhostSystem'
import { GridSystem } from '../systems/GridSystem'
import { PlayerSystem } from '../systems/PlayerSystem'
import { EntityRenderSystem } from '../systems/EntityRenderSystem'
import { EventSystem } from '../systems/EventSystem'
import { MessageSystem } from '../systems/MessageSystem'
import { initDevtools } from '@pixi/devtools'
import { InputManager } from '../managers/InputManager'
import { MapManager } from '../managers/MapManager'
import { TransitionSystem } from '../systems/TransitionSystem'
import { TilesetManager } from '../managers/TilesetManager'
import { ToolManager } from '../managers/ToolManager'
import { HistoryManager } from '../managers/HistoryManager'
import ZLogger from './ZLogger'
import { ZEventBus } from './ZEventBus'
import { ServiceLocator } from './ServiceLocator'
import { ZSystem, ZDataProvider } from '@engine/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T

export class ZEngine {
  public app: Application
  public services: ServiceLocator

  public mode: 'edit' | 'play' = 'edit'

  public eventBus: ZEventBus

  public get sceneManager(): SceneManager {
    return this.services.require(SceneManager)
  }

  public get renderSystem(): RenderSystem | undefined {
    return this.services.get(RenderSystem)
  }
  public get ghostSystem(): GhostSystem | undefined {
    return this.services.get(GhostSystem)
  }
  public get gridSystem(): GridSystem | undefined {
    return this.services.get(GridSystem)
  }
  public get playerSystem(): PlayerSystem | undefined {
    return this.services.get(PlayerSystem)
  }
  public get entityRenderSystem(): EntityRenderSystem | undefined {
    return this.services.get(EntityRenderSystem)
  }
  public get eventSystem(): EventSystem | undefined {
    return this.services.get(EventSystem)
  }
  public get transitionSystem(): TransitionSystem | undefined {
    return this.services.get(TransitionSystem)
  }
  public get messageSystem(): MessageSystem | undefined {
    return this.getSystem(MessageSystem)
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
    const messageSystem = this.getSystem(MessageSystem)

    if (mode === 'play') {
      entitySystem?.setVisible(true)
      ghostSystem?.setVisible(false)
      gridSystem?.setVisible(false)

      // Ensure MessageSystem has correct position
      if (messageSystem) {
        messageSystem.resize(this.app.screen.width, this.app.screen.height)
      }

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

  public setDataProvider(provider: ZDataProvider): void {
    this.sceneManager.setDataProvider(provider)
    this.services.require(ToolManager).setDataProvider(provider)
    this.services.require(HistoryManager).setDataProvider(provider)
    ZLogger.log('[ZEngine] Data Provider set')
  }

  constructor() {
    this.app = new Application()
    this.services = new ServiceLocator()

    // Create managers
    const textureManager = new TextureManager()
    const inputManager = new InputManager()
    const tilesetManager = new TilesetManager()
    const mapManager = new MapManager(tilesetManager)
    const historyManager = new HistoryManager()
    const toolManager = new ToolManager(mapManager, historyManager)
    const sceneManager = new SceneManager(this.services)
    const eventBus = new ZEventBus()
    this.eventBus = eventBus

    // Register all managers in ServiceLocator
    this.services.register(TextureManager, textureManager)
    this.services.register(InputManager, inputManager)
    this.services.register(TilesetManager, tilesetManager)
    this.services.register(MapManager, mapManager)
    this.services.register(HistoryManager, historyManager)
    this.services.register(ToolManager, toolManager)
    this.services.register(SceneManager, sceneManager)
    this.services.register(ZEventBus, eventBus)
    this.services.register('ZEngine', this)

    ZLogger.log(
      '[ZEngine] ServiceLocator initialized with',
      this.services.getRegisteredServices().length,
      'services'
    )
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

    const renderSystem = new RenderSystem(this.app.stage, this.services, tileSize)
    this.addSystem(renderSystem)
    this.services.register(RenderSystem, renderSystem)
    this.services.require(ToolManager).setRenderSystem(renderSystem)
    this.services
      .require(HistoryManager)
      .setManagers(this.services.require(MapManager), renderSystem)

    const ghostSystem = new GhostSystem(this.app.stage, this.services, tileSize)
    this.addSystem(ghostSystem)
    this.services.register(GhostSystem, ghostSystem)

    const gridSystem = new GridSystem(this.app.stage, this.services, tileSize)
    this.addSystem(gridSystem)
    this.services.register(GridSystem, gridSystem)
    const transitionSystem = new TransitionSystem(this.app.stage, this.services)
    this.addSystem(transitionSystem)
    this.services.register(TransitionSystem, transitionSystem)
    // Initial resize to match screen
    transitionSystem.resize(this.app.screen.width, this.app.screen.height)

    const playerSystem = new PlayerSystem(this.services, tileSize)
    this.addSystem(playerSystem)
    this.services.register(PlayerSystem, playerSystem) // Register so EventSystem can find it

    // EventSystem depends on PlayerSystem (for collision/triggering)
    const eventSystem = new EventSystem(this.services)
    this.addSystem(eventSystem)
    this.services.register(EventSystem, eventSystem)

    // MessageSystem for in-game dialogue
    const messageSystem = new MessageSystem(this.app.stage, this.services)
    this.addSystem(messageSystem)
    this.services.register(MessageSystem, messageSystem)
    messageSystem.resize(this.app.screen.width, this.app.screen.height)

    const entityRenderSystem = new EntityRenderSystem(this.services, tileSize)
    this.addSystem(entityRenderSystem)
    this.services.register(EntityRenderSystem, entityRenderSystem)

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

  public destroy(): void {
    this.services.require(InputManager).destroy()
    this.systems.forEach((s) => {
      s.onDestroy()
      ZLogger.with(s.constructor.name).info("I'm leaving!")
    })
    this.app.destroy({ removeView: true })
    ZLogger.log('Goodbye 👋🏽 Everything is gone!')
  }
}
