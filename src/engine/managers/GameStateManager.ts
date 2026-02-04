import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZManager } from '@engine/core/ZManager'
import ZLogger from '@engine/utils/ZLogger'
import { ZEngineSignal, ZActor } from '@engine/types'
import { Game_Party } from '@engine/objects/Game_Party'
import { Game_Actors } from '@engine/objects/Game_Actors'

/**
 * Interface representing the state of a saved game.
 */
export interface GameSaveData {
  switches: Record<number, boolean>
  variables: Record<number, number>
  selfSwitches: Record<string, boolean>
  party: unknown // Serialized Game_Party
  actors: unknown[] // Serialized Game_Actors
}

/**
 * Manages the global game state, including switches, variables, and the party.
 */
export class GameStateManager extends ZManager {
  // Runtime State (Switches, Variables, Self Switches)
  private switches: Map<number, boolean> = new Map()
  private variables: Map<number, number> = new Map()
  private selfSwitches: Map<string, boolean> = new Map()

  private _party: Game_Party = new Game_Party()
  private _actors: Game_Actors = new Game_Actors()

  constructor(services: ServiceLocator) {
    super(services)
    this.initDefaultData()
  }

  public get party(): Game_Party {
    return this._party
  }
  public get actors(): Game_Actors {
    return this._actors
  }

  /**
   * Initializes default data for a new game session.
   */
  private initDefaultData(): void {
    // Basic Hero initialization
    const hero = this._actors.get(1, {
      id: 1,
      name: 'Hero',
      nickname: 'Bravery',
      classId: 1,
      initialLevel: 1,
      maxLevel: 99,
      profile: 'A brave warrior.',
      face: 'img/faces/Actor1.png',
      faceX: 0,
      faceY: 0,
      character: 'img/characters/character.png',
      characterX: 0,
      characterY: 0,
      baseParams: [450, 100, 12, 10, 8, 8, 10, 10]
    } as ZActor)
    if (hero) this._party.addActor(hero)
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

    // TODO: Implement deep loading for Party/Actors

    this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'load' })
    ZLogger.with('GameStateManager').info('Game Data Loaded')
  }

  /**
   * Resets all data for a new game.
   */
  public newGame(): void {
    this.switches.clear()
    this.variables.clear()
    this.selfSwitches.clear()
    this._party = new Game_Party()
    this._actors = new Game_Actors()
    this.initDefaultData()
    this.bus.emit(ZEngineSignal.GameStateChanged, { type: 'new' })
  }
}
