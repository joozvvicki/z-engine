import { Window_Base } from './Window_Base'
import { Text } from '@engine/utils/pixi'

/**
 * Displays the current amount of party gold.
 */
export class Window_Gold extends Window_Base {
  private _gold: number = 0

  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height)
  }

  /**
   * Updates the gold amount and refreshes the window content.
   */
  public setGold(gold: number): void {
    this._gold = gold
    this.refresh()
  }

  public override refresh(): void {
    super.refresh()
    if (!this.contents) return
    this.contents.removeChildren()

    const goldText = new Text({
      text: `${this._gold || 0} G`,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 20,
        fill: 0xffffff
      }
    })

    // Align right
    goldText.anchor.set(1, 0.5)
    goldText.x = this.innerWidth - 20
    goldText.y = this.innerHeight / 2
    this.contents.addChild(goldText)
  }
}
