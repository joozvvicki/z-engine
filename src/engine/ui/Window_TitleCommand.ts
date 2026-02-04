import { Window_Choice } from './Window_Choice'
import { Text, TextStyle } from '@engine/utils/pixi'

export class Window_TitleCommand extends Window_Choice {
  // Override to center text
  protected override refreshItems(): void {
    this._itemContainer.removeChildren()

    this._choices.forEach((choice, i) => {
      const text = new Text({
        text: choice,
        style: new TextStyle({
          fontFamily: 'Arial, sans-serif',
          fontSize: 24, // Bigger font for title
          fontWeight: 'bold',
          fill: 0xffffff,
          dropShadow: {
            alpha: 0.5,
            blur: 2,
            color: 0x000000,
            distance: 2
          }
        })
      })

      // Center Text
      text.x = (this.innerWidth - text.width) / 2
      text.y = i * this._itemHeight + (this._itemHeight - text.height) / 2

      this._itemContainer.addChild(text)
    })
  }
}
