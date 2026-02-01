import { Text } from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { ZScene } from '@engine/core/ZScene'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SceneManager } from '@engine/managers/SceneManager'
import { SceneMap } from '@engine/scenes/SceneMap'

export class SceneTitle extends ZScene {
  constructor(services: ServiceLocator) {
    super(services)
  }

  public async init(): Promise<void> {
    ZLogger.with('SceneTitle').log('Initializing UI...')
  }

  public start(): void {
    const centerX = this.app.screen.width / 2
    const centerY = this.app.screen.height / 2

    const titleText = new Text({
      text: 'Z-Engine Game',
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
    titleText.y = centerY - 50
    this.container.addChild(titleText)

    const subText = new Text({
      text: 'Press ENTER to Start',
      style: {
        fill: 0xdddddd,
        fontSize: 28
      }
    })
    subText.anchor.set(0.5)
    subText.x = centerX
    subText.y = centerY + 80
    this.container.addChild(subText)

    ZLogger.with('SceneTitle').log("I'm ready!")
  }

  private isStarting: boolean = false

  public update(): void {
    if (this.isStarting) return

    const okKeys = ['Enter', 'Space', 'NumpadEnter', 'KeyZ']
    const pressed = okKeys.find((k) => this.input.isKeyJustPressed(k))

    if (pressed) {
      this.isStarting = true
      ZLogger.with('SceneTitle').log(`Starting Game... (Key: ${pressed})`)
      // Transition to first map
      const engine = this.services.get('ZEngine') as {
        systemData: { startMapId: number; startX: number; startY: number }
      }
      const { startMapId = 1, startX = 0, startY = 0 } = engine?.systemData || {}
      const sceneManager = this.services.require(SceneManager)
      sceneManager.goto(SceneMap, {
        mapOrId: startMapId,
        playerX: startX,
        playerY: startY
      })
    }
  }
}
