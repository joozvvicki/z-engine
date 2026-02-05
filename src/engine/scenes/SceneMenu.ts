import { ZScene } from '@engine/core/ZScene'
import ZLogger from '@engine/utils/ZLogger'
import { ZInputAction, ZMenuParams, IEngineContext, ZEngineSignal } from '@engine/types'
import { Window_MenuCommand } from '@engine/ui/Window_MenuCommand'
import { Window_MenuStatus } from '@engine/ui/Window_MenuStatus'
import { Window_Gold } from '@engine/ui/Window_Gold'

/**
 * The main menu scene of the game.
 * Displays party status, gold, and command options.
 * Refactored for Manual Dependency Injection.
 */
export class SceneMenu extends ZScene {
  private commandWindow: Window_MenuCommand | null = null
  private statusWindow: Window_MenuStatus | null = null
  private goldWindow: Window_Gold | null = null

  private _isClosing: boolean = false

  constructor(engine: IEngineContext) {
    super(engine)
  }

  public async init(params: ZMenuParams): Promise<void> {
    ZLogger.with('SceneMenu').info('Initialized with params:', params)

    // Preload window skin
    try {
      await this.engine.textures.load('img/system/window.png')
    } catch (e) {
      ZLogger.with('SceneMenu').error('Failed to load window skin', e)
    }
  }

  public start(): void {
    const skin = this.engine.textures.get('img/system/window.png')

    if (!skin) {
      ZLogger.with('SceneMenu').error('Window skin not found, aborting render')
      return
    }

    const screenW = this.engine.app.screen.width
    const screenH = this.engine.app.screen.height

    // 1. Command Window (Left Top)
    const cmdW = 240
    const cmdHeight = 300 // Fixed height for commands

    this.commandWindow = new Window_MenuCommand(20, 20, cmdW, cmdHeight)
    this.commandWindow.windowSkin = skin
    // Wstrzykujemy InputManager bezpośrednio z silnika
    this.commandWindow.setInput(this.engine.input)
    this.container.addChild(this.commandWindow)

    // 2. Gold Window (Left Bottom)
    const goldW = 240
    const goldH = 70
    this.goldWindow = new Window_Gold(20, screenH - goldH - 20, goldW, goldH)
    this.goldWindow.windowSkin = skin
    this.container.addChild(this.goldWindow)

    // 3. Status Window (Right)
    const statusX = cmdW + 40
    const statusW = screenW - statusX - 20
    const statusH = screenH - 40
    this.statusWindow = new Window_MenuStatus(statusX, 20, statusW, statusH)
    this.statusWindow.windowSkin = skin
    this.container.addChild(this.statusWindow)

    // 4. Refresh windows with real data from GameStateManager
    const gameState = this.engine.gameState

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

  public update(delta: number): void {
    super.update(delta)

    // Update Windows (for animations)
    this.commandWindow?.update()
    this.statusWindow?.update()
    this.goldWindow?.update()

    if (this._isClosing) return

    // Input Handling via Engine Context
    if (this.engine.input.isActionJustPressed(ZInputAction.CANCEL)) {
      this.closeMenu()
    }
  }

  private async closeMenu(): Promise<void> {
    if (this._isClosing) return
    this._isClosing = true

    // Animate windows closing
    this.commandWindow?.close()
    this.statusWindow?.close()
    this.goldWindow?.close()

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Pop scene via Engine Context
    await this.engine.scenes.pop({ fade: true })
    this.engine.eventBus.emit(ZEngineSignal.MenuClosed, {})
  }
}
