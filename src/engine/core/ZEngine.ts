import { Application } from '@engine/utils/pixi'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZDataProvider } from '@engine/types'
import { SystemManager } from '@engine/core/SystemManager'
import { EngineBootstrapper } from '@engine/core/EngineBootstrapper'
import { SceneManager } from '@engine/managers/SceneManager'
import { ToolManager } from '@engine/managers/ToolManager'
import { HistoryManager } from '@engine/managers/HistoryManager'
import { GameStateManager } from '@engine/managers/GameStateManager'
import { InputManager } from '@engine/managers/InputManager'
import { ZEventBus } from '@engine/core/ZEventBus'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { GhostSystem } from '@engine/systems/GhostSystem'
import { GridSystem } from '@engine/systems/GridSystem'
import { MessageSystem } from '@engine/systems/MessageSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { TextureManager } from '@engine/managers/TextureManager'
import ZLogger from '@engine/core/ZLogger'

export class ZEngine {
  public app: Application
  public services: ServiceLocator
  private lifecycle: SystemManager
  public mode: 'edit' | 'play' = 'edit'

  constructor() {
    this.app = new Application()
    this.services = new ServiceLocator()
    this.services.register(ZEngine.name, this)

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

    // TODO: Add devtools

    ZLogger.log('Hello 👋🏽 Everything is ready!')
  }

  public async setMode(mode: 'edit' | 'play'): Promise<void> {
    this.mode = mode
    this.lifecycle.setMode(mode)
    ZLogger.log(`Switched to ${mode} mode`)

    const entitySystem = this.services.get(EntityRenderSystem)
    const ghostSystem = this.services.get(GhostSystem)
    const gridSystem = this.services.get(GridSystem)
    const messageSystem = this.services.get(MessageSystem)

    if (mode === 'play') {
      await entitySystem?.setVisible(true)
      ghostSystem?.setVisible(false)
      gridSystem?.setVisible(false)
      messageSystem?.resize(this.app.screen.width, this.app.screen.height)
      this.services.get(PlayerSystem)?.onBoot()
    } else {
      await entitySystem?.setVisible(false)
      ghostSystem?.setVisible(true)
      gridSystem?.setVisible(true)
    }
  }

  public setDataProvider(provider: ZDataProvider): void {
    this.services.require(TextureManager).setDataProvider(provider)
    this.services.require(SceneManager).setDataProvider(provider)
    this.services.require(ToolManager).setDataProvider(provider)
    this.services.require(HistoryManager).setDataProvider(provider)
    this.services.require(GameStateManager).setDataProvider(provider)
    ZLogger.log('[ZEngine] Data Provider set')
  }

  public destroy(): void {
    this.services.require(InputManager).destroy()
    this.lifecycle.destroy()
    this.app.destroy({ removeView: true })
    ZLogger.log('Goodbye 👋🏽 Everything is gone!')
  }
}
