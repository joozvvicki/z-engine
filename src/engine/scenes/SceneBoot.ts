import ZLogger from '@engine/utils/ZLogger'
import { ZScene, ServiceLocator } from '@engine/core'
import { SceneManager } from '@engine/managers'
import { SceneTitle } from '@engine/scenes'

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
