import { Container } from '@engine/utils/pixi'
import { ZScene } from '@engine/core/ZScene'
import { TransitionSystem } from '@engine/systems/TransitionSystem'
import { ZEngineSignal, IEngineContext } from '@engine/types'
import ZLogger from '@engine/utils/ZLogger'

export type SceneConstructor = new (engine: IEngineContext) => ZScene

export class SceneManager {
  private engine: IEngineContext

  private _currentScene: ZScene | null = null
  private _sceneLayer: Container | null = null
  private _sceneStack: ZScene[] = []
  private _skipNextUpdate: boolean = false
  private _isTransitioning: boolean = false

  // Callback for editor sync (legacy support)
  private onMapChangeRequest: ((mapId: number, x: number, y: number) => Promise<void>) | null = null

  constructor(engine: IEngineContext) {
    this.engine = engine
  }

  public get isTransitioning(): boolean {
    return this._isTransitioning
  }

  public setSceneLayer(layer: Container): void {
    this._sceneLayer = layer
  }

  public get currentScene(): ZScene | null {
    return this._currentScene
  }

  /**
   * Helper: Sprawdza czy należy uruchomić tranzycję.
   * Dostęp bezpośredni przez this.engine, bez ServiceLocatora.
   */
  private getTransitionSystem(options: { fade?: boolean }): TransitionSystem | null {
    const fadeEnabled = options.fade ?? true
    if (!fadeEnabled) return null

    const isPlayMode = this.engine.config.mode === 'play'

    if (isPlayMode) {
      return this.engine.transitions
    }
    return null
  }

  /**
   * Transitions to a new scene.
   */
  public async goto(
    SceneClass: SceneConstructor,
    params?: unknown,
    options: { fade?: boolean } = {}
  ): Promise<void> {
    this._isTransitioning = true
    try {
      const transitionSystem = this.getTransitionSystem(options)

      // 1. Fade Out
      if (transitionSystem) {
        this.engine.eventBus.emit(ZEngineSignal.SceneTransitionStarted, {})
        await transitionSystem.fadeOut(300)
      }

      ZLogger.with('SceneManager').log(`Changing Scene to ${SceneClass.name}`)

      // 2. Cleanup old scene
      if (this._currentScene) {
        this._currentScene.stop()
        this._currentScene.destroy()
        this._currentScene = null
      }

      // 2.5 Clear Stack on goto
      while (this._sceneStack.length > 0) {
        const scene = this._sceneStack.pop()
        scene?.destroy()
      }

      // 3. Clear layer
      if (this._sceneLayer) {
        this._sceneLayer.removeChildren()
      }

      // 4. Instantiate and Init new scene
      // Przekazujemy kontekst silnika (Manual DI)
      const nextScene = new SceneClass(this.engine)
      await nextScene.init(params)

      // 5. Mount
      this._currentScene = nextScene
      if (this._sceneLayer) {
        this._sceneLayer.addChild(nextScene.container)
      }

      // 6. Start
      nextScene.start()

      // 7. Fade In
      if (transitionSystem) {
        await transitionSystem.fadeIn(300)
        this.engine.eventBus.emit(ZEngineSignal.SceneTransitionFinished, {})
      }
    } finally {
      this._isTransitioning = false
    }
  }

  /**
   * Pushes a new scene onto the stack.
   */
  public async push(
    SceneClass: SceneConstructor,
    params?: unknown,
    options: { fade?: boolean } = {}
  ): Promise<void> {
    this._isTransitioning = true
    try {
      const transitionSystem = this.getTransitionSystem(options)

      // 1. Fade Out
      if (transitionSystem) {
        this.engine.eventBus.emit(ZEngineSignal.SceneTransitionStarted, {})
        await transitionSystem.fadeOut(150)
      }

      ZLogger.with('SceneManager').log(`Pushing Scene ${SceneClass.name}`)

      // 2. Stop current scene and move to stack
      if (this._currentScene) {
        this._currentScene.stop()
        this._sceneStack.push(this._currentScene)
        if (this._sceneLayer) {
          this._sceneLayer.removeChild(this._currentScene.container)
        }
      }

      // 3. Instantiate and Init new scene
      const nextScene = new SceneClass(this.engine)
      await nextScene.init(params)

      // 4. Set as current and mount
      this._currentScene = nextScene
      if (this._sceneLayer) {
        this._sceneLayer.addChild(nextScene.container)
      }

      // 5. Start
      nextScene.start()

      // 6. Fade In
      if (transitionSystem) {
        await transitionSystem.fadeIn(150)
        this.engine.eventBus.emit(ZEngineSignal.SceneTransitionFinished, {})
      }

      this._skipNextUpdate = true
    } finally {
      this._isTransitioning = false
    }
  }

  /**
   * Pops the current scene from the stack.
   */
  public async pop(options: { fade?: boolean } = {}): Promise<void> {
    if (this._sceneStack.length === 0) {
      ZLogger.with('SceneManager').warn('Cannot pop scene: Stack is empty')
      return
    }

    this._isTransitioning = true
    try {
      const transitionSystem = this.getTransitionSystem(options)

      // 1. Fade Out
      if (transitionSystem) {
        this.engine.eventBus.emit(ZEngineSignal.SceneTransitionStarted, {})
        await transitionSystem.fadeOut(150)
      }

      ZLogger.with('SceneManager').log('Popping Scene')

      // 2. Destroy current scene
      if (this._currentScene) {
        this._currentScene.stop()
        if (this._sceneLayer) {
          this._sceneLayer.removeChild(this._currentScene.container)
        }
        this._currentScene.destroy()
        this._currentScene = null
      }

      // 3. Restore previous scene
      const prevScene = this._sceneStack.pop()
      if (prevScene) {
        this._currentScene = prevScene
        if (this._sceneLayer) {
          this._sceneLayer.addChild(prevScene.container)
        }
        // Resume scene
        prevScene.start()
      }

      // 4. Fade In
      if (transitionSystem) {
        await transitionSystem.fadeIn(150)
        this.engine.eventBus.emit(ZEngineSignal.SceneTransitionFinished, {})
      }

      if (this._sceneStack.length === 0) {
        this.engine.eventBus.emit(ZEngineSignal.MenuClosed, {})
      }

      this._skipNextUpdate = true
    } finally {
      this._isTransitioning = false
    }
  }

  /**
   * Propagates frame updates to the current scene.
   */
  public update(delta: number): void {
    if (this._skipNextUpdate) {
      this._skipNextUpdate = false
      return
    }
    if (this._currentScene) {
      this._currentScene.update(delta)
    }
  }

  // --- Legacy / Editor Support ---

  public setMapChangeCallback(
    callback: (mapId: number, x: number, y: number) => Promise<void>
  ): void {
    this.onMapChangeRequest = callback
  }

  public async requestMapChange(mapId: number, x: number, y: number): Promise<void> {
    if (this.onMapChangeRequest) {
      await this.onMapChangeRequest(mapId, x, y)
    } else {
      ZLogger.with('SceneManager').warn('onMapChangeRequest not set')
    }
  }
}
