import { ZActor } from '@engine/types'

/**
 * Represents a single actor (hero/party member) in the game.
 * Stores runtime state like HP, MP, Level, and Equipment.
 */
export class Game_Actor {
  private _data: ZActor
  private _level: number = 1
  private _hp: number = 0
  private _mp: number = 0

  constructor(data: ZActor) {
    this._data = data
    this._level = data.initialLevel || 1
    this.recoverAll()
  }

  public get id(): number {
    return this._data.id
  }
  public get name(): string {
    return this._data.name
  }
  public get level(): number {
    return this._level
  }

  public get mhp(): number {
    return this.param(0)
  }
  public get mmp(): number {
    return this.param(1)
  }
  public get atk(): number {
    return this.param(2)
  }
  public get def(): number {
    return this.param(3)
  }

  public get hp(): number {
    return this._hp
  }
  public get mp(): number {
    return this._mp
  }

  /**
   * Returns the value of a parameter (0: MHP, 1: MMP, 2: ATK, 3: DEF, etc.)
   * @param id The parameter index.
   */
  public param(id: number): number {
    const base = this._data.baseParams?.[id] || 10
    // Simple growth formula for now
    return base + (this._level - 1) * 5
  }

  public recoverAll(): void {
    this._hp = this.mhp
    this._mp = this.mmp
  }

  public setLevel(level: number): void {
    this._level = level
    this.recoverAll()
  }

  // Visual Assets
  public get characterName(): string {
    return this._data.character
  }
  public get characterIndex(): number {
    return this._data.characterX + this._data.characterY * 4
  }
  public get faceName(): string {
    return this._data.face
  }
  public get faceIndex(): number {
    return this._data.faceX + this._data.faceY * 4
  }
}
