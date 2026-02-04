import { Game_Actor } from './Game_Actor'
import { ZActor } from '@engine/types'

/**
 * A repository for all actor instances in the game.
 * Ensures that each actor has a unique, persistent instance.
 */
export class Game_Actors {
  private _data: Map<number, Game_Actor> = new Map()

  /**
   * Retrieves an actor by ID. If it doesn't exist and data is provided, creates it.
   */
  public get(id: number, data?: ZActor): Game_Actor | null {
    if (!this._data.has(id)) {
      if (data) {
        this._data.set(id, new Game_Actor(data))
      } else {
        return null
      }
    }
    return this._data.get(id) || null
  }

  /**
   * Serializes all runtime actor data for saving.
   */
  public getSaveData(): any[] {
    const data: any[] = []
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
}
