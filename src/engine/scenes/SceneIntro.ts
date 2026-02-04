import { Text } from '@engine/utils/pixi'
import { ZScene } from '@engine/core/ZScene'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SceneManager } from '@engine/managers/SceneManager'
import { SceneTitle } from '@engine/scenes/SceneTitle'

export class SceneIntro extends ZScene {
  private introText: Text | null = null
  private timer: number = 0
  private phase: 'fadein' | 'wait' | 'fadeout' = 'fadein'
  private isFinished: boolean = false

  constructor(services: ServiceLocator) {
    super(services)
  }

  public async init(): Promise<void> {
    console.log('[SceneIntro] Init Start')
    const centerX = this.app.screen.width / 2
    const centerY = this.app.screen.height / 2

    this.introText = new Text({
      text: 'Made by Z-Engine',
      style: {
        fill: 0xffffff,
        fontSize: 48,
        fontWeight: 'bold',
        dropShadow: {
          alpha: 0.5,
          blur: 4,
          color: 0x000000,
          distance: 4
        }
      }
    })
    this.introText.anchor.set(0.5)
    this.introText.x = centerX
    this.introText.y = centerY
    this.introText.alpha = 0

    this.container.addChild(this.introText)
    console.log('[SceneIntro] Init Complete. Text added at', centerX, centerY)
  }

  public start(): void {
    console.log('[SceneIntro] Start called')
  }

  public update(): void {
    if (!this.introText) return
    // console.log('[SceneIntro] Update', this.phase, this.introText.alpha)

    switch (this.phase) {
      case 'fadein':
        this.introText.alpha += 0.02
        if (this.introText.alpha >= 1) {
          this.introText.alpha = 1
          this.phase = 'wait'
          this.timer = 0
          console.log('[SceneIntro] Phase -> WAIT')
        }
        break

      case 'wait':
        this.timer++
        if (this.timer > 120) {
          // 2 seconds
          this.phase = 'fadeout'
          console.log('[SceneIntro] Phase -> FADEOUT')
        }
        break

      case 'fadeout':
        this.introText.alpha -= 0.02
        if (this.introText.alpha <= 0) {
          this.introText.alpha = 0
          if (!this.isFinished) {
            console.log('[SceneIntro] Finishing Intro')
            this.isFinished = true
            this.finishIntro()
          }
        }
        break
    }
  }

  private finishIntro(): void {
    console.log('[SceneIntro] Changing to SceneTitle')
    const sceneManager = this.services.require(SceneManager)
    sceneManager.goto(SceneTitle)
  }
}
