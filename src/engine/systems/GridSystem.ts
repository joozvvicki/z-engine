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
    this.container.zIndex = 900 // Below Ghost (999) but above map layers
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
      // 1. Draw Grid Lines
      for (let x = 0; x <= this.width; x++) {
        g.moveTo(x * this.tileSize, 0).lineTo(x * this.tileSize, this.height * this.tileSize)
      }
      for (let y = 0; y <= this.height; y++) {
        g.moveTo(0, y * this.tileSize).lineTo(this.width * this.tileSize, y * this.tileSize)
      }
      g.stroke({ width: 1, color: 0x000000, alpha: 0.08 })

      const w = this.width * this.tileSize
      const h = this.height * this.tileSize

      // 2. Smooth HIGH-DENSITY multi-layered shadow (No banding)
      for (let i = 0; i < 40; i++) {
        const offset = i * 2 // Total spread ~80px
        g.rect(-offset, -offset, w + offset * 2, h + offset * 2)
        // Smooth alpha falloff for a diffuse look
        const a = 0.08 * Math.pow(1 - i / 40, 2.5)
        g.stroke({ width: 3, color: 0x000000, alpha: a })
      }

      // 3. Crisp Map Border
      // Outer subtle white "rim"
      g.rect(-1, -1, w + 2, h + 2)
      g.stroke({ width: 1, color: 0xffffff, alpha: 0.15 })

      // Main black 2px border
      g.rect(0, 0, w, h)
      g.stroke({ width: 2, color: 0x000000, alpha: 0.6 })
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
