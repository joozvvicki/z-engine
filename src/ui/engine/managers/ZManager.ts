import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZDataProvider } from '@engine/types'
import { MapManager } from './MapManager'
import { TextureManager } from './TextureManager'
import { TilesetManager } from './TilesetManager'
import { InputManager } from './InputManager'
import { ZEventBus } from '../core/ZEventBus'

export abstract class ZManager {
  protected services: ServiceLocator
  protected dataProvider: ZDataProvider | null = null

  constructor(services: ServiceLocator) {
    this.services = services
  }

  protected get map(): MapManager {
    return this.services.require(MapManager)
  }

  protected get textures(): TextureManager {
    return this.services.require(TextureManager)
  }

  protected get tilesets(): TilesetManager {
    return this.services.require(TilesetManager)
  }

  protected get input(): InputManager {
    return this.services.require(InputManager)
  }

  protected get bus(): ZEventBus {
    return this.services.require(ZEventBus)
  }

  public setDataProvider(provider: ZDataProvider): void {
    this.dataProvider = provider
  }
}
