import { Container } from '@engine/utils/pixi'
import { IEngineContext } from '@engine/types'

/**
 * ZScene is the base class for all game states (Title, Map, Battle, etc.)
 */
export abstract class ZScene {
  public container: Container

  protected engine: IEngineContext

  constructor(engine: IEngineContext) {
    this.engine = engine
    this.container = new Container()
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
