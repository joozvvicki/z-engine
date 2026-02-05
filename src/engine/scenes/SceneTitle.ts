import { Text } from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { ZScene } from '@engine/core/ZScene'
import { SceneMap } from '@engine/scenes/SceneMap'
import { Window_TitleCommand } from '@engine/ui/Window_TitleCommand'
import { IEngineContext, ZInputAction } from '@engine/types'

export class SceneTitle extends ZScene {
  private commandWindow: Window_TitleCommand | null = null
  private isStarting: boolean = false

  constructor(engine: IEngineContext) {
    super(engine)
  }

  public async init(): Promise<void> {
    ZLogger.with('SceneTitle').log('Initializing UI...')

    const skinPath = 'img/system/window.png'
    await this.engine.textures.load(skinPath)
  }

  public start(): void {
    const centerX = this.engine.app.screen.width / 2
    const centerY = this.engine.app.screen.height / 2

    const skin = this.engine.textures.get('img/system/window.png')
    const projectName = this.engine.systemData?.projectName || 'Z-Engine Game'

    const titleText = new Text({
      text: projectName,
      style: {
        fill: 0xffffff,
        fontSize: 64,
        fontWeight: 'bold',
        dropShadow: {
          alpha: 0.5,
          blur: 4,
          color: 0x000000,
          distance: 4
        }
      }
    })
    titleText.anchor.set(0.5)
    titleText.x = centerX
    titleText.y = centerY - 100
    this.container.addChild(titleText)

    // Command Window
    if (skin) {
      const choices = ['Nowa Gra', 'Wczytaj', 'Opcje']
      const w = 300
      const h = choices.length * 36 + 36

      this.commandWindow = new Window_TitleCommand(0, 0, w, h)
      this.commandWindow.windowSkin = skin
      this.commandWindow.setChoices(choices)

      this.commandWindow.x = centerX - w / 2
      this.commandWindow.y = centerY + h

      this.container.addChild(this.commandWindow)
      this.commandWindow.open()
      this.commandWindow.select(0)
    }

    ZLogger.with('SceneTitle').log('SceneTitle Started')
  }

  public update(): void {
    if (this.commandWindow) {
      this.commandWindow.update()
    }

    if (this.isStarting) return
    if (!this.commandWindow) return

    const input = this.engine.input

    if (input.isActionJustPressed(ZInputAction.DOWN)) {
      this.commandWindow.select(this.commandWindow.index + 1)
    }
    if (input.isActionJustPressed(ZInputAction.UP)) {
      this.commandWindow.select(this.commandWindow.index - 1)
    }

    if (input.isActionJustPressed(ZInputAction.OK)) {
      this.onCommandOk()
    }
  }

  private onCommandOk(): void {
    if (!this.commandWindow) return
    const index = this.commandWindow.index

    if (index === 0) {
      this.startGame()
    } else {
      ZLogger.with('SceneTitle').log(`Selected option ${index} (Not implemented)`)
    }
  }

  private async startGame(): Promise<void> {
    this.isStarting = true

    ZLogger.with('SceneTitle').log(`Starting New Game...`)

    // Close window gracefully
    if (this.commandWindow) {
      this.commandWindow.close()
      // Wait for close animation (better than arbitrary setTimeout if possible)
      // For now, using a promise delay to simulate animation wait
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    // Access System Data safely
    const { startMapId = 1, startX = 0, startY = 0 } = this.engine.systemData || {}

    // Navigate using Engine Context
    this.engine.scenes.goto(SceneMap, {
      mapOrId: startMapId,
      playerX: startX,
      playerY: startY
    })
  }
}
