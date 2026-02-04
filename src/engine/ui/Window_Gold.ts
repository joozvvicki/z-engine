import { Window_Base } from './Window_Base'
import { Text } from '@engine/utils/pixi'

export class Window_Gold extends Window_Base {
  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height)
    this.refresh()
  }

  public override refresh(): void {
    super.refresh()
    if (!this.contents) return

    const goldText = new Text({
      text: '0 G',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 20,
        fill: 0xffffff
      }
    })
    // Align right
    goldText.anchor.set(1, 0)
    goldText.x = this.innerWidth - 10
    goldText.y = (this.innerHeight - goldText.height) / 2
    this.contents.addChild(goldText)
  }
}
