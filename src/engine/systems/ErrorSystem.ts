import PIXI from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { ZSystem, SystemMode, ServiceLocator } from '@engine/core'

export class ErrorSystem extends ZSystem {
  public container: PIXI.Container
  private background: PIXI.Graphics
  private titleText: PIXI.Text
  private messageText: PIXI.Text
  private isVisible: boolean = false

  constructor(services: ServiceLocator) {
    super(services)
    this.updateMode = SystemMode.ALWAYS

    this.container = new PIXI.Container()
    this.container.label = 'ErrorOverlay'
    this.container.zIndex = 11000
    this.container.visible = false

    this.background = new PIXI.Graphics()
    this.container.addChild(this.background)

    const titleStyle = new PIXI.TextStyle({
      fontFamily: 'monospace',
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#ffffff'
    })

    const messageStyle = new PIXI.TextStyle({
      fontFamily: 'monospace',
      fontSize: 18,
      fill: '#ffffff',
      wordWrap: true,
      wordWrapWidth: 800
    })

    this.titleText = new PIXI.Text({ text: 'CRITICAL ERROR', style: titleStyle })
    this.titleText.anchor.set(0.5, 0)
    this.container.addChild(this.titleText)

    this.messageText = new PIXI.Text({ text: '', style: messageStyle })
    this.messageText.anchor.set(0.5, 0)
    this.container.addChild(this.messageText)
  }

  public show(error: Error | string): void {
    const message = error instanceof Error ? error.stack || error.message : error
    this.messageText.text = message
    this.container.visible = true
    this.isVisible = true
    this.updateLayout()

    ZLogger.with('ErrorSystem').error('Showing error overlay:', message)
  }

  public hide(): void {
    this.container.visible = false
    this.isVisible = false
  }

  public resize(width: number, height: number): void {
    this.background.clear()
    this.background.rect(0, 0, width, height)
    this.background.fill({ color: 0xaa0000, alpha: 0.9 })

    this.messageText.style.wordWrapWidth = width * 0.8
    this.updateLayout()
  }

  private updateLayout(): void {
    const width = this.background.width
    const height = this.background.height

    this.titleText.x = width / 2
    this.titleText.y = height * 0.2

    this.messageText.x = width / 2
    this.messageText.y = this.titleText.y + 60
  }

  onUpdate(): void {
    // Keep it on top if other things are added
    if (this.isVisible && this.container.parent) {
      this.container.parent.setChildIndex(this.container, this.container.parent.children.length - 1)
    }
  }
}
