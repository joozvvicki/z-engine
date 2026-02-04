import { Window_Base } from './Window_Base'
import { Text } from '@engine/utils/pixi'

export class Window_MenuStatus extends Window_Base {
  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height)
    this.refresh()
  }

  public override refresh(): void {
    super.refresh()
    if (!this.contents) return

    const nameText = new Text({
      text: 'Bohater',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xffffff
      }
    })
    nameText.x = 20
    nameText.y = 20
    this.contents.addChild(nameText)

    const hpText = new Text({
      text: 'HP: 100/100',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fill: 0xffffff
      }
    })
    hpText.x = 20
    hpText.y = 60
    this.contents.addChild(hpText)

    const mpText = new Text({
      text: 'MP: 50/50',
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fill: 0xffffff
      }
    })
    mpText.x = 20
    mpText.y = 90
    this.contents.addChild(mpText)
  }
}
