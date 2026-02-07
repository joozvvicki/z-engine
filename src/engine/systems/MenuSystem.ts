import { ZEngineSignal, ZMenuParams, ZInputAction } from '@engine/types'
import { SceneMenu } from '@engine/scenes/SceneMenu'
import { ZEventBus } from '@engine/core'
import { InputManager } from '@engine/managers'
import { SceneManager } from '@engine/managers'

export class MenuSystem {
  private eventBus: ZEventBus
  private input: InputManager
  private scenes: SceneManager

  constructor(eventBus: ZEventBus, input: InputManager, scenes: SceneManager) {
    this.eventBus = eventBus
    this.input = input
    this.scenes = scenes
  }

  public onBoot(): void {
    this.eventBus.on(ZEngineSignal.MenuRequested, (data) => {
      this.callMenu(data)
    })
  }

  private callMenu(data: ZMenuParams): void {
    this.input.clearAction(ZInputAction.CANCEL)

    const screenshot = this.scenes.captureScreenshot()

    this.scenes.push(SceneMenu, { ...data, backgroundTexture: screenshot }, { fade: false })
  }
}
