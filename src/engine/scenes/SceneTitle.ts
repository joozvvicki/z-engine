import { Text } from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { ZScene } from '@engine/core/ZScene'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SceneManager } from '@engine/managers/SceneManager'
import { SceneMap } from '@engine/scenes/SceneMap'
import { Window_TitleCommand } from '@engine/ui/Window_TitleCommand'
import { TextureManager } from '@engine/managers/TextureManager'
import { ZInputAction } from '@engine/types'

export class SceneTitle extends ZScene {
  private commandWindow: Window_TitleCommand | null = null
  private isStarting: boolean = false

  constructor(services: ServiceLocator) {
    super(services)
  }

  public async init(): Promise<void> {
    ZLogger.with('SceneTitle').log('Initializing UI...')

    // Load UI Assets
    const textureManager = this.services.require(TextureManager)
    const skinPath = 'img/system/window.png'
    await textureManager.load(skinPath)
  }

  public start(): void {
    const centerX = this.app.screen.width / 2
    const centerY = this.app.screen.height / 2
    const textureManager = this.services.require(TextureManager)
    const skin = textureManager.get('img/system/window.png')
    const engine = this.services.get('ZEngine') as { systemData: { projectName: string } }
    const projectName = engine?.systemData?.projectName || 'Z-Engine Game'

    // Title Text
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
      // Calculate dynamic height: choices * 36px + padding (18*2)
      const h = choices.length * 36 + 36

      this.commandWindow = new Window_TitleCommand(0, 0, w, h)
      this.commandWindow.windowSkin = skin

      this.commandWindow.setChoices(choices)

      // Center Window (pivot is center-y due to base, but x is top-left usually)
      // Window_Base default pivot.x = 0.
      this.commandWindow.x = centerX - w / 2
      this.commandWindow.y = centerY + h

      this.container.addChild(this.commandWindow)
      this.commandWindow.open()
      this.commandWindow.select(0)
    }

    ZLogger.with('SceneTitle').log('SceneTitle Started with Window System')
  }

  public update(): void {
    if (this.commandWindow) {
      this.commandWindow.update()
    }

    if (this.isStarting) return
    if (!this.commandWindow) return

    // Input Handling
    if (this.input.isActionJustPressed(ZInputAction.DOWN)) {
      this.commandWindow.select(this.commandWindow.index + 1)
    }
    if (this.input.isActionJustPressed(ZInputAction.UP)) {
      this.commandWindow.select(this.commandWindow.index - 1)
    }

    if (this.input.isActionJustPressed(ZInputAction.OK)) {
      this.onCommandOk()
    }
  }

  private onCommandOk(): void {
    if (!this.commandWindow) return
    const index = this.commandWindow.index

    if (index === 0) {
      // New Game
      this.startGame()
    } else {
      ZLogger.with('SceneTitle').log(`Selected option ${index} (Not implemented)`)
      // TODO: Load / Options
    }
  }

  private startGame(): void {
    this.isStarting = true
    this.commandWindow?.close()

    ZLogger.with('SceneTitle').log(`Starting New Game...`)

    const engine = this.services.get('ZEngine') as {
      systemData: { startMapId: number; startX: number; startY: number }
    }
    const { startMapId = 1, startX = 0, startY = 0 } = engine?.systemData || {}

    const sceneManager = this.services.require(SceneManager)
    // Small delay for close animation
    setTimeout(() => {
      sceneManager.goto(SceneMap, {
        mapOrId: startMapId,
        playerX: startX,
        playerY: startY
      })
    }, 500)
  }
}
