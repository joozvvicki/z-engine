import { ZScene } from '@engine/core/ZScene'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { TextureManager } from '@engine/managers/TextureManager'
import { SceneManager } from '@engine/managers/SceneManager'
import { InputManager } from '@engine/managers/InputManager'
import { GameStateManager } from '@engine/managers/GameStateManager'
import { ZInputAction, ZMenuParams } from '@engine/types'
import { Window_MenuCommand } from '@engine/ui/Window_MenuCommand'
import { Window_MenuStatus } from '@engine/ui/Window_MenuStatus'
import { Window_Gold } from '@engine/ui/Window_Gold'

/**
 * The main menu scene of the game.
 * Displays party status, gold, and command options.
 */
export class SceneMenu extends ZScene {
  private commandWindow: Window_MenuCommand | null = null
  private statusWindow: Window_MenuStatus | null = null
  private goldWindow: Window_Gold | null = null

  private _isClosing: boolean = false

  constructor(services: ServiceLocator, params: ZMenuParams) {
    super(services)
    // We can use params if we need to return to the correct position/direction
    console.log('[SceneMenu] Initialized with params:', params)
  }

  public start(): void {
    const textureManager = this.services.require(TextureManager)
    const skin = textureManager.get('img/system/window.png')
    if (!skin) return

    const screenW = 800
    const screenH = 600

    // Command Window (Left Top)
    const cmdW = 240
    const cmdH = 300
    this.commandWindow = new Window_MenuCommand(20, 20, cmdW, cmdH)
    this.commandWindow.windowSkin = skin
    this.container.addChild(this.commandWindow)

    // Gold Window (Left Bottom)
    const goldW = 240
    const goldH = 70
    this.goldWindow = new Window_Gold(20, screenH - goldH - 20, goldW, goldH)
    this.goldWindow.windowSkin = skin
    this.container.addChild(this.goldWindow)

    // Status Window (Right)
    const statusX = cmdW + 40
    const statusW = screenW - statusX - 20
    const statusH = screenH - 40
    this.statusWindow = new Window_MenuStatus(statusX, 20, statusW, statusH)
    this.statusWindow.windowSkin = skin
    this.container.addChild(this.statusWindow)

    // Refresh windows with real data
    const gameState = this.services.require(GameStateManager)
    if (this.statusWindow) {
      this.statusWindow.setActors(gameState.party.members)
    }
    if (this.goldWindow) {
      this.goldWindow.setGold(gameState.party.gold)
    }

    this.commandWindow?.open()
    this.statusWindow?.open()
    this.goldWindow?.open()
  }

  public update(): void {
    if (this._isClosing) return

    const input = this.services.require(InputManager)

    if (
      input.isActionJustPressed(ZInputAction.CANCEL) ||
      input.isActionJustPressed(ZInputAction.MENU)
    ) {
      this.closeMenu()
    }
  }

  private closeMenu(): void {
    if (this._isClosing) return
    this._isClosing = true

    // Animate windows closing
    this.commandWindow?.close()
    this.statusWindow?.close()
    this.goldWindow?.close()

    // Short delay for animation before popping the scene
    setTimeout(() => {
      const sceneManager = this.services.require(SceneManager)
      sceneManager.pop()
    }, 200)
  }
}
