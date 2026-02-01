import ZLogger from '@engine/utils/ZLogger'
import { ZScene } from '@engine/core/ZScene'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SceneManager } from '@engine/managers/SceneManager'
import { SceneTitle } from '@engine/scenes/SceneTitle'

export class SceneBoot extends ZScene {
  constructor(services: ServiceLocator) {
    super(services)
  }

  public async init(): Promise<void> {
    ZLogger.with('SceneBoot').info('Heartbeat... OK')
  }

  public start(): void {
    ZLogger.with('SceneBoot').log('Bootstrapping complete')
    this.services.require(SceneManager).goto(SceneTitle)
  }
}
