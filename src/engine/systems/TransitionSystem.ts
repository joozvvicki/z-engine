import { Graphics } from '@engine/utils/pixi'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'

export class TransitionSystem extends ZSystem {
  public container: Graphics
  private _isFading: boolean = false
  private fadeTarget: number = 0
  private fadeDuration: number = 0
  private fadeTimer: number = 0
  private resolvePromise: ((value: void | PromiseLike<void>) => void) | null = null

  public get isTransitioning(): boolean {
    return this._isFading
  }

  constructor(services: ServiceLocator) {
    super(services)
    this.updateMode = SystemMode.PLAY
    this.container = new Graphics()
    // Initial size, will be updated by resize()
    this.container.rect(0, 0, 1, 1)
    this.container.fill(0x000000)
    this.container.alpha = 0
    this.container.zIndex = 10000 // Ensure it's on top of everything
  }

  public fadeOut(duration: number = 300): Promise<void> {
    return this.startFade(1, duration)
  }

  public fadeIn(duration: number = 300): Promise<void> {
    return this.startFade(0, duration)
  }

  private startFade(target: number, duration: number): Promise<void> {
    // If already at target, resolve immediately
    if (this.container.alpha === target && !this._isFading) {
      return Promise.resolve()
    }

    this.fadeTarget = target
    this.fadeDuration = duration
    this.fadeTimer = 0
    this._isFading = true

    return new Promise((resolve) => {
      this.resolvePromise = resolve
    })
  }

  public resize(width: number, height: number): void {
    this.container.clear()
    this.container.rect(0, 0, width, height)
    this.container.fill(0x000000)
  }

  onUpdate(delta: number): void {
    if (this._isFading) {
      this.fadeTimer += delta
      const progress = Math.min(this.fadeTimer / this.fadeDuration, 1)

      const startAlpha = this.fadeTarget === 1 ? 0 : 1
      this.container.alpha = startAlpha + (this.fadeTarget - startAlpha) * progress

      if (progress >= 1) {
        this.container.alpha = this.fadeTarget
        this._isFading = false
        if (this.resolvePromise) {
          const resolve = this.resolvePromise
          this.resolvePromise = null // Clear before calling to avoid re-entry issues
          resolve()
        }
      }
    }
  }
}
