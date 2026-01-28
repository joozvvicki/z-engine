import PIXI from '../utils/pixi'
import { TextureManager } from '../managers/TextureManager'
import { ZSystem } from '@engine/types'

export class GridSystem implements ZSystem {
  private container: PIXI.Container
  private gridGraphics: PIXI.Graphics
  private tileSize: number

  private wrapper: PIXI.Container

  // State
  private width: number = 0
  private height: number = 0
  private dirty: boolean = false

  constructor(stage: PIXI.Container, _textureManager: TextureManager, tileSize: number) {
    this.wrapper = stage
    this.tileSize = tileSize

    this.container = null!
    this.gridGraphics = null!
  }

  public onBoot(): void {
    this.container = new PIXI.Container()
    this.container.label = 'GridSystem'
    this.container.zIndex = 100 // Previous ZEngine zIndex for grid
    this.wrapper.addChild(this.container)

    this.gridGraphics = new PIXI.Graphics()
    this.container.addChild(this.gridGraphics)
  }

  public onSetup(): void {
    // Setup logic if needed
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onPreUpdate(_delta: number): void {
    // PreUpdate logic if needed
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onUpdate(_delta: number): void {
    if (!this.dirty) return

    const g = this.gridGraphics
    g.clear()

    if (this.width > 0 && this.height > 0) {
      for (let x = 0; x <= this.width; x++) {
        g.moveTo(x * this.tileSize, 0)
          .lineTo(x * this.tileSize, this.height * this.tileSize)
          .stroke({ width: 1, color: 0x000000, alpha: 0.1 })
      }
      for (let y = 0; y <= this.height; y++) {
        g.moveTo(0, y * this.tileSize)
          .lineTo(this.width * this.tileSize, y * this.tileSize)
          .stroke({ width: 1, color: 0x000000, alpha: 0.1 })
      }
    }

    this.dirty = false
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onPostUpdate(_delta: number): void {
    // PostUpdate logic if needed
  }
  public onDestroy(): void {
    if (this.container) {
      this.container.destroy({ children: true })
    }
  }

  public setSize(w: number, h: number): void {
    if (this.width !== w || this.height !== h) {
      this.width = w
      this.height = h
      this.dirty = true
    }
  }

  public getTileCoords(globalEvent: PIXI.FederatedPointerEvent): { x: number; y: number } {
    const local = this.wrapper.toLocal(globalEvent.global)
    return {
      x: Math.floor(local.x / this.tileSize),
      y: Math.floor(local.y / this.tileSize)
    }
  }
}
