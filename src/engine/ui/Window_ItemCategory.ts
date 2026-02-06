import { Window_Base } from './Window_Base'
import { Text } from '@engine/utils/pixi'
import { ZInputAction } from '@engine/types'
import { InputManager } from '@engine/managers/InputManager'

export class Window_ItemCategory extends Window_Base {
  private _index: number = 0
  private _commands = ['Przedmioty', 'Bronie', 'Pancerze', 'Kluczowe']
  private _input: InputManager | null = null

  public setInput(input: InputManager): void {
    this._input = input
  }

  public get index(): number {
    return this._index
  }

  public get currentCategory(): string {
    const categories = ['item', 'weapon', 'armor', 'keyItem']
    return categories[this._index]
  }

  public override refresh(): void {
    super.refresh()
    if (!this.contents) return

    // Guard against being called before child class properties are initialized
    if (!this._commands) return

    // Safely remove children - just call removeChildren() directly
    this.contents.removeChildren()

    const colW = (this.width - 40) / this._commands.length

    this._commands.forEach((cmd, i) => {
      const txt = new Text({
        text: cmd,
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 16,
          fontWeight: this._index === i ? 'bold' : 'normal',
          fill: this._index === i ? 0xffffff : 0x888888
        }
      })
      txt.x = i * colW + (colW - txt.width) / 2
      txt.y = 15
      this.contents.addChild(txt)
    })

    console.log(`Window_ItemCategory.refresh() - Drew ${this._commands.length} category tabs`)
  }

  public update(): void {
    super.update() // Always update animations (opening/closing)

    // Only handle input when active
    if (!this.active || !this._input) return

    if (this._input.isActionJustPressed(ZInputAction.RIGHT)) {
      this._index = (this._index + 1) % this._commands.length
      this.onCategoryChange()
    } else if (this._input.isActionJustPressed(ZInputAction.LEFT)) {
      this._index = (this._index - 1 + this._commands.length) % this._commands.length
      this.onCategoryChange()
    }
  }

  private onCategoryChange(): void {
    this.refresh()
    // Removed updateItemWindow() - SceneItem will handle coordination
  }

  public onCategoryChanged(): boolean {
    // Returns true if category changed this frame (for SceneItem to detect)
    return (
      this._input?.isActionJustPressed(ZInputAction.RIGHT) ||
      this._input?.isActionJustPressed(ZInputAction.LEFT) ||
      false
    )
  }
}
