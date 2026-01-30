import { ZEngineSignal } from '@engine/types'
import { ZManager } from './ZManager'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import ZLogger from '@engine/core/ZLogger'

export interface GameSaveData {
  switches: Record<number, boolean>
  variables: Record<number, number>
  party: {
    // Placeholder for party members
    members: string[]
  }
}

export class GameStateManager extends ZManager {
  // Runtime State
  private switches: Map<number, boolean> = new Map()
  private variables: Map<number, number> = new Map()

  constructor(services: ServiceLocator) {
    super(services)
  }

  // --- Switches ---

  public getSwitch(id: number): boolean {
    return this.switches.get(id) ?? false
  }

  public setSwitch(id: number, value: boolean): void {
    const current = this.getSwitch(id)
    if (current !== value) {
      this.switches.set(id, value)
      // Emit generic state change signal
      // Listeners (like Active Page in EventSystem) will need to check this
      this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'switch', id, value })
      ZLogger.with('GameStateManager').info(`Switch ${id} set to ${value}`)
    }
  }

  public toggleSwitch(id: number): void {
    this.setSwitch(id, !this.getSwitch(id))
  }

  // --- Variables ---

  public getVariable(id: number): number {
    return this.variables.get(id) ?? 0
  }

  public setVariable(id: number, value: number): void {
    const current = this.getVariable(id)
    if (current !== value) {
      this.variables.set(id, value)
      this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'variable', id, value })
      ZLogger.with('GameStateManager').info(`Variable ${id} set to ${value}`)
    }
  }

  public addVariable(id: number, value: number): void {
    const current = this.getVariable(id)
    this.setVariable(id, current + value)
  }

  // --- Persistence ---

  public getSaveData(): GameSaveData {
    // Convert Maps to Objects for JSON serialization
    const switchesObj: Record<number, boolean> = {}
    this.switches.forEach((val, key) => (switchesObj[key] = val))

    const variablesObj: Record<number, number> = {}
    this.variables.forEach((val, key) => (variablesObj[key] = val))

    return {
      switches: switchesObj,
      variables: variablesObj,
      party: { members: [] }
    }
  }

  public loadSaveData(data: GameSaveData): void {
    this.switches.clear()
    this.variables.clear()

    if (data.switches) {
      Object.entries(data.switches).forEach(([id, val]) => {
        this.switches.set(Number(id), val)
      })
    }

    if (data.variables) {
      Object.entries(data.variables).forEach(([id, val]) => {
        this.variables.set(Number(id), val)
      })
    }

    // Initial emit after load
    this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'load' })
    ZLogger.with('GameStateManager').info('Game Data Loaded')
  }

  public newGame(): void {
    this.switches.clear()
    this.variables.clear()
    this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'new' })
  }
}
