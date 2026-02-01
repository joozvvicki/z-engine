import { Container, Application } from '@engine/utils/pixi'
import { ServiceLocator, ZEventBus } from '@engine/core'
import { InputManager } from '@engine/managers'

/**
 * ZScene is the base class for all game states (Title, Map, Battle, etc.)
 */
export abstract class ZScene {
  public container: Container
  protected services: ServiceLocator

  constructor(services: ServiceLocator) {
    this.services = services
    this.container = new Container()
  }

  protected get bus(): ZEventBus {
    return this.services.require(ZEventBus)
  }

  protected get input(): InputManager {
    return this.services.require(InputManager)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get engine(): any {
    return this.services.get('ZEngine')
  }

  protected get app(): Application {
    return this.engine.app
  }

  protected get mode(): 'edit' | 'play' {
    return this.engine.mode
  }

  /**
   * Called when the scene is requested to load.
   * Useful for async data fetching.
   * @param _params Scene-specific initialization data.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async init(_params?: unknown): Promise<void> {
    // Override if needed
  }

  /**
   * Called when the scene becomes active.
   */
  public abstract start(): void

  /**
   * Called every frame.
   * @param _delta Time since last frame in MS.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_delta: number): void {
    // Override if needed
  }

  /**
   * Called when the scene is about to be replaced.
   */
  public stop(): void {
    // Override if needed
  }

  /**
   * Final cleanup.
   */
  public destroy(): void {
    this.container.destroy({ children: false })
  }
}
