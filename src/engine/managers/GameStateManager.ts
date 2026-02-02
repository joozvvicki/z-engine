import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZManager } from '@engine/core/ZManager'
import ZLogger from '@engine/utils/ZLogger'
import { ZEngineSignal } from '@engine/types'

export interface GameSaveData {
  switches: Record<number, boolean>
  variables: Record<number, number>
  selfSwitches: Record<string, boolean>
  party: {
    // Placeholder for party members
    members: string[]
  }
}

export class GameStateManager extends ZManager {
  // Runtime State
  private switches: Map<number, boolean> = new Map()
  private variables: Map<number, number> = new Map()
  private selfSwitches: Map<string, boolean> = new Map()

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

  // --- Self Switches ---

  public getSelfSwitch(mapId: number, eventId: string | number, ch: string): boolean {
    const key = `${mapId}:${eventId}:${ch}`
    return this.selfSwitches.get(key) ?? false
  }

  public setSelfSwitch(mapId: number, eventId: string | number, ch: string, value: boolean): void {
    const key = `${mapId}:${eventId}:${ch}`
    const current = this.getSelfSwitch(mapId, eventId, ch)
    if (current !== value) {
      this.selfSwitches.set(key, value)
      this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'switch', value })
      ZLogger.with('GameStateManager').info(`Self Switch ${key} set to ${value}`)
    }
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

    const selfSwitchesObj: Record<string, boolean> = {}
    this.selfSwitches.forEach((val, key) => (selfSwitchesObj[key] = val))

    return {
      switches: switchesObj,
      variables: variablesObj,
      selfSwitches: selfSwitchesObj,
      party: { members: [] }
    }
  }

  public loadSaveData(data: GameSaveData): void {
    this.switches.clear()
    this.variables.clear()
    this.selfSwitches.clear()

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

    if (data.selfSwitches) {
      Object.entries(data.selfSwitches).forEach(([key, val]) => {
        this.selfSwitches.set(key, val)
      })
    }

    // Initial emit after load
    this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'load' })
    ZLogger.with('GameStateManager').info('Game Data Loaded')
  }

  public newGame(): void {
    this.switches.clear()
    this.variables.clear()
    this.selfSwitches.clear()
    this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'new' })
  }
}
