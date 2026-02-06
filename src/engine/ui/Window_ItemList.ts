import { Window_Base } from './Window_Base'
import { Text } from '@engine/utils/pixi'
import { Window_Help } from './Window_Help'
import { ZInputAction } from '@engine/types'
import { InputManager } from '@engine/managers/InputManager'
import { Game_Party } from '@engine/objects/Game_Party'

interface Item {
  name: string
  type: string
  description: string
}

export class Window_ItemList extends Window_Base {
  private _category: string = 'item'
  private _data: Item[] = []
  private _index: number = -1
  private _party: Game_Party | null = null
  private _helpWindow: Window_Help | null = null
  private _input: InputManager | null = null

  public setParty(party: Game_Party): void {
    this._party = party
    this.refresh()
  }

  public setCategory(category: string): void {
    // Only refresh if category actually changed
    if (this._category === category) return

    this._category = category
    this.refresh()
    this.select(this._data.length > 0 ? 0 : -1)
  }

  public setHelpWindow(helpWindow: Window_Help | null): void {
    this._helpWindow = helpWindow
  }

  public setInput(input: InputManager): void {
    this._input = input
  }

  public override refresh(): void {
    this.makeItemList()
    super.refresh()
    if (!this.contents) return

    // Safely remove children - removeChildren() is safe to call even if empty
    this.contents.removeChildren()

    this._data.forEach((item, i) => {
      this.drawItem(item, i)
    })
  }

  private makeItemList(): void {
    // Initialize empty list if no party data yet
    if (!this._party) {
      this._data = []
      return
    }

    // TODO: Implement when Game_Party has items system
    // For now, return empty list
    this._data = []
  }

  private drawItem(item: Item, index: number): void {
    const rectY = index * 40 + 10
    const isSelected = this._index === index

    // Kursor / Podświetlenie (Clean UI style)
    if (isSelected && this.active) {
      // Tu można dodać rysowanie prostokąta tła kursora
    }

    const nameText = new Text({
      text: item.name,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 16,
        fill: isSelected ? 0xffffff : 0xcccccc
      }
    })
    nameText.x = 10
    nameText.y = rectY
    this.contents.addChild(nameText)

    const countText = new Text({
      text: ':1', // TODO: Get actual count from party when items system is ready
      style: { fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0xaaaaaa }
    })
    countText.x = this.width - 60
    countText.y = rectY + 2
    this.contents.addChild(countText)
  }

  public select(index: number): void {
    this._index = index
    this.refresh()
    this.updateHelp()
  }

  public deselect(): void {
    this.select(-1)
  }

  public selectedItem(): Item | null {
    return this._data[this._index] || null
  }

  public update(): void {
    super.update() // Always update animations

    // Only handle input when active and has items
    if (!this.active || !this._input || this._data.length === 0) return

    if (this._input.isActionJustPressed(ZInputAction.DOWN)) {
      this._index = (this._index + 1) % this._data.length
      this.select(this._index)
    } else if (this._input.isActionJustPressed(ZInputAction.UP)) {
      this._index = (this._index - 1 + this._data.length) % this._data.length
      this.select(this._index)
    }
  }

  private updateHelp(): void {
    const item = this.selectedItem()
    this._helpWindow?.setText(item ? item.description : '')
  }
}
