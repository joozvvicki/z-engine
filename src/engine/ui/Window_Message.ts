import { Window_Base } from './Window_Base'
import { Text, TextStyle } from '@engine/utils/pixi'

export class Window_Message extends Window_Base {
  private _textObject: Text

  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height)

    this._textObject = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: this.innerWidth,
        lineHeight: 24
      })
    })

    this.contents.addChild(this._textObject)
  }

  public setText(text: string): void {
    this._textObject.text = text
  }

  public override refresh(): void {
    super.refresh()
    if (this._textObject) {
      this._textObject.style.wordWrapWidth = this.innerWidth
    }
  }

  public setBubbleMode(enabled: boolean): void {
    if (enabled) {
      // Resize for bubble
      // Simple visual change: Make it smaller and potentially change padding
      this.resize(200, 100)
      // Ideally we would change windowSkin or opacity here too to look like a bubble
    } else {
      // Standard size is reset by MessageSystem usually
    }
  }
}
