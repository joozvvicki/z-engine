import ZLogger from '@engine/utils/ZLogger'
import { ZScene } from '@engine/core/ZScene'
import { SceneTitle } from '@engine/scenes/SceneTitle'
import { IEngineContext } from '@engine/types'

export class SceneBoot extends ZScene {
  constructor(engine: IEngineContext) {
    super(engine)
  }

  public async init(): Promise<void> {
    ZLogger.with('SceneBoot').info('Heartbeat... OK')
  }

  public start(): void {
    ZLogger.with('SceneBoot').log('Bootstrapping complete')
    // Teraz mamy bezpośredni, typowany dostęp do managera scen w kontekście silnika
    this.engine.scenes.goto(SceneTitle)
  }
}
