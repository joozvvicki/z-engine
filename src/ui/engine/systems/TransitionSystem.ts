import { Container, Graphics } from '../utils/pixi'
import { ZSystem } from '@engine/types'

export class TransitionSystem extends ZSystem {
  private overlay: Graphics
  private isFading: boolean = false
  private fadeTarget: number = 0
  private fadeDuration: number = 0
  private fadeTimer: number = 0
  private resolvePromise: ((value: void | PromiseLike<void>) => void) | null = null

  constructor(private stage: Container) {
    super()
    this.overlay = new Graphics()
    // Initial size, will be updated by resize()
    this.overlay.rect(0, 0, 1, 1)
    this.overlay.fill(0x000000)
    this.overlay.alpha = 0
    this.overlay.zIndex = 10000 // Ensure it's on top of everything
    this.stage.addChild(this.overlay)
  }

  public fadeOut(duration: number = 300): Promise<void> {
    return this.startFade(1, duration)
  }

  public fadeIn(duration: number = 300): Promise<void> {
    return this.startFade(0, duration)
  }

  private startFade(target: number, duration: number): Promise<void> {
    // If already at target, resolve immediately
    if (this.overlay.alpha === target && !this.isFading) {
      return Promise.resolve()
    }

    this.fadeTarget = target
    this.fadeDuration = duration
    this.fadeTimer = 0
    this.isFading = true

    return new Promise((resolve) => {
      this.resolvePromise = resolve
    })
  }

  public resize(width: number, height: number): void {
    this.overlay.clear()
    this.overlay.rect(0, 0, width, height)
    this.overlay.fill(0x000000)
  }

  onUpdate(delta: number): void {
    if (this.isFading) {
      this.fadeTimer += delta
      const progress = Math.min(this.fadeTimer / this.fadeDuration, 1)

      const startAlpha = this.fadeTarget === 1 ? 0 : 1
      this.overlay.alpha = startAlpha + (this.fadeTarget - startAlpha) * progress

      if (progress >= 1) {
        this.overlay.alpha = this.fadeTarget
        this.isFading = false
        if (this.resolvePromise) {
          const resolve = this.resolvePromise
          this.resolvePromise = null // Clear before calling to avoid re-entry issues
          resolve()
        }
      }
    }
  }
}
