import { ZScene } from '@engine/core/ZScene'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import ZLogger from '@engine/core/ZLogger'
import { SceneManager } from '@engine/managers/SceneManager'
import { Scene_Title } from '@engine/scenes/Scene_Title'

export class Scene_Boot extends ZScene {
  constructor(services: ServiceLocator) {
    super(services)
  }

  public async init(): Promise<void> {
    ZLogger.log('[Scene_Boot] Heartbeat... OK')
  }

  public start(): void {
    ZLogger.log('[Scene_Boot] Bootstrapping complete')
    // Transition to title after a brief delay or immediately
    this.services.require(SceneManager).goto(Scene_Title)
  }
}
