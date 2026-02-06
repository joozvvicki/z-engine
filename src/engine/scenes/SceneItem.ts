import { ZScene } from '@engine/core/ZScene'
import ZLogger from '@engine/utils/ZLogger'
import { ZInputAction, IEngineContext } from '@engine/types'
import { Window_ItemCategory } from '@engine/ui/Window_ItemCategory'
import { Window_ItemList } from '@engine/ui/Window_ItemList'
import { Window_Help } from '@engine/ui/Window_Help'

/**
 * Scene_Item
 * Zarządza przeglądaniem ekwipunku, podziałem na kategorie i używaniem przedmiotów.
 */
export class SceneItem extends ZScene {
  private categoryWindow: Window_ItemCategory | null = null
  private itemWindow: Window_ItemList | null = null
  private helpWindow: Window_Help | null = null

  private _isClosing: boolean = false

  constructor(engine: IEngineContext) {
    super(engine)
  }

  public async init(): Promise<void> {
    try {
      ZLogger.with('SceneItem').info('Initializing item scene...')

      await this.engine.textures.load('img/system/window.png')
    } catch (e) {
      ZLogger.with('SceneItem').error('Error in init():', e)
      throw e
    }
  }

  public start(): void {
    try {
      ZLogger.with('SceneItem').info('start() called')

      const skin = this.engine.textures.get('img/system/window.png')

      if (!skin) {
        throw new Error('Window skin texture not found after load!')
      }

      const screenW = this.engine.app.screen.width
      const screenH = this.engine.app.screen.height

      ZLogger.with('SceneItem').info('Creating Window_Help...')
      // 1. Window_Help (Góra ekranu) - Pokazuje opisy przedmiotów
      const helpH = 100
      this.helpWindow = new Window_Help(20, 20, screenW - 40, helpH)
      this.helpWindow.windowSkin = skin
      this.container.addChild(this.helpWindow)

      ZLogger.with('SceneItem').info('Creating Window_ItemCategory...')
      // 2. Window_ItemCategory (Pod oknem pomocy)
      const categoryH = 70
      this.categoryWindow = new Window_ItemCategory(20, helpH + 30, screenW - 40, categoryH)
      this.categoryWindow.windowSkin = skin
      this.categoryWindow.setInput(this.engine.input)
      this.container.addChild(this.categoryWindow)

      ZLogger.with('SceneItem').info('Creating Window_ItemList...')
      // 3. Window_ItemList (Główny obszar)
      const itemY = helpH + categoryH + 40
      const itemH = screenH - itemY - 20
      this.itemWindow = new Window_ItemList(20, itemY, screenW - 40, itemH)
      this.itemWindow.windowSkin = skin
      this.itemWindow.setInput(this.engine.input)
      this.itemWindow.setHelpWindow(this.helpWindow) // Łączymy opis z listą
      this.container.addChild(this.itemWindow)

      ZLogger.with('SceneItem').info('Setting initial data...')
      // Ustawiamy dane PRZED otwarciem okien
      this.itemWindow.setParty(this.engine.gameState.party)
      // Set initial category
      this.itemWindow.setCategory(this.categoryWindow.currentCategory)

      ZLogger.with('SceneItem').info('Opening windows...')
      // Otwieramy okna natychmiast bez animacji (animacja się nie zdąża wykonać przed pierwszym renderem)
      this.categoryWindow.openImmediate()
      this.itemWindow.openImmediate()
      this.helpWindow.openImmediate()

      ZLogger.with('SceneItem').info('Activating category window...')
      // Na końcu aktywujemy
      this.categoryWindow.activate()

      ZLogger.with('SceneItem').info('start() completed successfully')
    } catch (e) {
      ZLogger.with('SceneItem').error('Error in start():', e)
      throw e
    }
  }

  public update(delta: number): void {
    super.update(delta)

    this.helpWindow?.update()
    this.categoryWindow?.update()
    this.itemWindow?.update()

    // Sync category changes to item window
    if (this.categoryWindow && this.itemWindow) {
      const currentCategory = this.categoryWindow.currentCategory
      this.itemWindow.setCategory(currentCategory)
    }

    if (this._isClosing) return

    this.handleInput()
  }

  private handleInput(): void {
    const input = this.engine.input

    // Powrót do poprzedniej sceny (Menu główne)
    if (input.isActionJustPressed(ZInputAction.CANCEL)) {
      if (this.itemWindow?.active) {
        this.onItemCancel()
      } else {
        this.closeScene()
      }
    }

    // Wybór kategorii -> przejście do listy
    if (this.categoryWindow?.active && input.isActionJustPressed(ZInputAction.OK)) {
      this.onCategoryOk()
    }

    // Wybór przedmiotu -> użycie
    if (this.itemWindow?.active && input.isActionJustPressed(ZInputAction.OK)) {
      this.onItemOk()
    }
  }

  /**
   * Po wybraniu kategorii (np. "Bronie") aktywujemy listę przedmiotów.
   */
  private onCategoryOk(): void {
    this.categoryWindow?.deactivate()
    this.itemWindow?.activate()
    this.itemWindow?.select(0)
  }

  /**
   * Po naciśnięciu CANCEL na liście, wracamy do wyboru kategorii.
   */
  private onItemCancel(): void {
    this.itemWindow?.deactivate()
    this.itemWindow?.deselect()
    this.categoryWindow?.activate()
  }

  /**
   * Logika użycia przedmiotu.
   */
  private onItemOk(): void {
    const item = this.itemWindow?.selectedItem()
    if (item) {
      ZLogger.with('SceneItem').info(`Using item: ${item.name}`)
      // Tutaj wstawisz logikę użycia przedmiotu (np. wywołanie efektu z bazy danych)
      // this.engine.gameState.useItem(item)
      this.itemWindow?.refresh()
    }
  }

  private async closeScene(): Promise<void> {
    if (this._isClosing) return
    this._isClosing = true

    this.categoryWindow?.close()
    this.itemWindow?.close()
    this.helpWindow?.close()

    await new Promise((resolve) => setTimeout(resolve, 150))
    await this.engine.scenes.pop({ fade: true })
  }
}
