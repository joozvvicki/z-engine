import ZLogger from '@engine/utils/ZLogger'
import { ZEngineSignal } from '@engine/types'
import { Game_Party } from '@engine/objects/Game_Party'
import { Game_Actors } from '@engine/objects/Game_Actors'
import { ZEventBus } from '@engine/core'

/**
 * Interface representing the state of a saved game.
 */
export interface GameSaveData {
  switches: Record<number, boolean>
  variables: Record<number, number>
  selfSwitches: Record<string, boolean>
  party: import('@engine/types').GamePartySaveData
  actors: import('@engine/types').GameActorSaveData[]
}

/**
 * Manages the global game state, including switches, variables, and the party.
 */
export class GameStateManager {
  private bus: ZEventBus

  // Runtime State (Switches, Variables, Self Switches)
  private switches: Map<number, boolean> = new Map()
  private variables: Map<number, number> = new Map()
  private selfSwitches: Map<string, boolean> = new Map()

  private _party: Game_Party = new Game_Party()
  private _actors: Game_Actors = new Game_Actors()

  constructor(bus: ZEventBus) {
    this.bus = bus
  }

  public get party(): Game_Party {
    return this._party
  }
  public get actors(): Game_Actors {
    return this._actors
  }

  /**
   * Initializes the game state with database data.
   */
  public setup(systemData: import('@engine/types').ZSystemData): void {
    this._actors.setup(systemData.actors || [])

    // Initial party setup if we are starting a NEW game,
    // but scenes usually call newGame() which will handle this.
  }

  /**
   * Initializes default data for a new game session.
   */
  public initDefaultData(startingParty: number[] = []): void {
    // Clear runtime party members but KEEP the instances and their database links
    this._party.clear()

    startingParty.forEach((actorId) => {
      const actor = this._actors.get(actorId)
      if (actor) this._party.addActor(actor)
    })
  }

  // --- Switches ---

  public getSwitch(id: number): boolean {
    return this.switches.get(id) ?? false
  }

  public setSwitch(id: number, value: boolean): void {
    const current = this.getSwitch(id)
    if (current !== value) {
      this.switches.set(id, value)
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

  /**
   * Captures the current state for storage.
   */
  public getSaveData(): GameSaveData {
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
      party: this._party.getSaveData(),
      actors: this._actors.getSaveData()
    }
  }

  /**
   * Restores state from saved data.
   */
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

    // Restore Actors & Party
    this._actors.loadSaveData(data.actors)
    this._party.loadSaveData(data.party, this._actors)

    this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'load' })
    ZLogger.with('GameStateManager').info('Game Data Loaded')
  }

  /**
   * Resets all data for a new game.
   */
  public newGame(startingParty: number[] = []): void {
    this.switches.clear()
    this.variables.clear()
    this.selfSwitches.clear()
    this.initDefaultData(startingParty)
    this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'new' })
  }
}
