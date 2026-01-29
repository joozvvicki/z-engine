import { ZSystem, ZEngineSignal } from '@engine/types'
import { Container, Graphics, Text } from 'pixi.js'
import { ZEventBus } from '@engine/core/ZEventBus'
import { InputManager } from '@engine/managers/InputManager'

export class MessageSystem extends ZSystem {
  private container: Container
  private inputManager: InputManager
  private eventBus: ZEventBus

  private isVisible: boolean = false
  private messageText: string = ''
  private messageBox: Graphics | null = null
  private textDisplay: Text | null = null

  private boxWidth: number = 600
  private boxHeight: number = 120
  private padding: number = 20

  constructor(stage: Container, eventBus: ZEventBus, inputManager: InputManager) {
    super()
    this.container = new Container()
    this.container.visible = false
    this.container.zIndex = 100000 // Very high to ensure it's always on top

    // Ensure stage can sort children by zIndex
    stage.sortableChildren = true
    stage.addChild(this.container)

    this.eventBus = eventBus
    this.inputManager = inputManager
  }

  public onBoot(): void {
    this.eventBus.on(ZEngineSignal.ShowMessage, ({ text }) => {
      this.show(text)
    })
  }

  public onUpdate(): void {
    if (this.isVisible) {
      // Check for input to close message
      if (
        this.inputManager.isKeyDown('Enter') ||
        this.inputManager.isKeyDown('Space') ||
        this.inputManager.isKeyDown('KeyZ')
      ) {
        this.close()
      }
    }
  }

  private show(text: string): void {
    this.messageText = text
    this.isVisible = true
    this.render()
  }

  private close(): void {
    this.isVisible = false
    this.container.visible = false

    // Clear input state to prevent immediate re-trigger
    this.inputManager.clearKey('Enter')
    this.inputManager.clearKey('Space')
    this.inputManager.clearKey('KeyZ')

    // Emit signal to unblock player input
    this.eventBus.emit(ZEngineSignal.MessageClosed, {})

    // Notify EventSystem that message is finished
    if (window.$zEngine?.eventSystem) {
      window.$zEngine.eventSystem.finishMessage()
    }
  }

  private render(): void {
    // Clear previous content
    this.container.removeChildren()

    // Create message box background
    this.messageBox = new Graphics()

    // Semi-transparent black background with modern PIXI v8 API
    this.messageBox.rect(0, 0, this.boxWidth, this.boxHeight)
    this.messageBox.fill({ color: 0x000000, alpha: 0.85 })

    // White border with rounded corners
    this.messageBox.roundRect(0, 0, this.boxWidth, this.boxHeight, 12)
    this.messageBox.stroke({ width: 3, color: 0xffffff, alpha: 0.3 })

    // Decorative corners
    const corner = new Graphics()
    corner.moveTo(0, 10).lineTo(0, 0).lineTo(10, 0)
    corner
      .moveTo(this.boxWidth - 10, 0)
      .lineTo(this.boxWidth, 0)
      .lineTo(this.boxWidth, 10)
    corner
      .moveTo(0, this.boxHeight - 10)
      .lineTo(0, this.boxHeight)
      .lineTo(10, this.boxHeight)
    corner
      .moveTo(this.boxWidth - 10, this.boxHeight)
      .lineTo(this.boxWidth, this.boxHeight)
      .lineTo(this.boxWidth, this.boxHeight - 10)
    corner.stroke({ width: 2, color: 0xffffff, alpha: 0.5 })
    this.messageBox.addChild(corner)

    this.container.addChild(this.messageBox)

    // Create text with modern PIXI v8 API
    this.textDisplay = new Text({
      text: this.messageText,
      style: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 18,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: this.boxWidth - this.padding * 2,
        lineHeight: 24
      }
    })
    this.textDisplay.x = this.padding
    this.textDisplay.y = this.padding
    this.container.addChild(this.textDisplay)

    // Add prompt indicator (small triangle)
    const indicator = new Graphics()
    indicator.moveTo(0, 0).lineTo(6, 0).lineTo(3, 8).closePath()
    indicator.fill({ color: 0xffffff, alpha: 0.6 })
    indicator.x = this.boxWidth - 15
    indicator.y = this.boxHeight - 15
    this.container.addChild(indicator)

    this.container.visible = true
  }

  public resize(width: number, height: number): void {
    // Position message box at bottom center
    this.container.x = (width - this.boxWidth) / 2
    this.container.y = height - this.boxHeight - 40
  }

  public onDestroy(): void {
    this.container.destroy({ children: true })
  }
}
