import { Container } from '@engine/utils/pixi'
import { ZEngineSignal, ZInputAction } from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { EventSystem } from '@engine/systems/EventSystem'
import { TextureManager } from '@engine/managers/TextureManager'
import { Window_Message } from '@engine/ui/Window_Message'
import { Window_Choice } from '@engine/ui/Window_Choice'

export class MessageSystem extends ZSystem {
  public container: Container

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

  constructor(services: ServiceLocator) {
    super(services)
    this.updateMode = SystemMode.PLAY
    this.container = new Container()
    this.container.visible = false
    this.container.zIndex = 100000
  }

  public async onBoot(): Promise<void> {
    const textureManager = this.services.require(TextureManager)

    // Load Window Skin
    const skinPath = 'img/system/window.png'
    await textureManager.load(skinPath)
    const skin = textureManager.get(skinPath)

    // Init Windows
    if (skin) {
      this.windowMessage = new Window_Message(0, 0, this.boxWidth, this.boxHeight)
      this.windowMessage.windowSkin = skin
      this.container.addChild(this.windowMessage)

      // Choice window setup (variable height, defaults for now)
      this.windowChoice = new Window_Choice(0, 0, 240, 0) // Height variable
      this.windowChoice.windowSkin = skin
      this.windowChoice.visible = false
      this.container.addChild(this.windowChoice)
    }

    this.bus.on(ZEngineSignal.ShowMessage, ({ text }) => {
      this.show(text)
    })
    this.bus.on(ZEngineSignal.ShowChoices, ({ choices }) => {
      this.showChoices(choices)
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
          this.input.isActionDown(ZInputAction.OK) ||
          this.input.isActionDown(ZInputAction.CANCEL)
        ) {
          this.close()
        }
      }
    }
  }

  private updateChoiceSelection(): void {
    if (!this.windowChoice) return

    let changed = false
    if (this.input.isActionJustPressed(ZInputAction.DOWN)) {
      this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % this.choices.length
      changed = true
    }
    if (this.input.isActionJustPressed(ZInputAction.UP)) {
      this.selectedChoiceIndex =
        (this.selectedChoiceIndex - 1 + this.choices.length) % this.choices.length
      changed = true
    }

    if (changed) {
      this.windowChoice.select(this.selectedChoiceIndex)
    }

    if (this.input.isActionJustPressed(ZInputAction.OK)) {
      const selectedIndex = this.selectedChoiceIndex
      this.closeChoices()
      this.bus.emit(ZEngineSignal.ChoiceSelected, { index: selectedIndex })
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
    this.isVisible = true // Ensure message is also visible if choices appear

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

      // Position
      this.windowChoice.x = this.boxWidth - 240
      this.windowChoice.y = -navHeight

      this.windowChoice.open()
    }

    this.container.visible = true
  }

  private closeChoices(): void {
    this.isChoiceVisible = false
    if (this.windowChoice) {
      this.windowChoice.close()
    }
    this.close()
  }

  private close(): void {
    this.isClosing = true
    if (this.windowMessage) this.windowMessage.close()
    if (this.windowChoice) this.windowChoice.close()

    const inputManager = this.input
    if (inputManager) {
      inputManager.clearAction(ZInputAction.OK)
      inputManager.clearAction(ZInputAction.CANCEL)
      inputManager.clearKey('Enter')
    }
  }

  private finalizeClose(): void {
    this.isVisible = false
    this.isClosing = false
    this.isChoiceVisible = false

    this.container.visible = false

    this.bus.emit(ZEngineSignal.MessageClosed, {})

    const eventSystem = this.services.get(EventSystem)
    if (eventSystem) {
      eventSystem.finishMessage()
    }
  }

  public resize(width: number, height: number): void {
    this.container.x = (width - this.boxWidth) / 2
    this.container.y = height - this.boxHeight - 40
  }

  public onDestroy(): void {
    this.container.destroy({ children: true })
  }
}
