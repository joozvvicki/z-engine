import { Game_Actor } from './Game_Actor'
import { Game_Actors } from './Game_Actors'
import { GamePartySaveData } from '@engine/types'

/**
 * Manages the player's party members and global state like Gold.
 */
export class Game_Party {
  private _actors: Game_Actor[] = []
  private _gold: number = 0

  public get members(): Game_Actor[] {
    return this._actors
  }
  public get gold(): number {
    return this._gold
  }

  /**
   * Adds an actor to the party if they are not already present.
   */
  public addActor(actor: Game_Actor): void {
    if (!this._actors.find((a) => a.id === actor.id)) {
      this._actors.push(actor)
    }
  }

  /**
   * Removes all actors from the party.
   */
  public clear(): void {
    this._actors = []
    this._gold = 0
  }

  /**
   * Removes an actor from the party by ID.
   */
  public removeActor(actorId: number): void {
    this._actors = this._actors.filter((a) => a.id !== actorId)
  }

  /**
   * Returns the first member of the party.
   */
  public leader(): Game_Actor | null {
    return this._actors[0] || null
  }

  /**
   * Modifies the amount of gold held by the party.
   */
  public gainGold(amount: number): void {
    this._gold = Math.max(0, this._gold + amount)
  }

  /**
   * Serializes the party state for saving.
   */
  public getSaveData(): GamePartySaveData {
    return {
      actors: this._actors.map((a) => a.id),
      gold: this._gold
    }
  }

  /**
   * Restores the party state from saved data.
   */
  public loadSaveData(data: GamePartySaveData, actors: Game_Actors): void {
    if (!data) return
    this._gold = data.gold
    this._actors = []
    data.actors.forEach((id) => {
      const actor = actors.get(id)
      if (actor) {
        this._actors.push(actor)
      }
    })
  }
}
