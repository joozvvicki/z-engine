/* eslint-disable @typescript-eslint/no-unused-vars */
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZEventBus } from '@engine/core/ZEventBus'
import { MapManager } from '@engine/managers/MapManager'
import { InputManager } from '@engine/managers/InputManager'
import { TextureManager } from '@engine/managers/TextureManager'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { GameStateManager } from '@engine/managers/GameStateManager'

export enum SystemMode {
  ALWAYS = 'always',
  PLAY = 'play',
  EDIT = 'edit'
}

export abstract class ZSystem {
  protected services: ServiceLocator
  public updateMode: SystemMode = SystemMode.ALWAYS

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
