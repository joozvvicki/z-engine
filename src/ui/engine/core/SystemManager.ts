import { Application } from '../utils/pixi'
import { ServiceLocator } from './ServiceLocator'
import { ZSystem, SystemMode } from './ZSystem'
import ZLogger from './ZLogger'

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
    // 1. Cache all systems
    this.systems = this.services.getAllInstances(ZSystem)

    // 2. Boot all systems
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
    // Optimized loop (no allocation)
    for (let i = 0; i < this.systems.length; i++) {
      const system = this.systems[i]

      // Filter by mode
      if (this.shouldUpdate(system)) {
        system.onPreUpdate(delta)
        system.onUpdate(delta)
        system.onPostUpdate(delta)
      }
    }
  }

  private shouldUpdate(system: ZSystem): boolean {
    if (system.updateMode === SystemMode.ALWAYS) return true

    if (this.mode === 'play') {
      return system.updateMode === SystemMode.PLAY
    } else {
      // Edit mode
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
