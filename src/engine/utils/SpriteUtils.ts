import PIXI from '@engine/utils/pixi'
import { ZEventGraphic } from '@engine/types'
import { TextureManager } from '@engine/managers/TextureManager'

export class SpriteUtils {
  /**
   * Creates a sprite for an Event or Player.
   * Handles both Tile graphics and Character Sheet graphics.
   */
  public static createEventSprite(
    graphic: ZEventGraphic,
    textureManager: TextureManager,
    tileSize: number,
    isEditor: boolean = false
  ): PIXI.Sprite | null {
    if (!graphic || !graphic.assetId) return null

    const tex = textureManager.get(graphic.assetId)
    if (!tex) return null

    let sprite: PIXI.Sprite

    if (graphic.group === 'character') {
      // Character Sheet Logic
      let rect: PIXI.Rectangle

      // If source pixel rect is explicitly provided, use it
      if (
        graphic.srcW !== undefined &&
        graphic.srcH !== undefined &&
        graphic.srcX !== undefined &&
        graphic.srcY !== undefined
      ) {
        rect = new PIXI.Rectangle(graphic.srcX, graphic.srcY, graphic.srcW, graphic.srcH)
      } else {
        // Fallback: Use graphic.w/h for division logic (default 3x4 for standard sheets)
        const divW = graphic.w || 3
        const divH = graphic.h || 4
        const frameW = tex.width / divW
        const frameH = tex.height / divH
        // Use graphic.x/y as frame index if available, else 0,0
        const fx = (graphic.x || 0) * (tex.width / divW)
        const fy = (graphic.y || 0) * (tex.height / divH)

        rect = new PIXI.Rectangle(fx, fy, frameW, frameH)
      }

      sprite = new PIXI.Sprite(
        new PIXI.Texture({
          source: tex.source,
          frame: rect
        })
      )

      // Alignment: Bottom-Center feet at Tile Bottom-Center
      sprite.anchor.set(0.5, 1)

      // Editor-specific scaling to fit inside the tile box (Ghost)
      if (isEditor) {
        // If the character is larger than tile, scale it down to fit visually in the ghost box
        const maxDim = Math.max(rect.width, rect.height)
        if (maxDim > tileSize) {
          const scale = (tileSize / maxDim) * 0.9
          sprite.scale.set(scale)
        }
        // In editor, we center it in the tile box
        sprite.anchor.set(0.5, 0.5)
        sprite.x = tileSize / 2
        sprite.y = tileSize / 2
      }
    } else {
      // Tile Logic
      let rect: PIXI.Rectangle

      if (
        graphic.srcW !== undefined &&
        graphic.srcH !== undefined &&
        graphic.srcX !== undefined &&
        graphic.srcY !== undefined
      ) {
        rect = new PIXI.Rectangle(graphic.srcX, graphic.srcY, graphic.srcW, graphic.srcH)
      } else {
        const frameX = graphic.x * tileSize
        const frameY = graphic.y * tileSize
        const frameW = graphic.w * tileSize
        const frameH = graphic.h * tileSize
        rect = new PIXI.Rectangle(frameX, frameY, frameW, frameH)
      }

      sprite = new PIXI.Sprite(
        new PIXI.Texture({
          source: tex.source,
          frame: rect
        })
      )

      // Alignment: Top-Left (Standard Tile)
      sprite.anchor.set(0, 0)
    }

    return sprite
  }
}
