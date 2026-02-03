import { Application, Container } from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SystemManager } from '@engine/core/SystemManager'
import { EngineBootstrapper } from '@engine/core/EngineBootstrapper'
import { ZEventBus } from '@engine/core/ZEventBus'
import { ZDataProvider, ZSystemData } from '@engine/types'
import { SceneManager } from '@engine/managers/SceneManager'
import { ToolManager } from '@engine/managers/ToolManager'
import { HistoryManager } from '@engine/managers/HistoryManager'
import { GameStateManager } from '@engine/managers/GameStateManager'
import { InputManager } from '@engine/managers/InputManager'
import { TextureManager } from '@engine/managers/TextureManager'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { GhostSystem } from '@engine/systems/GhostSystem'
import { GridSystem } from '@engine/systems/GridSystem'
import { MessageSystem } from '@engine/systems/MessageSystem'
import { TransitionSystem } from '@engine/systems/TransitionSystem'
import { ErrorSystem } from '@engine/systems/ErrorSystem'

export class ZEngine {
  public app: Application
  public services: ServiceLocator
  public dataProvider: ZDataProvider | null = null
  public systemData: ZSystemData | null = null
  private lifecycle: SystemManager
  public mode: 'edit' | 'play' = 'edit'
  private isBooted: boolean = false

  private sceneLayer: Container
  private globalLayer: Container

  constructor() {
    this.app = new Application()
    this.services = new ServiceLocator()
    this.services.register('ZEngine', this)

    this.sceneLayer = new Container()
    this.sceneLayer.label = 'SceneLayer'
    this.globalLayer = new Container()
    this.globalLayer.label = 'GlobalLayer'

    EngineBootstrapper.registerManagers(this.services)
    this.lifecycle = new SystemManager(this.services, this.app)
  }

  public get eventBus(): ZEventBus {
    return this.services.require(ZEventBus)
  }

  public async init(container: HTMLElement, tileSize: number): Promise<void> {
    await this.app.init({
      backgroundColor: 0x000000,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      eventMode: 'static',
      antialias: false
    })
    this.app.canvas.tabIndex = 1
    this.app.canvas.style.outline = 'none'
    this.app.canvas.addEventListener('mouseenter', () => this.app.canvas.focus())
    container.appendChild(this.app.canvas)

    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.sortableChildren = true

    this.app.stage.addChild(this.sceneLayer)
    this.app.stage.addChild(this.globalLayer)

    try {
      EngineBootstrapper.registerSystems(
        this.services,
        this.sceneLayer,
        tileSize,
        this.app.screen.width,
        this.app.screen.height
      )

      // Override stage for global systems
      const transitionSystem = this.services.get(TransitionSystem)
      const messageSystem = this.services.get(MessageSystem)
      const errorSystem = this.services.get(ErrorSystem)

      if (transitionSystem) {
        this.globalLayer.addChild(transitionSystem.container)
      }
      if (messageSystem) {
        this.globalLayer.addChild(messageSystem.container)
      }
      if (errorSystem) {
        this.globalLayer.addChild(errorSystem.container)
      }

      this.services.require(SceneManager).setSceneLayer(this.sceneLayer)

      this.lifecycle.boot()
      this.isBooted = true

      ZLogger.log('Hello 👋🏽 Everything is ready!')
    } catch (e) {
      ZLogger.error('Error during init:', e)
      this.services.get(ErrorSystem)?.show(e as Error)
    }
  }

  public async setMode(mode: 'edit' | 'play'): Promise<void> {
    try {
      this.mode = mode
      this.lifecycle.setMode(mode)
      ZLogger.log(`Switched to ${mode} mode`)

      if (mode === 'play') {
        ZLogger.log('Entering Play Mode...')
      } else {
        ZLogger.log('Entering Edit Mode...')
      }

      const entitySystem = this.services.get(EntityRenderSystem)
      const ghostSystem = this.services.get(GhostSystem)
      const gridSystem = this.services.get(GridSystem)
      const messageSystem = this.services.get(MessageSystem)

      if (mode === 'play') {
        entitySystem?.setVisible(true)
        ghostSystem?.setVisible(false)
        gridSystem?.setVisible(false)
        messageSystem?.resize(this.app.screen.width, this.app.screen.height)
      } else {
        entitySystem?.setVisible(false)
        ghostSystem?.setVisible(true)
        gridSystem?.setVisible(true)
      }
    } catch (e) {
      ZLogger.error('Error during setMode:', e)
      this.services.get(ErrorSystem)?.show(e as Error)
    }
  }

  public setDataProvider(provider: ZDataProvider): void {
    this.dataProvider = provider
    this.services.require(TextureManager).setDataProvider(provider)
    this.services.require(SceneManager).setDataProvider(provider)
    this.services.require(ToolManager).setDataProvider(provider)
    this.services.require(HistoryManager).setDataProvider(provider)
    this.services.require(GameStateManager).setDataProvider(provider)
    ZLogger.info('Data Provider set')
  }

  public setSystemData(data: ZSystemData): void {
    this.systemData = data
    ZLogger.info('System Data set')
  }

  public resize(width: number, height: number): void {
    try {
      ZLogger.info(`Resizing to ${width}x${height}`)
      const transitionSystem = this.services.get(TransitionSystem)
      const messageSystem = this.services.get(MessageSystem)
      const errorSystem = this.services.get(ErrorSystem)

      // Notify systems
      transitionSystem?.resize(width, height)
      messageSystem?.resize(width, height)
      errorSystem?.resize(width, height)

      // Update PIXI internals
      this.app.renderer.resize(width, height)
      this.app.stage.hitArea = this.app.screen

      ZLogger.info(`Resized to ${width}x${height}`)
    } catch (e) {
      this.services.get(ErrorSystem)?.show(e as Error)
    }
  }

  public destroy(): void {
    if (!this.isBooted) return
    this.services.require(InputManager).destroy()
    this.lifecycle.destroy()
    this.app.destroy({ removeView: true })
    ZLogger.log('Goodbye 👋🏽 Everything is gone!')
  }
}
