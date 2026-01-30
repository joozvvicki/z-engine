import { Container, Graphics, Text } from '@engine/utils/pixi'
import { ZEngineSignal } from '@engine/types'
import { ZSystem as ZSystemCore, SystemMode } from '@engine/core/ZSystem'
import { EventSystem } from '@engine/systems/EventSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'

export class MessageSystem extends ZSystemCore {
  private container: Container

  private isVisible: boolean = false
  private messageText: string = ''
  private messageBox: Graphics | null = null
  private textDisplay: Text | null = null

  // Choice state
  private isChoiceVisible: boolean = false
  private choices: string[] = []
  private selectedChoiceIndex: number = 0
  private choicesContainer: Container | null = null

  private boxWidth: number = 600
  private boxHeight: number = 120
  private padding: number = 20
  private choiceWidth: number = 200
  private choiceHeight: number = 40

  constructor(stage: Container, services: ServiceLocator) {
    super(services)
    this.updateMode = SystemMode.PLAY
    this.container = new Container()
    this.container.visible = false
    this.container.zIndex = 100000 // Very high to ensure it's always on top

    // Ensure stage can sort children by zIndex
    stage.sortableChildren = true
    stage.addChild(this.container)
  }

  public onBoot(): void {
    this.bus.on(ZEngineSignal.ShowMessage, ({ text }) => {
      this.show(text)
    })
    this.bus.on(ZEngineSignal.ShowChoices, ({ choices }) => {
      this.showChoices(choices)
    })
  }

  public onUpdate(): void {
    if (this.isVisible) {
      if (this.isChoiceVisible) {
        this.updateChoiceSelection()
      } else {
        // Check for input to close message
        if (
          this.input.isKeyDown('Enter') ||
          this.input.isKeyDown('Space') ||
          this.input.isKeyDown('KeyZ')
        ) {
          this.close()
        }
      }
    }
  }

  private updateChoiceSelection(): void {
    if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('KeyS')) {
      this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % this.choices.length
      this.renderChoices()
      this.input.clearKey('ArrowDown')
      this.input.clearKey('KeyS')
    }
    if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('KeyW')) {
      this.selectedChoiceIndex =
        (this.selectedChoiceIndex - 1 + this.choices.length) % this.choices.length
      this.renderChoices()
      this.input.clearKey('ArrowUp')
      this.input.clearKey('KeyW')
    }

    if (
      this.input.isKeyDown('Enter') ||
      this.input.isKeyDown('Space') ||
      this.input.isKeyDown('KeyZ')
    ) {
      const selectedIndex = this.selectedChoiceIndex
      this.closeChoices()
      this.bus.emit(ZEngineSignal.ChoiceSelected, { index: selectedIndex })
    }
  }

  private show(text: string): void {
    this.messageText = text
    this.isVisible = true
    this.render()
  }

  private close(): void {
    this.isVisible = false
    this.isChoiceVisible = false
    this.container.visible = false

    this.input.clearKey('Enter')
    this.input.clearKey('Space')
    this.input.clearKey('KeyZ')

    this.bus.emit(ZEngineSignal.MessageClosed, {})

    const eventSystem = window.$zEngine?.services.get(EventSystem)
    if (eventSystem) {
      eventSystem.finishMessage()
    }
  }

  private render(): void {
    this.container.removeChildren()

    this.messageBox = new Graphics()

    this.messageBox.rect(0, 0, this.boxWidth, this.boxHeight)
    this.messageBox.fill({ color: 0x000000, alpha: 0.85 })

    this.messageBox.roundRect(0, 0, this.boxWidth, this.boxHeight, 12)
    this.messageBox.stroke({ width: 3, color: 0xffffff, alpha: 0.3 })

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

    const indicator = new Graphics()
    indicator.moveTo(0, 0).lineTo(6, 0).lineTo(3, 8).closePath()
    indicator.fill({ color: 0xffffff, alpha: 0.6 })
    indicator.x = this.boxWidth - 15
    indicator.y = this.boxHeight - 15
    this.container.addChild(indicator)

    this.container.visible = true
  }

  private showChoices(choices: string[]): void {
    this.choices = choices
    this.selectedChoiceIndex = 0
    this.isChoiceVisible = true
    this.isVisible = true
    this.renderChoices()
  }

  private closeChoices(): void {
    this.isChoiceVisible = false
    if (this.choicesContainer) {
      this.container.removeChild(this.choicesContainer)
      this.choicesContainer = null
    }
    this.close()
  }

  private renderChoices(): void {
    if (this.choicesContainer) {
      this.container.removeChild(this.choicesContainer)
    }

    const choicesContainer = new Container()
    this.choicesContainer = choicesContainer
    this.container.addChild(choicesContainer)

    const totalHeight = this.choices.length * this.choiceHeight + this.padding * 2
    const totalWidth = this.choiceWidth + this.padding * 2

    const bg = new Graphics()
    bg.rect(0, 0, totalWidth, totalHeight)
    bg.fill({ color: 0x000000, alpha: 0.9 })
    bg.roundRect(0, 0, totalWidth, totalHeight, 8)
    bg.stroke({ width: 2, color: 0xffffff, alpha: 0.4 })
    choicesContainer.addChild(bg)

    this.choices.forEach((choice, index) => {
      const isSelected = index === this.selectedChoiceIndex
      const y = this.padding + index * this.choiceHeight

      if (isSelected) {
        const highlight = new Graphics()
        highlight.rect(this.padding / 2, y, totalWidth - this.padding, this.choiceHeight)
        highlight.fill({ color: 0xffffff, alpha: 0.2 })
        choicesContainer.addChild(highlight)
      }

      const text = new Text({
        text: choice,
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 16,
          fill: isSelected ? 0xffff00 : 0xffffff,
          fontWeight: isSelected ? 'bold' : 'normal'
        }
      })
      text.x = this.padding
      text.y = y + (this.choiceHeight - text.height) / 2
      choicesContainer.addChild(text)
    })

    choicesContainer.x = this.boxWidth - totalWidth
    choicesContainer.y = -totalHeight - 10

    this.container.visible = true
  }

  public resize(width: number, height: number): void {
    this.container.x = (width - this.boxWidth) / 2
    this.container.y = height - this.boxHeight - 40
  }

  public onDestroy(): void {
    this.container.destroy({ children: true })
  }
}
