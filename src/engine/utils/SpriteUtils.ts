import PIXI from '@engine/utils/pixi'
import { ZEventGraphic } from '@engine/types'
import { TextureManager } from '@engine/managers/TextureManager'

export class SpriteUtils {
  /**
   * Creates a sprite for an Event or Player.
   * Handles both Tile graphics and Character Sheet graphics.
   */
  public static getFrameRect(
    graphic: ZEventGraphic,
    tex: { width: number; height: number }
  ): { frameW: number; frameH: number; divW: number; divH: number; fx: number; fy: number } {
    const ratio = tex.width / tex.height
    let divW = graphic.w || 0
    let divH = graphic.h || 0

    let frameW = 0
    let frameH = 0

    // Priority 1: Use explicit pixel dimensions if provided (from CharacterSelector)
    if (graphic.srcW && graphic.srcH && graphic.srcW > 1 && graphic.srcH > 1) {
      frameW = graphic.srcW
      frameH = graphic.srcH
      divW = Math.round(tex.width / frameW)
      divH = Math.round(tex.height / frameH)
    } else {
      // Priority 2: Use divisions if provided
      if (divW <= 1 || divH <= 1) {
        // Fallback: Smart detection
        const tolerance = 0.1
        if (Math.abs(ratio - 192 / 288) < tolerance || Math.abs(ratio - 12 / 8) < tolerance) {
          // RM standard (3x4 or 12x8)
          divW = ratio > 1 ? 12 : 3
          divH = ratio > 1 ? 8 : 4
        } else if (Math.abs(ratio - 1.0) < tolerance) {
          // Square (4x4)
          divW = 4
          divH = 4
        } else {
          // Default fallback
          divW = 3
          divH = 4
        }
      }
      frameW = tex.width / divW
      frameH = tex.height / divH
    }

    const fx = (graphic.x || 0) * frameW
    const fy = (graphic.y || 0) * frameH

    return { frameW, frameH, divW, divH, fx, fy }
  }

  public static getIdleFrameIndex(divW: number): number {
    // 4-column sheets (4x4) use frame 0 as idle
    // 3-column sheets (RM standard) use frame 1 as idle
    return divW % 4 === 0 && divW % 3 !== 0 ? 0 : 1
  }

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
        const { frameW, frameH, divW, divH, fx, fy } = SpriteUtils.getFrameRect(graphic, tex)
        rect = new PIXI.Rectangle(fx, fy, frameW, frameH)

        if (graphic.assetId.includes('characters') || graphic.group === 'character') {
          console.log('[SpriteUtils] Character Slicing:', {
            asset: graphic.assetId,
            texWidth: tex.width,
            texHeight: tex.height,
            divW,
            divH,
            frameW,
            frameH,
            fx,
            fy,
            rectW: rect.width,
            rectH: rect.height,
            srcX: graphic.srcX
          })
        }
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
        // In editor, we center it horizontally and align to bottom of tile
        sprite.anchor.set(0.5, 1)
        sprite.x = tileSize / 2
        sprite.y = tileSize
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
