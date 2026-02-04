import { Window_Base } from './Window_Base'
import { Text } from '@engine/utils/pixi'
import { Game_Actor } from '@engine/objects/Game_Actor'

/**
 * Displays the status of party members in the main menu.
 */
export class Window_MenuStatus extends Window_Base {
  private _actors: Game_Actor[] = []

  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height)
  }

  /**
   * Updates the list of actors and refreshes the window content.
   */
  public setActors(actors: Game_Actor[]): void {
    this._actors = actors
    this.refresh()
  }

  public override refresh(): void {
    super.refresh()
    if (!this.contents) return

    this._actors.forEach((actor, index) => {
      this.drawActorStatus(actor, index)
    })
  }

  private drawActorStatus(actor: Game_Actor, index: number): void {
    const startY = 20 + index * 120

    const nameText = new Text({
      text: actor.name,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xffffff
      }
    })
    nameText.x = 20
    nameText.y = startY
    this.contents.addChild(nameText)

    const levelText = new Text({
      text: `Lv: ${actor.level}`,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fill: 0xaaaaaa
      }
    })
    levelText.x = 200
    levelText.y = startY + 5
    this.contents.addChild(levelText)

    const hpText = new Text({
      text: `HP: ${actor.hp}/${actor.mhp}`,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fill: 0xffffff
      }
    })
    hpText.x = 20
    hpText.y = startY + 40
    this.contents.addChild(hpText)

    const mpText = new Text({
      text: `MP: ${actor.mp}/${actor.mmp}`,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fill: 0xffffff
      }
    })
    mpText.x = 20
    mpText.y = startY + 70
    this.contents.addChild(mpText)
  }
}
