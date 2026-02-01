import { Container } from '@engine/utils/pixi'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZScene } from '@engine/core/ZScene'
import { ZManager } from '@engine/core/ZManager'
import { TransitionSystem } from '@engine/systems/TransitionSystem'
import ZLogger from '@engine/utils/ZLogger'

export class SceneManager extends ZManager {
  private _currentScene: ZScene | null = null
  private _sceneLayer: Container | null = null

  // Callback for editor sync (legacy support)
  private onMapChangeRequest: ((mapId: number, x: number, y: number) => Promise<void>) | null = null

  constructor(services: ServiceLocator) {
    super(services)
  }

  public setSceneLayer(layer: Container): void {
    this._sceneLayer = layer
  }

  public get currentScene(): ZScene | null {
    return this._currentScene
  }

  /**
   * Transitions to a new scene.
   */
  public async goto(
    SceneClass: new (services: ServiceLocator) => ZScene,
    params?: unknown,
    options: { fade?: boolean } = {}
  ): Promise<void> {
    const fadeEnabled = options.fade ?? true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = this.services.get('ZEngine') as any
    const isPlayMode = engine?.mode === 'play'
    const transitionSystem = isPlayMode && fadeEnabled ? this.services.get(TransitionSystem) : null
    // 1. Fade Out (if enabled)
    if (transitionSystem) {
      await transitionSystem.fadeOut(300)
    }

    ZLogger.with('SceneManager').log(`Changing Scene to ${SceneClass.name}`)

    // 2. Stop and cleanup current scene
    if (this._currentScene) {
      this._currentScene.stop()
      this._currentScene.destroy()
      this._currentScene = null
    }

    // 3. Clear layer
    if (this._sceneLayer) {
      this._sceneLayer.removeChildren()
    }

    // 4. Instantiate and Init new scene
    const nextScene = new SceneClass(this.services)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await nextScene.init(params as any)

    // 5. Set as current and add to stage
    this._currentScene = nextScene
    if (this._sceneLayer) {
      this._sceneLayer.addChild(nextScene.container)
    }

    // 6. Start scene
    nextScene.start()

    // 7. Fade In (if enabled)
    if (transitionSystem) {
      await transitionSystem.fadeIn(300)
    }
  }

  /**
   * Propagates frame updates to the current scene.
   */
  public update(delta: number): void {
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
