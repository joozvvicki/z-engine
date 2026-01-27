import * as PIXI from 'pixi.js'
import { TileSelection, ZTool } from '@ui/stores/editor'
import { TextureManager } from '../managers/TextureManager'

export class GhostSystem {
  private container: PIXI.Container
  private textureManager: TextureManager
  private tileSize: number

  constructor(stage: PIXI.Container, textureManager: TextureManager, tileSize: number) {
    this.container = new PIXI.Container()
    this.container.label = 'GhostContainer'
    this.container.zIndex = 999
    stage.addChild(this.container)

    this.textureManager = textureManager
    this.tileSize = tileSize
  }

  public update(x: number, y: number, sel: TileSelection, tool: ZTool) {
    this.container.removeChildren()
    this.container.visible = true
    this.container.x = x * this.tileSize
    this.container.y = y * this.tileSize

    if (tool === ZTool.eraser) {
      const g = new PIXI.Graphics()
        .rect(0, 0, this.tileSize, this.tileSize)
        .fill({ color: 0xff0000, alpha: 0.3 })
        .stroke({ width: 1, color: 0xff0000, alpha: 0.8 })
      this.container.addChild(g)
    } else if (tool === ZTool.brush || tool === ZTool.bucket) {
      const tex = this.textureManager.get(sel.tilesetId)
      if (tex) {
        const sprite = new PIXI.Sprite(
          new PIXI.Texture({
            source: tex.source,
            frame: new PIXI.Rectangle(
              sel.x * this.tileSize,
              sel.y * this.tileSize,
              sel.isAutotile ? this.tileSize : sel.w * this.tileSize,
              sel.isAutotile ? this.tileSize : sel.h * this.tileSize
            )
          })
        )
        sprite.alpha = 0.5
        this.container.addChild(sprite)
      }
    }
  }

  public updateShape(start: { x: number; y: number }, end: { x: number; y: number }, tool: ZTool) {
    this.container.removeChildren()
    this.container.visible = true
    this.container.x = 0
    this.container.y = 0

    const g = new PIXI.Graphics()
    const x = Math.min(start.x, end.x) * this.tileSize
    const y = Math.min(start.y, end.y) * this.tileSize
    const w = (Math.abs(start.x - end.x) + 1) * this.tileSize
    const h = (Math.abs(start.y - end.y) + 1) * this.tileSize

    if (tool === ZTool.rectangle) {
      g.rect(x, y, w, h)
    } else if (tool === ZTool.circle) {
      g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2)
    }

    g.fill({ color: 0x00ff00, alpha: 0.2 }).stroke({ width: 2, color: 0x00ff00, alpha: 0.6 })

    this.container.addChild(g)
  }

  public hide() {
    this.container.visible = false
  }
}
