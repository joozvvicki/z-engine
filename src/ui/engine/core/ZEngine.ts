import { Application } from '../utils/pixi'
import { ServiceLocator } from './ServiceLocator'
import { ZDataProvider } from '@engine/types'
import { SystemManager } from './SystemManager'
import { EngineBootstrapper } from './EngineBootstrapper'
import { SceneManager } from '../managers/SceneManager'
import { ToolManager } from '../managers/ToolManager'
import { HistoryManager } from '../managers/HistoryManager'
import { GameStateManager } from '../managers/GameStateManager'
import { InputManager } from '../managers/InputManager'
import { ZEventBus } from './ZEventBus'
import { EntityRenderSystem } from '../systems/EntityRenderSystem'
import { GhostSystem } from '../systems/GhostSystem'
import { GridSystem } from '../systems/GridSystem'
import { MessageSystem } from '../systems/MessageSystem'
import { PlayerSystem } from '../systems/PlayerSystem'
import { initDevtools } from '@pixi/devtools'
import ZLogger from './ZLogger'

export class ZEngine {
  public app: Application
  public services: ServiceLocator
  private lifecycle: SystemManager
  public mode: 'edit' | 'play' = 'edit'

  constructor() {
    this.app = new Application()
    this.services = new ServiceLocator()
    this.services.register('ZEngine', this)

    EngineBootstrapper.registerManagers(this.services)
    this.lifecycle = new SystemManager(this.services, this.app)
  }

  public get eventBus(): ZEventBus {
    return this.services.require(ZEventBus)
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
    this.app.canvas.addEventListener('mouseenter', () => this.app.canvas.focus())
    container.appendChild(this.app.canvas)

    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.sortableChildren = true

    EngineBootstrapper.registerSystems(
      this.services,
      this.app.stage,
      tileSize,
      this.app.screen.width,
      this.app.screen.height
    )

    this.lifecycle.boot()

    if (import.meta.env.DEV) {
      window.__PIXI_APP__ = this.app
      initDevtools({ app: this.app })
    }

    ZLogger.log('Hello 👋🏽 Everything is ready!')
  }

  public setMode(mode: 'edit' | 'play'): void {
    this.mode = mode
    this.lifecycle.setMode(mode)
    ZLogger.log(`Switched to ${mode} mode`)

    const entitySystem = this.services.get(EntityRenderSystem)
    const ghostSystem = this.services.get(GhostSystem)
    const gridSystem = this.services.get(GridSystem)
    const messageSystem = this.services.get(MessageSystem)

    if (mode === 'play') {
      entitySystem?.setVisible(true)
      ghostSystem?.setVisible(false)
      gridSystem?.setVisible(false)
      messageSystem?.resize(this.app.screen.width, this.app.screen.height)
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
    this.services.require(GameStateManager).setDataProvider()
    ZLogger.log('[ZEngine] Data Provider set')
  }

  public destroy(): void {
    this.services.require(InputManager).destroy()
    this.lifecycle.destroy()
    this.app.destroy({ removeView: true })
    ZLogger.log('Goodbye 👋🏽 Everything is gone!')
  }
}
