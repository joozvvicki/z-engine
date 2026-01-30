import { Application } from '../utils/pixi'
import { ServiceLocator } from './ServiceLocator'
import { ZSystem } from './ZSystem'
import ZLogger from './ZLogger'
import { PlayerSystem } from '../systems/PlayerSystem'
import { EntityRenderSystem } from '../systems/EntityRenderSystem'
import { GhostSystem } from '../systems/GhostSystem'

export class SystemManager {
  private services: ServiceLocator
  private app: Application
  private mode: 'edit' | 'play' = 'edit'

  constructor(services: ServiceLocator, app: Application) {
    this.services = services
    this.app = app
  }

  public boot(): void {
    this.services.getAllInstances(ZSystem).forEach((system) => {
      system.onBoot()
      ZLogger.with(system.constructor.name).info("I'm ready!")
    })
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS))
  }

  public setMode(mode: 'edit' | 'play'): void {
    this.mode = mode
  }

  private tick(delta: number): void {
    this.services.getAllInstances(ZSystem).forEach((system) => {
      // Logic for filtering systems based on mode
      if (this.mode === 'edit') {
        if (system instanceof PlayerSystem || system instanceof EntityRenderSystem) return
      } else {
        if (system instanceof GhostSystem) return
      }

      system.onPreUpdate(delta)
      system.onUpdate(delta)
      system.onPostUpdate(delta)
    })
  }

  public destroy(): void {
    this.services.getAllInstances(ZSystem).forEach((s) => {
      s.onDestroy()
      ZLogger.with(s.constructor.name).info("I'm leaving!")
    })
  }
}
