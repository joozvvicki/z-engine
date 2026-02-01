import { Application } from '@engine/utils/pixi'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { SceneManager } from '@engine/managers/SceneManager'
import { InputManager } from '@engine/managers/InputManager'
import ZLogger from '@engine/core/ZLogger'

export class SystemManager {
  private services: ServiceLocator
  private app: Application
  private mode: 'edit' | 'play' = 'edit'
  private systems: ZSystem[] = []

  constructor(services: ServiceLocator, app: Application) {
    this.services = services
    this.app = app
  }

  public boot(): void {
    this.systems = this.services.getAllInstances(ZSystem)

    this.systems.forEach((system) => {
      system.onBoot()
      ZLogger.with(system.constructor.name).info("I'm ready!")
    })

    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS))
  }

  public setMode(mode: 'edit' | 'play'): void {
    this.mode = mode
  }

  private tick(delta: number): void {
    // 1. Update Systems
    for (let i = 0; i < this.systems.length; i++) {
      const system = this.systems[i]

      if (this.shouldUpdate(system)) {
        system.onPreUpdate(delta)
        system.onUpdate(delta)
        system.onPostUpdate(delta)
      }
    }

    // 2. Update Current Scene
    this.services.get(SceneManager)?.update(delta)

    // 3. Update Input (Record state for NEXT frame)
    this.services.require(InputManager).update()
  }

  private shouldUpdate(system: ZSystem): boolean {
    if (system.updateMode === SystemMode.ALWAYS) return true

    if (this.mode === 'play') {
      return system.updateMode === SystemMode.PLAY
    } else {
      return system.updateMode === SystemMode.EDIT
    }
  }

  public destroy(): void {
    this.systems.forEach((s) => {
      s.onDestroy()
      ZLogger.with(s.constructor.name).info("I'm leaving!")
    })
    this.systems = []
  }
}
