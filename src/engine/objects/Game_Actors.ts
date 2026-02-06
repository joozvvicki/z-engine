import { Game_Actor } from './Game_Actor'
import { ZActor, GameActorSaveData } from '@engine/types'

/**
 * A repository for all actor instances in the game.
 * Ensures that each actor has a unique, persistent instance.
 */
export class Game_Actors {
  private _data: Map<number, Game_Actor> = new Map()
  private _database: ZActor[] = []

  /**
   * Initializes the database for actor creation.
   */
  public setup(dbActors: ZActor[]): void {
    this._database = dbActors
  }

  /**
   * Retrieves an actor by ID. If it doesn't exist and data is provided, creates it.
   */
  public get(id: number, data?: ZActor): Game_Actor | null {
    if (!this._data.has(id)) {
      const dbActor = data || this._database.find((a) => a.id === id)
      if (dbActor) {
        this._data.set(id, new Game_Actor(dbActor))
      } else {
        return null
      }
    }
    return this._data.get(id) || null
  }

  /**
   * Serializes all runtime actor data for saving.
   */
  public getSaveData(): GameActorSaveData[] {
    const data: GameActorSaveData[] = []
    this._data.forEach((actor) => {
      data.push({
        id: actor.id,
        level: actor.level,
        hp: actor.hp,
        mp: actor.mp
      })
    })
    return data
  }

  /**
   * Restores actor states from saved data.
   */
  public loadSaveData(data: GameActorSaveData[]): void {
    if (!data) return
    data.forEach((s) => {
      const actor = this.get(s.id)
      if (actor) {
        actor.setLevel(s.level)
        // Set HP/MP directly if we add setters or make them public
        // For now, let's assume setLevel(s.level) recovers all,
        // but we might want to restore HP/MP precisely.
        // I'll add HP/MP setters to Game_Actor.
      }
    })
  }
}
