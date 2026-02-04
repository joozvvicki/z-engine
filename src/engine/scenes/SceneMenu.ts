import { ZScene } from '@engine/core/ZScene'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SceneManager } from '@engine/managers/SceneManager'
import { TextureManager } from '@engine/managers/TextureManager'
import { ZInputAction } from '@engine/types'
import { Window_MenuCommand } from '@engine/ui/Window_MenuCommand'
import { Window_MenuStatus } from '@engine/ui/Window_MenuStatus'
import { Window_Gold } from '@engine/ui/Window_Gold'
import { SceneMap } from '@engine/scenes/SceneMap'
import { ZMenuParams } from '@engine/types'

export class SceneMenu extends ZScene {
  private commandWindow: Window_MenuCommand | null = null
  private statusWindow: Window_MenuStatus | null = null
  private goldWindow: Window_Gold | null = null

  private prevState: ZMenuParams | null = null

  constructor(services: ServiceLocator) {
    super(services)
  }

  public async init(params: ZMenuParams): Promise<void> {
    this.prevState = params

    const textureManager = this.services.require(TextureManager)
    await textureManager.load('img/system/window.png')
  }

  public start(): void {
    const textureManager = this.services.require(TextureManager)
    const skin = textureManager.get('img/system/window.png')
    if (!skin) return

    const screenW = this.app.screen.width
    const screenH = this.app.screen.height

    // Command Window (Left)
    const cmdW = 240
    const cmdH = 200
    this.commandWindow = new Window_MenuCommand(20, 20, cmdW, cmdH)
    this.commandWindow.windowSkin = skin
    this.container.addChild(this.commandWindow)
    this.commandWindow.open()

    // Gold Window (Left Bottom)
    const goldW = 240
    const goldH = 70
    this.goldWindow = new Window_Gold(20, screenH - goldH - 20, goldW, goldH)
    this.goldWindow.windowSkin = skin
    this.container.addChild(this.goldWindow)
    this.goldWindow.open()

    // Status Window (Right)
    const statusX = cmdW + 40
    const statusW = screenW - statusX - 20
    const statusH = screenH - 40
    this.statusWindow = new Window_MenuStatus(statusX, 20, statusW, statusH)
    this.statusWindow.windowSkin = skin
    this.container.addChild(this.statusWindow)
    this.statusWindow.open()
  }

  public update(): void {
    this.commandWindow?.update()
    this.statusWindow?.update()
    this.goldWindow?.update()

    if (
      this.input.isActionJustPressed(ZInputAction.CANCEL) ||
      this.input.isActionJustPressed(ZInputAction.MENU)
    ) {
      this.returnToMap()
    }

    if (this.commandWindow) {
      if (this.input.isActionJustPressed(ZInputAction.UP)) {
        this.commandWindow.select(this.commandWindow.index - 1)
      }
      if (this.input.isActionJustPressed(ZInputAction.DOWN)) {
        this.commandWindow.select(this.commandWindow.index + 1)
      }
      if (this.input.isActionJustPressed(ZInputAction.OK)) {
        this.onCommandOk()
      }
    }
  }

  private onCommandOk(): void {
    const index = this.commandWindow?.index
    // TODO: Implement sub-menus (Items, Status, etc)
    console.log('Selected menu item:', index)
  }

  private returnToMap(): void {
    const sceneManager = this.services.require(SceneManager)
    sceneManager.goto(SceneMap, this.prevState)
  }
}
