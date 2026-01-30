import { ServiceLocator } from './ServiceLocator'
import { MapManager } from '../managers/MapManager'
import { InputManager } from '../managers/InputManager'
import { TextureManager } from '../managers/TextureManager'
import { TilesetManager } from '../managers/TilesetManager'
import { GameStateManager } from '../managers/GameStateManager'
import { ZEventBus } from './ZEventBus'

export abstract class ZSystem {
  protected services: ServiceLocator

  constructor(services: ServiceLocator) {
    this.services = services
  }

  // Lifecycle methods
  onBoot(): void {
    /* Boot */
  }
  onSetup(): void {
    /* Setup */
  }
  onPreUpdate(_delta: number): void {
    /* Pre Update */
  }
  onUpdate(_delta: number): void {
    /* Update */
  }
  onPostUpdate(_delta: number): void {
    /* Post Update */
  }
  onDestroy(): void {
    /* Destroy */
  }

  // Manager Getters
  protected get map(): MapManager {
    return this.services.require(MapManager)
  }
  protected get input(): InputManager {
    return this.services.require(InputManager)
  }
  protected get textures(): TextureManager {
    return this.services.require(TextureManager)
  }
  protected get tilesets(): TilesetManager {
    return this.services.require(TilesetManager)
  }
  protected get game(): GameStateManager {
    return this.services.require(GameStateManager)
  }
  protected get bus(): ZEventBus {
    return this.services.require(ZEventBus)
  }
}
