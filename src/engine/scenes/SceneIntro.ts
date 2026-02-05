import { Text } from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { ZScene } from '@engine/core/ZScene'
import { SceneTitle } from '@engine/scenes/SceneTitle'
import { IEngineContext } from '@engine/types'

export class SceneIntro extends ZScene {
  private introText: Text | null = null
  private timer: number = 0
  private phase: 'fadein' | 'wait' | 'fadeout' = 'fadein'
  private isFinished: boolean = false

  // Stałe konfiguracyjne dla animacji
  private readonly FADE_SPEED = 0.0015 // Alpha na milisekundę (1.5s fade)
  private readonly WAIT_TIME = 2000 // Czas oczekiwania w ms

  constructor(engine: IEngineContext) {
    super(engine)
  }

  public async init(): Promise<void> {
    ZLogger.with('SceneIntro').info('Init Start')
    const centerX = this.engine.app.screen.width / 2
    const centerY = this.engine.app.screen.height / 2

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
  }

  public start(): void {
    ZLogger.with('SceneIntro').info('Start called')
  }

  // Używamy delta (czas w ms od ostatniej klatki) do płynnej animacji
  public update(delta: number): void {
    if (!this.introText) return

    switch (this.phase) {
      case 'fadein':
        this.introText.alpha += this.FADE_SPEED * delta
        if (this.introText.alpha >= 1) {
          this.introText.alpha = 1
          this.phase = 'wait'
          this.timer = 0
          ZLogger.with('SceneIntro').info('Phase -> WAIT')
        }
        break

      case 'wait':
        this.timer += delta
        if (this.timer > this.WAIT_TIME) {
          this.phase = 'fadeout'
          ZLogger.with('SceneIntro').info('Phase -> FADEOUT')
        }
        break

      case 'fadeout':
        this.introText.alpha -= this.FADE_SPEED * delta
        if (this.introText.alpha <= 0) {
          this.introText.alpha = 0
          if (!this.isFinished) {
            this.isFinished = true
            this.finishIntro()
          }
        }
        break
    }
  }

  private finishIntro(): void {
    ZLogger.with('SceneIntro').info('Changing to SceneTitle')
    // Bezpośredni dostęp do Managera Scen z kontekstu silnika
    this.engine.scenes.goto(SceneTitle)
  }
}
