import { Container, Sprite, Texture, Rectangle } from '@engine/utils/pixi'
import { ZMoveable } from '@engine/core/MovementProcessor'
import { ZEventGraphic, ZMoveCommand } from '@engine/types'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import { TextureManager } from '@engine/managers/TextureManager'

/**
 * Encapsulates the visual representation and state of a character (Player or Event).
 * Implements ZMoveable for integration with MovementProcessor.
 */
export class CharacterSprite implements ZMoveable {
  // ZMoveable Interface Implementation
  public id: string
  public x: number = 0 // Grid X
  public y: number = 0 // Grid Y
  public direction: 'down' | 'left' | 'right' | 'up' = 'down'
  public isMoving: boolean = false
  public moveSpeed: number = 5
  public moveFrequency: number = 3
  public moveRoute: ZMoveCommand[] = []
  public moveRouteIndex: number = -1
  public moveRouteRepeat: boolean = true
  public moveRouteSkip: boolean = true
  public moveType: 'fixed' | 'random' | 'approach' | 'custom' = 'fixed'
  public isThrough: boolean = false
  public waitTimer: number = 0

  public walkAnim: boolean = true
  public stepAnim: boolean = false
  public directionFix: boolean = false
  public transparent: boolean = false
  public opacity: number = 255

  public targetX: number = 0 // Grid Target X
  public targetY: number = 0 // Grid Target Y
  public realX: number = 0 // Pixel X (top-left of tile)
  public realY: number = 0 // Pixel Y (top-left of tile)

  // PIXI Visual Components
  public container: Container
  private _mainSprite: Sprite

  private _textureManager: TextureManager
  private _tileSize: number

  private _baseX: number = 0
  private _baseY: number = 0
  private _frameW: number = 0
  private _frameH: number = 0
  private _colsPerChar: number = 3
  private _isDirectional: boolean = true // Track if graphic supports 4-dir rows
  private _animationFrame: number = 0
  private _animationTimer: number = 0

  // Interaction State (Used by EntityRenderSystem)
  public preInteractionDirection: 'down' | 'left' | 'right' | 'up' | null = null
  public isInteracting: boolean = false
  public autoUpdateMovement: boolean = true

  constructor(id: string, textureManager: TextureManager, tileSize: number) {
    this.id = id
    this._textureManager = textureManager
    this._tileSize = tileSize

    this.container = new Container()
    this.container.label = `Character:${id}`
    this._mainSprite = new Sprite()
    this.container.addChild(this._mainSprite)
  }

  private _currentGraphic: ZEventGraphic | null = null

  /**
   * Loads and sets the character's graphic.
   */
  public async setGraphic(graphic: ZEventGraphic | null): Promise<void> {
    const isSameGraphic = this.areGraphicsEqual(graphic, this._currentGraphic)
    if (isSameGraphic) return

    const isSameAsset = graphic?.assetId === this._currentGraphic?.assetId

    this._currentGraphic = graphic

    if (!graphic || !graphic.assetId) {
      this._mainSprite.visible = false
      return
    }

    try {
      if (!isSameAsset) {
        await this._textureManager.load(graphic.assetId)
      }

      const tex = this._textureManager.get(graphic.assetId)
      if (!tex) return

      const { frameW, frameH, divW, divH } = SpriteUtils.getFrameRect(graphic, tex)
      this._colsPerChar = divW % 4 === 0 && divW % 3 !== 0 ? 4 : 3
      const snapX = this._colsPerChar
      const snapY = divH % 4 === 0 ? 4 : 1
      this._isDirectional = snapY === 4

      this._baseX = Math.floor((graphic.x || 0) / snapX) * snapX
      this._baseY = Math.floor((graphic.y || 0) / snapY) * snapY

      this._frameW = frameW
      this._frameH = frameH

      // Extract initial direction if using a character sheet
      if (this._isDirectional) {
        const rowOffset = (graphic.y || 0) - this._baseY
        const dirMap: Record<number, 'down' | 'left' | 'right' | 'up'> = {
          0: 'down',
          1: 'left',
          2: 'right',
          3: 'up'
        }
        if (dirMap[rowOffset]) {
          this.direction = dirMap[rowOffset]
        }
      }

      // Calculate the final frame coordinates immediately
      const row = this._isDirectional ? this.getDirectionRow(this.direction) : 0
      const frames = this._colsPerChar === 4 ? [0, 1, 2, 3] : [0, 1, 2, 1]
      const col = frames[this._animationFrame] || 0
      const finalX = (this._baseX + col) * this._frameW
      const finalY = (this._baseY + row) * this._frameH

      this._mainSprite.texture = new Texture({
        source: tex.source,
        frame: new Rectangle(finalX, finalY, frameW, frameH)
      })

      this._mainSprite.anchor.set(0.5, 1)
      this._mainSprite.visible = true

      this.refreshTexture()
    } catch (e) {
      console.error(`[CharacterSprite] Failed to set graphic for ${this.id}:`, e)
      this._mainSprite.visible = false
    }
  }

  private areGraphicsEqual(g1: ZEventGraphic | null, g2: ZEventGraphic | null): boolean {
    if (g1 === g2) return true
    if (!g1 || !g2) return false

    // Helper to treat undefined/null as 0 for numeric fields
    const eq = (a?: number | null, b?: number | null): boolean => (a || 0) === (b || 0)

    return (
      g1.assetId === g2.assetId &&
      g1.group === g2.group &&
      eq(g1.x, g2.x) &&
      eq(g1.y, g2.y) &&
      eq(g1.w, g2.w) &&
      eq(g1.h, g2.h) &&
      eq(g1.srcX, g2.srcX) &&
      eq(g1.srcY, g2.srcY) &&
      eq(g1.srcW, g2.srcW) &&
      eq(g1.srcH, g2.srcH) &&
      eq(g1.divW, g2.divW) &&
      eq(g1.divH, g2.divH)
    )
  }

  /**
   * Updates movement interpolation and animation.
   */
  public update(delta: number): void {
    if (this.isMoving && this.autoUpdateMovement) {
      this.updateMovement(delta)
    }
    this.updateAnimation(delta)
    this.refreshTexture()
    this.updateVisualPosition()
  }

  private _lastFrame: { x: number; y: number; w: number; h: number; source: unknown } | null = null

  private updateMovement(delta: number): void {
    // RPG Maker style speed: Speed 4 = 1 tile per 32 frames (at 60fps)
    const baseSpeed = Math.pow(2, this.moveSpeed - 4) * (this._tileSize / 32)
    const speed = (baseSpeed * delta) / 16.66
    const targetRealX = this.targetX * this._tileSize
    const targetRealY = this.targetY * this._tileSize

    if (this.realX < targetRealX) this.realX = Math.min(this.realX + speed, targetRealX)
    else if (this.realX > targetRealX) this.realX = Math.max(this.realX - speed, targetRealX)

    if (this.realY < targetRealY) this.realY = Math.min(this.realY + speed, targetRealY)
    else if (this.realY > targetRealY) this.realY = Math.max(this.realY - speed, targetRealY)

    if (this.realX === targetRealX && this.realY === targetRealY) {
      this.isMoving = false
      this.x = this.targetX
      this.y = this.targetY
    }
  }

  /**
   * Updates the container's screen position based on realX and realY.
   */
  public updateVisualPosition(): void {
    this.container.x = this.realX + this._tileSize / 2
    this.container.y = this.realY + this._tileSize
    this.container.zIndex = this.container.y + 0.1
  }

  private updateAnimation(delta: number): void {
    const shouldAnimate = (this.isMoving && this.walkAnim) || this.stepAnim

    if (shouldAnimate && !this.isInteracting) {
      this._animationTimer += delta
      const threshold = Math.max(60, 450 - (this.moveSpeed || 4) * 60)

      if (this._animationTimer > threshold) {
        this._animationTimer = 0
        this._animationFrame = (this._animationFrame + 1) % 4
      }
    } else {
      this._animationFrame = SpriteUtils.getIdleFrameIndex(this._colsPerChar)
      this._animationTimer = 0
    }
  }

  /**
   * Updates the sprite's texture frame based on direction and animation frame.
   */
  public refreshTexture(): void {
    if (!this._mainSprite.visible || !this._mainSprite.texture || !this._mainSprite.texture.source)
      return

    const row = this._isDirectional ? this.getDirectionRow(this.direction) : 0
    const frames = this._colsPerChar === 4 ? [0, 1, 2, 3] : [0, 1, 2, 1]
    const col = frames[this._animationFrame] || 0

    const finalX = (this._baseX + col) * this._frameW
    const finalY = (this._baseY + row) * this._frameH
    const source = this._mainSprite.texture.source

    // Optimization: Only update texture object if frame or source changed
    if (
      this._lastFrame &&
      this._lastFrame.x === finalX &&
      this._lastFrame.y === finalY &&
      this._lastFrame.w === this._frameW &&
      this._lastFrame.h === this._frameH &&
      this._lastFrame.source === source
    ) {
      return
    }

    this._lastFrame = { x: finalX, y: finalY, w: this._frameW, h: this._frameH, source }

    this._mainSprite.texture = new Texture({
      source: source,
      frame: new Rectangle(finalX, finalY, this._frameW, this._frameH)
    })

    this.container.alpha = this.transparent ? 0 : this.opacity / 255
  }

  private getDirectionRow(dir: 'down' | 'left' | 'right' | 'up'): number {
    const map = { down: 0, left: 1, right: 2, up: 3 }
    return map[dir] ?? 0
  }

  /**
   * Instantly snaps the character to a grid position.
   */
  public setGridPosition(x: number, y: number): void {
    this.x = x
    this.y = y
    this.targetX = x
    this.targetY = y
    this.realX = x * this._tileSize
    this.realY = y * this._tileSize
    this.updateVisualPosition()
  }

  public destroy(): void {
    this.container.destroy({ children: true })
  }
}
