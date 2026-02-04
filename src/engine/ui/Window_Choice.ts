import { Window_Base } from './Window_Base'
import { Text, TextStyle, Graphics, Container } from '@engine/utils/pixi'

export class Window_Choice extends Window_Base {
  private _choices: string[] = []
  private _index: number = 0
  private _itemHeight: number = 36
  private _cursor: Graphics
  private _itemContainer: Container

  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height)

    this._itemContainer = new Container()
    this.contents.addChild(this._itemContainer)

    this._cursor = new Graphics()
    this.contents.addChild(this._cursor) // Draw cursor on top or bottom? usually behind text but above bg.
    // Actually typically cursor is behind text.
    this.contents.setChildIndex(this._cursor, 0)
  }

  public setChoices(choices: string[]): void {
    this._choices = choices
    this.refreshItems()
    this.select(0)
  }

  public select(index: number): void {
    this._index = Math.max(0, Math.min(index, this._choices.length - 1))
    this.updateCursor()
  }

  public get index(): number {
    return this._index
  }

  private refreshItems(): void {
    this._itemContainer.removeChildren()

    this._choices.forEach((choice, i) => {
      const text = new Text({
        text: choice,
        style: new TextStyle({
          fontFamily: 'Arial, sans-serif',
          fontSize: 18,
          fill: 0xffffff
        })
      })
      text.x = 10
      text.y = i * this._itemHeight + (this._itemHeight - text.height) / 2
      this._itemContainer.addChild(text)
    })
  }

  private updateCursor(): void {
    this._cursor.clear()
    if (this._index < 0 || this._index >= this._choices.length) return

    const rectY = this._index * this._itemHeight

    this._cursor.rect(0, rectY, this.innerWidth, this._itemHeight)
    this._cursor.fill({ color: 0xffffff, alpha: 0.2 })
  }
}
