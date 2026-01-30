/* eslint-disable @typescript-eslint/no-unused-vars */
import { Container, FederatedPointerEvent, Graphics } from '@engine/utils/pixi'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'

export class GridSystem extends ZSystem {
  private container: Container
  private gridGraphics: Graphics
  private tileSize: number

  private wrapper: Container

  private width: number = 0
  private height: number = 0
  private dirty: boolean = false

  constructor(stage: Container, services: ServiceLocator, tileSize: number) {
    super(services)
    this.updateMode = SystemMode.EDIT
    this.wrapper = stage
    this.tileSize = tileSize

    this.container = null!
    this.gridGraphics = null!
  }

  public onBoot(): void {
    this.container = new Container()
    this.container.label = 'GridSystem'
    this.container.zIndex = 100
    this.wrapper.addChild(this.container)

    this.gridGraphics = new Graphics()
    this.container.addChild(this.gridGraphics)
  }

  public onSetup(): void {
    // Setup logic if needed
  }

  public onPreUpdate(_delta: number): void {
    // PreUpdate logic if needed
  }

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

  public getTileCoords(globalEvent: FederatedPointerEvent): { x: number; y: number } {
    const local = this.wrapper.toLocal(globalEvent.global)
    return {
      x: Math.floor(local.x / this.tileSize),
      y: Math.floor(local.y / this.tileSize)
    }
  }

  public setVisible(visible: boolean): void {
    if (this.container) {
      this.container.visible = visible
    }
  }
}
