import { ZSystem } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZEngineSignal, ZMenuParams, ZInputAction } from '@engine/types'
import { SceneManager } from '@engine/managers/SceneManager'
import { InputManager } from '@engine/managers/InputManager'
import { SceneMenu } from '@engine/scenes/SceneMenu'

export class MenuSystem extends ZSystem {
  constructor(services: ServiceLocator) {
    super(services)
  }

  public onBoot(): void {
    this.bus.on(ZEngineSignal.MenuRequested, (data) => {
      this.callMenu(data)
    })
  }

  private callMenu(data: ZMenuParams): void {
    const sceneManager = this.services.require(SceneManager)
    const inputManager = this.services.require(InputManager)

    inputManager.clearAction(ZInputAction.CANCEL)

    sceneManager.push(SceneMenu, data, { fade: true })
  }
}
