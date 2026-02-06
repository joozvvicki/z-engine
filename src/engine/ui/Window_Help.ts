import { Window_Base } from './Window_Base'
import { Text } from '@engine/utils/pixi'

export class Window_Help extends Window_Base {
  private _text: string = ''
  private _textLabel: Text | null = null

  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height)
  }

  private ensureTextLabel(): void {
    if (this._textLabel) return

    this._textLabel = new Text({
      text: this._text,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: this.width - 40
      }
    })
    this._textLabel.x = 20
    this._textLabel.y = 20
    this.contents.addChild(this._textLabel)
  }

  public override refresh(): void {
    super.refresh()
    this.ensureTextLabel()
  }

  public setText(text: string): void {
    if (this._text === text) return
    this._text = text
    this.ensureTextLabel()
    if (this._textLabel) {
      this._textLabel.text = this._text
    }
  }

  public clear(): void {
    this.setText('')
  }
}
