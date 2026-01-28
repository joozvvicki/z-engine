import PIXI from '../utils/pixi'
import { TextureManager } from '../managers/TextureManager'
import { ZSystem, type TileSelection, ZTool } from '@engine/types'

export class GhostSystem extends ZSystem {
  private container: PIXI.Container
  private textureManager: TextureManager
  private tileSize: number

  private wrapper: PIXI.Container

  // State
  private active: boolean = false
  private dirty: boolean = false
  private position: { x: number; y: number } = { x: 0, y: 0 }
  private selection: TileSelection | null = null
  private currentTool: ZTool = ZTool.brush
  private shapeStart: { x: number; y: number } | null = null
  private shapeEnd: { x: number; y: number } | null = null
  private isShape: boolean = false

  constructor(stage: PIXI.Container, textureManager: TextureManager, tileSize: number) {
    super()

    this.wrapper = stage
    this.textureManager = textureManager
    this.tileSize = tileSize
    this.container = null!
  }

  public onBoot(): void {
    this.container = new PIXI.Container()
    this.container.label = 'GhostContainer'
    this.container.zIndex = 999
    this.container.visible = false
    this.wrapper.addChild(this.container)
  }

  public onUpdate(): void {
    if (!this.dirty) return

    this.container.removeChildren()
    this.container.visible = this.active

    if (!this.active) {
      this.dirty = false
      return
    }

    if (this.isShape && this.shapeStart && this.shapeEnd) {
      this.renderShape()
    } else if (!this.isShape && this.selection) {
      this.renderSingleGhost()
    }

    this.dirty = false
  }

  public onDestroy(): void {
    if (this.container) {
      this.container.destroy({ children: true })
    }
  }

  public update(x: number, y: number, sel: TileSelection, tool: ZTool): void {
    this.active = true
    this.isShape = false
    this.position = { x, y }
    this.selection = sel
    this.currentTool = tool
    this.dirty = true
  }

  public updateShape(
    start: { x: number; y: number },
    end: { x: number; y: number },
    tool: ZTool
  ): void {
    this.active = true
    this.isShape = true
    this.shapeStart = start
    this.shapeEnd = end
    this.currentTool = tool
    this.dirty = true
  }

  public hide(): void {
    if (this.active) {
      this.active = false
      this.dirty = true
    }
  }

  private renderSingleGhost(): void {
    if (!this.selection) return

    this.container.x = this.position.x * this.tileSize
    this.container.y = this.position.y * this.tileSize

    if (this.currentTool === ZTool.eraser) {
      const g = new PIXI.Graphics()
        .rect(0, 0, this.tileSize, this.tileSize)
        .fill({ color: 0xff0000, alpha: 0.3 })
        .stroke({ width: 1, color: 0xff0000, alpha: 0.8 })
      this.container.addChild(g)
    } else if (this.currentTool === ZTool.event) {
      const g = new PIXI.Graphics()
        .rect(0, 0, this.tileSize, this.tileSize)
        .fill({ color: 0x00ffff, alpha: 0.3 })
        .stroke({ width: 1, color: 0x00ffff, alpha: 0.8 })
      this.container.addChild(g)
    } else if (this.currentTool === ZTool.brush || this.currentTool === ZTool.bucket) {
      const tex = this.textureManager.get(this.selection.tilesetId)
      if (tex) {
        const sprite = new PIXI.Sprite(
          new PIXI.Texture({
            source: tex.source,
            frame: new PIXI.Rectangle(
              this.selection.x * this.tileSize,
              this.selection.y * this.tileSize,
              this.selection.isAutotile ? this.tileSize : this.selection.w * this.tileSize,
              this.selection.isAutotile ? this.tileSize : this.selection.h * this.tileSize
            )
          })
        )
        sprite.alpha = 0.5
        this.container.addChild(sprite)
      }
    }
  }

  private renderShape(): void {
    if (!this.shapeStart || !this.shapeEnd) return

    this.container.x = 0
    this.container.y = 0

    const g = new PIXI.Graphics()
    const x = Math.min(this.shapeStart.x, this.shapeEnd.x) * this.tileSize
    const y = Math.min(this.shapeStart.y, this.shapeEnd.y) * this.tileSize
    const w = (Math.abs(this.shapeStart.x - this.shapeEnd.x) + 1) * this.tileSize
    const h = (Math.abs(this.shapeStart.y - this.shapeEnd.y) + 1) * this.tileSize

    if (this.currentTool === ZTool.rectangle) {
      g.rect(x, y, w, h)
    } else if (this.currentTool === ZTool.circle) {
      g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2)
    }

    g.fill({ color: 0x00ff00, alpha: 0.2 }).stroke({ width: 2, color: 0x00ff00, alpha: 0.6 })

    this.container.addChild(g)
  }
}
