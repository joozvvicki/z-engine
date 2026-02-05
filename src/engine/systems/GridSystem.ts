import { Container, FederatedPointerEvent, Graphics } from '@engine/utils/pixi'

/**
 * Renders a visual grid overlay for the editor.
 * Refactored for Manual Dependency Injection.
 */
export class GridSystem {
  public container: Container
  private gridGraphics: Graphics
  private wrapper: Container
  private tileSize: number

  private width: number = 0
  private height: number = 0
  private dirty: boolean = false

  constructor(stage: Container, tileSize: number) {
    this.wrapper = stage
    this.tileSize = tileSize

    this.container = new Container()
    this.container.label = 'GridSystem'
    this.container.zIndex = 100
    this.container.eventMode = 'none' // Grid shouldn't block events

    // Add directly to the scene layer provided
    this.wrapper.addChild(this.container)

    this.gridGraphics = new Graphics()
    this.container.addChild(this.gridGraphics)
  }

  public onUpdate(): void {
    if (!this.dirty) return

    const g = this.gridGraphics
    g.clear()

    if (this.width > 0 && this.height > 0 && isFinite(this.width) && isFinite(this.height)) {
      for (let x = 0; x <= this.width; x++) {
        g.moveTo(x * this.tileSize, 0).lineTo(x * this.tileSize, this.height * this.tileSize)
      }
      for (let y = 0; y <= this.height; y++) {
        g.moveTo(0, y * this.tileSize).lineTo(this.width * this.tileSize, y * this.tileSize)
      }
      g.stroke({ width: 1, color: 0x000000, alpha: 0.1 })
    }

    this.dirty = false
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
    const local = this.container.toLocal(globalEvent.global)
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
