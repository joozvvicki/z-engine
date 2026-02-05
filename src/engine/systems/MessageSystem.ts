import { Container } from '@engine/utils/pixi'
import { ZEngineSignal, ZInputAction } from '@engine/types'
import { InputManager } from '@engine/managers/InputManager'
import { ZEventBus } from '@engine/core/ZEventBus'
import { EventSystem } from '@engine/systems/EventSystem'
import { TextureManager } from '@engine/managers/TextureManager'
import { Window_Message } from '@engine/ui/Window_Message'
import { Window_Choice } from '@engine/ui/Window_Choice'

/**
 * Manages the dialogue and choice window UI.
 * Refactored for Manual Dependency Injection.
 */
export class MessageSystem {
  // Dependencies
  private inputManager: InputManager
  private eventBus: ZEventBus
  private textureManager: TextureManager
  private eventSystem: EventSystem

  public container: Container

  // UI Components
  private windowMessage: Window_Message | null = null
  private windowChoice: Window_Choice | null = null

  // State
  private isVisible: boolean = false
  private isClosing: boolean = false

  // Choice state
  private isChoiceVisible: boolean = false
  private choices: string[] = []
  private selectedChoiceIndex: number = 0

  private boxWidth: number = 600
  private boxHeight: number = 140

  constructor(
    inputManager: InputManager,
    eventBus: ZEventBus,
    textureManager: TextureManager,
    eventSystem: EventSystem
  ) {
    this.inputManager = inputManager
    this.eventBus = eventBus
    this.textureManager = textureManager
    this.eventSystem = eventSystem

    this.container = new Container()
    this.container.visible = false
    this.container.zIndex = 100000

    this.setupListeners()
  }

  /**
   * Async initialization: Loads assets and builds UI windows.
   */
  public async init(): Promise<void> {
    const skinPath = 'img/system/window.png'

    // Ensure skin is loaded
    await this.textureManager.load(skinPath)
    const skin = this.textureManager.get(skinPath)

    if (skin) {
      // Message Window
      this.windowMessage = new Window_Message(0, 0, this.boxWidth, this.boxHeight)
      this.windowMessage.windowSkin = skin
      this.container.addChild(this.windowMessage)

      // Choice Window
      this.windowChoice = new Window_Choice(0, 0, 240, 0) // Height variable
      this.windowChoice.windowSkin = skin
      this.windowChoice.visible = false
      this.container.addChild(this.windowChoice)
    }
  }

  private setupListeners(): void {
    this.eventBus.on(ZEngineSignal.ShowMessage, ({ text }) => {
      this.show(text)
    })
    this.eventBus.on(ZEngineSignal.ShowChoices, ({ choices }) => {
      this.showChoices(choices)
    })
    this.eventBus.on(ZEngineSignal.MessageCloseDirective, () => {
      this.close()
    })
  }

  public onUpdate(): void {
    // Always update animations if system is active
    if (this.isVisible || this.isClosing) {
      this.windowMessage?.update()
      this.windowChoice?.update()
    }

    if (this.isClosing) {
      // Wait for window to fully close
      if (this.windowMessage?.isClosed()) {
        this.finalizeClose()
      }
      return
    }

    if (this.isVisible) {
      if (this.windowMessage) this.windowMessage.refresh()

      if (this.isChoiceVisible) {
        this.updateChoiceSelection()
      } else {
        // Check for input to close message
        if (
          this.inputManager.isActionJustPressed(ZInputAction.OK) ||
          this.inputManager.isActionJustPressed(ZInputAction.CANCEL)
        ) {
          this.eventSystem.requestMessageAdvance()
        }
      }
    }
  }

  private updateChoiceSelection(): void {
    if (!this.windowChoice) return

    let changed = false
    if (this.inputManager.isActionJustPressed(ZInputAction.DOWN)) {
      this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % this.choices.length
      changed = true
    }
    if (this.inputManager.isActionJustPressed(ZInputAction.UP)) {
      this.selectedChoiceIndex =
        (this.selectedChoiceIndex - 1 + this.choices.length) % this.choices.length
      changed = true
    }

    if (changed) {
      this.windowChoice.select(this.selectedChoiceIndex)
    }

    if (this.inputManager.isActionJustPressed(ZInputAction.OK)) {
      const selectedIndex = this.selectedChoiceIndex

      // Close ONLY choice window, keep message window for now
      this.isChoiceVisible = false
      if (this.windowChoice) this.windowChoice.close()

      this.eventSystem.submitChoice(selectedIndex)

      this.eventBus.emit(ZEngineSignal.ChoiceSelected, { index: selectedIndex })
    }
  }

  private show(text: string): void {
    if (this.windowMessage) {
      this.windowMessage.setText(text)
      this.windowMessage.open()
    }
    this.isVisible = true
    this.isClosing = false
    this.container.visible = true
  }

  private showChoices(choices: string[]): void {
    this.choices = choices
    this.selectedChoiceIndex = 0
    this.isChoiceVisible = true
    this.isVisible = true

    // Ensure message is open
    if (this.windowMessage && !this.windowMessage.isOpen()) {
      this.windowMessage.open()
    }

    if (this.windowChoice) {
      this.windowChoice.setChoices(choices)
      this.windowChoice.select(0)

      // Resize choice window
      const navHeight = choices.length * 36 + 36
      this.windowChoice.resize(240, navHeight)

      // Position: Anchor bottom of choice window to top of message box
      // With pivot.y = height / 2, y = -height / 2 touches the top.
      this.windowChoice.x = this.boxWidth - 240
      this.windowChoice.y = -navHeight / 2

      this.windowChoice.open()
    }

    this.container.visible = true
  }

  private close(): void {
    this.isClosing = true
    if (this.windowMessage) this.windowMessage.close()
    if (this.windowChoice) this.windowChoice.close()

    this.inputManager.clearAction(ZInputAction.OK)
    this.inputManager.clearAction(ZInputAction.CANCEL)
    this.inputManager.clearKey('Enter')
  }

  private finalizeClose(): void {
    this.isVisible = false
    this.isClosing = false
    this.isChoiceVisible = false

    this.container.visible = false

    this.eventBus.emit(ZEngineSignal.MessageClosed, {})

    // Notify logic system that message is done
    this.eventSystem.finishMessage()
  }

  public resize(width: number, height: number): void {
    this.container.x = (width - this.boxWidth) / 2
    this.container.y = height - this.boxHeight - 40
  }

  public onDestroy(): void {
    this.container.destroy({ children: true })
  }
}
