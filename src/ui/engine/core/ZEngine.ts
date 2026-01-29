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
import { GameStateManager } from '../managers/GameStateManager'
import ZLogger from './ZLogger'
import { ZEventBus } from './ZEventBus'
import { ServiceLocator } from './ServiceLocator'
import { ZSystem, ZDataProvider } from '@engine/types'

export class ZEngine {
  public app: Application
  public services: ServiceLocator

  public mode: 'edit' | 'play' = 'edit'

  public eventBus: ZEventBus

  public boot(): void {
    this.services.getAllInstances(ZSystem).forEach((system) => {
      system.onBoot()
      ZLogger.with(system.constructor.name).info("I'm ready!")
    })
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS))
  }

  private tick(delta: number): void {
    this.services.getAllInstances(ZSystem).forEach((system) => {
      if (this.mode === 'edit') {
        if (system instanceof PlayerSystem || system instanceof EntityRenderSystem) return
      } else {
        if (system instanceof GhostSystem) return
      }

      system.onPreUpdate(delta)
      system.onUpdate(delta)
      system.onPostUpdate(delta)
    })
  }

  public setMode(mode: 'edit' | 'play'): void {
    this.mode = mode
    ZLogger.log(`Switched to ${mode} mode`)

    const entitySystem = this.services.get(EntityRenderSystem)
    const ghostSystem = this.services.get(GhostSystem)
    const gridSystem = this.services.get(GridSystem)
    const messageSystem = this.services.get(MessageSystem)

    if (mode === 'play') {
      entitySystem?.setVisible(true)
      ghostSystem?.setVisible(false)
      gridSystem?.setVisible(false)

      if (messageSystem) {
        messageSystem.resize(this.app.screen.width, this.app.screen.height)
      }

      this.services.get(PlayerSystem)?.onBoot()
    } else {
      entitySystem?.setVisible(false)
      ghostSystem?.setVisible(true)
      gridSystem?.setVisible(true)
    }
  }

  public setDataProvider(provider: ZDataProvider): void {
    this.services.require(SceneManager).setDataProvider(provider)
    this.services.require(ToolManager).setDataProvider(provider)
    this.services.require(HistoryManager).setDataProvider(provider)
    this.services.require(GameStateManager).setDataProvider(provider)
    ZLogger.log('[ZEngine] Data Provider set')
  }

  constructor() {
    this.app = new Application()
    this.services = new ServiceLocator()

    // 1. Register Core Logic (Managers)
    this.services.register(TextureManager, new TextureManager())
    this.services.register(InputManager, new InputManager())
    this.services.register(TilesetManager, new TilesetManager())
    this.services.register(MapManager, new MapManager(this.services))
    this.services.register(HistoryManager, new HistoryManager(this.services))
    this.services.register(ToolManager, new ToolManager(this.services))
    this.services.register(SceneManager, new SceneManager(this.services))
    this.services.register(ZEventBus, new ZEventBus())
    this.services.register(GameStateManager, new GameStateManager(this.services))
    this.services.register('ZEngine', this)

    this.eventBus = this.services.require(ZEventBus)

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

    // 2. Register Active Systems
    this.services.register(RenderSystem, new RenderSystem(this.app.stage, this.services, tileSize))
    this.services.register(GhostSystem, new GhostSystem(this.app.stage, this.services, tileSize))
    this.services.register(GridSystem, new GridSystem(this.app.stage, this.services, tileSize))
    this.services.register(PlayerSystem, new PlayerSystem(this.services, tileSize))
    this.services.register(EventSystem, new EventSystem(this.services))
    this.services.register(EntityRenderSystem, new EntityRenderSystem(this.services, tileSize))

    const transitionSystem = new TransitionSystem(this.app.stage, this.services)
    this.services.register(TransitionSystem, transitionSystem)
    transitionSystem.resize(this.app.screen.width, this.app.screen.height)

    const messageSystem = new MessageSystem(this.app.stage, this.services)
    this.services.register(MessageSystem, messageSystem)
    messageSystem.resize(this.app.screen.width, this.app.screen.height)

    this.boot()

    if (import.meta.env.DEV) {
      window.__PIXI_APP__ = this.app
      initDevtools({ app: this.app })
    }

    ZLogger.log('Hello 👋🏽 Everything is ready!')
  }

  public destroy(): void {
    this.services.require(InputManager).destroy()
    this.services.getAllInstances(ZSystem).forEach((s) => {
      s.onDestroy()
      ZLogger.with(s.constructor.name).info("I'm leaving!")
    })
    this.app.destroy({ removeView: true })
    ZLogger.log('Goodbye 👋🏽 Everything is gone!')
  }
}
