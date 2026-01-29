import { ZSystem, ZEngineSignal } from '@engine/types'
import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import { ZEventBus } from '@engine/core/ZEventBus'
import { InputManager } from '@engine/managers/InputManager'

export class MessageSystem extends ZSystem {
  private container: Container
  private eventBus: ZEventBus
  private inputManager: InputManager

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

    console.log(
      '[MessageSystem] Constructor - container added to stage with zIndex:',
      this.container.zIndex
    )
  }

  public onBoot(): void {
    console.log('[MessageSystem] Booting, listening for ShowMessage signal')
    this.eventBus.on(ZEngineSignal.ShowMessage, ({ text }) => {
      console.log('[MessageSystem] Received ShowMessage signal:', text)
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
    console.log('[MessageSystem] show() called with text:', text)
    this.messageText = text
    this.isVisible = true
    this.render()
    console.log('[MessageSystem] Container visible:', this.container.visible)
  }

  private close(): void {
    this.isVisible = false
    this.container.visible = false

    // Clear input state to prevent immediate re-trigger
    this.inputManager.clearKey('Enter')
    this.inputManager.clearKey('Space')
    this.inputManager.clearKey('KeyZ')

    // Notify EventSystem that message is finished
    if (window.$zEngine?.eventSystem) {
      window.$zEngine.eventSystem.finishMessage()
    }
  }

  private render(): void {
    console.log('[MessageSystem] render() called')
    // Clear previous content
    this.container.removeChildren()

    // Create message box background
    this.messageBox = new Graphics()

    // Semi-transparent black background
    this.messageBox.beginFill(0x000000, 0.85)
    this.messageBox.drawRoundedRect(0, 0, this.boxWidth, this.boxHeight, 12)
    this.messageBox.endFill()

    // White border
    this.messageBox.lineStyle(3, 0xffffff, 0.3)
    this.messageBox.drawRoundedRect(0, 0, this.boxWidth, this.boxHeight, 12)

    // Decorative corners
    this.messageBox.lineStyle(2, 0xffffff, 0.5)
    // Top-left
    this.messageBox.moveTo(0, 10)
    this.messageBox.lineTo(0, 0)
    this.messageBox.lineTo(10, 0)
    // Top-right
    this.messageBox.moveTo(this.boxWidth - 10, 0)
    this.messageBox.lineTo(this.boxWidth, 0)
    this.messageBox.lineTo(this.boxWidth, 10)
    // Bottom-left
    this.messageBox.moveTo(0, this.boxHeight - 10)
    this.messageBox.lineTo(0, this.boxHeight)
    this.messageBox.lineTo(10, this.boxHeight)
    // Bottom-right
    this.messageBox.moveTo(this.boxWidth - 10, this.boxHeight)
    this.messageBox.lineTo(this.boxWidth, this.boxHeight)
    this.messageBox.lineTo(this.boxWidth, this.boxHeight - 10)

    this.container.addChild(this.messageBox)

    // Create text
    const textStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: this.boxWidth - this.padding * 2,
      lineHeight: 24
    })

    this.textDisplay = new Text(this.messageText, textStyle)
    this.textDisplay.x = this.padding
    this.textDisplay.y = this.padding
    this.container.addChild(this.textDisplay)

    // Add prompt indicator (small triangle)
    const indicator = new Graphics()
    indicator.beginFill(0xffffff, 0.6)
    indicator.moveTo(0, 0)
    indicator.lineTo(6, 0)
    indicator.lineTo(3, 8)
    indicator.closePath()
    indicator.endFill()
    indicator.x = this.boxWidth - 15
    indicator.y = this.boxHeight - 15
    this.container.addChild(indicator)

    this.container.visible = true
    console.log(
      '[MessageSystem] Render complete. Container position:',
      this.container.x,
      this.container.y,
      'Children:',
      this.container.children.length
    )
  }

  public resize(width: number, height: number): void {
    // Position message box at bottom center
    this.container.x = (width - this.boxWidth) / 2
    this.container.y = height - this.boxHeight - 40
    console.log(
      '[MessageSystem] resize() called. New position:',
      this.container.x,
      this.container.y,
      'Screen:',
      width,
      height
    )
  }

  public onDestroy(): void {
    this.container.destroy({ children: true })
  }
}
