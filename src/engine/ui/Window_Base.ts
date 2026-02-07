import { Container, Sprite, Texture, Graphics, Rectangle, TilingSprite } from '@engine/utils/pixi'

export class Window_Base extends Container {
  protected _width: number = 0
  protected _height: number = 0
  protected _padding: number = 18

  protected _backSprite: Sprite | TilingSprite | null = null
  protected _frameContainer: Container

  // Frame parts
  private _tl: Sprite | null = null
  private _tr: Sprite | null = null
  private _bl: Sprite | null = null
  private _br: Sprite | null = null
  private _top: TilingSprite | null = null
  private _bottom: TilingSprite | null = null
  private _left: TilingSprite | null = null
  private _right: TilingSprite | null = null

  protected _contents: Container
  protected _mask: Graphics

  // Animation State
  private _openness: number = 0
  private _opening: boolean = false
  private _closing: boolean = false

  // Slide Animation State
  private _slideDirection: 'left' | 'right' | 'top' | 'bottom' | null = null
  private _slideTargetX: number = 0
  private _slideTargetY: number = 0

  // Active State (for input handling)
  public active: boolean = false

  // Standard RPG Maker MV skin metrics
  // Background Pattern: 0,0 64x64 (Tiled)
  // Frame: 64,0 64x64 (Corners 16, Edges 32, Corner 16)
  private _cornerSize: number = 16 // Rendered size (matches source)

  constructor(x: number, y: number, width: number, height: number) {
    super()
    this.x = x
    this.y = y
    this._width = width
    this._height = height

    // Set pivot to center-vertical to allow "opening from center" animation
    this.pivot.y = height / 2
    this.y += height / 2

    // Frame Container (draws frame parts)
    this._frameContainer = new Container()
    this.addChild(this._frameContainer)

    // Content container
    this._contents = new Container()
    this._contents.x = this._padding
    this._contents.y = this._padding
    this.addChild(this._contents)

    // Mask for contents
    this._mask = new Graphics()
    this._contents.mask = this._mask
    this.addChild(this._mask)

    // Default closed state
    this._openness = 0
    this.scale.y = 0
    this.visible = false

    this.refresh()
  }

  public set windowSkin(texture: Texture) {
    if (this._backSprite) {
      this.removeChild(this._backSprite)
      this._backSprite.destroy()
      this._backSprite = null
    }

    // Clear old frame parts
    this._frameContainer.removeChildren()
    this._tl = this._tr = this._bl = this._br = null
    this._top = this._bottom = this._left = this._right = null

    // 1. Background (0,0, 64,64) - Scaled to fill window
    const backRect = new Rectangle(0, 0, 64, 64)
    const backTex = new Texture({ source: texture.source, frame: backRect })

    // Use regular Sprite with scale instead of TilingSprite for stretched background
    this._backSprite = new Sprite(backTex)
    this._backSprite.width = this._width
    this._backSprite.height = this._height
    this._backSprite.alpha = 0.6
    this.addChildAt(this._backSprite, 0)

    // 2. Frame Construction - 128x128 format with frame at (64,0)
    // Background: 0,0 → 64,64
    // Frame: 64,0 → 128,64
    // Standard structure: 16(TL) 32(T) 16(TR)
    //                     32(L)  ...   32(R)
    //                     16(BL) 32(B) 16(BR)
    const fx = 64 // Frame Start X (right half of texture)
    const fy = 0 // Frame Start Y
    const sc = 16 // Source Corner Size
    const se = 32 // Source Edge Size (Middle)

    // Top-Left (64, 0)
    this._tl = new Sprite(
      new Texture({ source: texture.source, frame: new Rectangle(fx, fy, sc, sc) })
    )
    // Top-Right (112, 0) = 64+16+32
    this._tr = new Sprite(
      new Texture({ source: texture.source, frame: new Rectangle(fx + sc + se, fy, sc, sc) })
    )
    // Bot-Left (64, 48) = 0+16+32
    this._bl = new Sprite(
      new Texture({ source: texture.source, frame: new Rectangle(fx, fy + sc + se, sc, sc) })
    )
    // Bot-Right (112, 48)
    this._br = new Sprite(
      new Texture({
        source: texture.source,
        frame: new Rectangle(fx + sc + se, fy + sc + se, sc, sc)
      })
    )

    this._frameContainer.addChild(this._tl, this._tr, this._bl, this._br)

    // Edges (Tiling)
    // Top (80, 0) = 64+16, width 32px
    const topTex = new Texture({
      source: texture.source,
      frame: new Rectangle(fx + sc, fy, se, sc)
    })
    this._top = new TilingSprite({ texture: topTex, width: se, height: sc })

    // Bottom (80, 48)
    const botTex = new Texture({
      source: texture.source,
      frame: new Rectangle(fx + sc, fy + sc + se, se, sc)
    })
    this._bottom = new TilingSprite({ texture: botTex, width: se, height: sc })

    // Left (64, 16) - height 32px
    const leftTex = new Texture({
      source: texture.source,
      frame: new Rectangle(fx, fy + sc, sc, se)
    })
    this._left = new TilingSprite({ texture: leftTex, width: sc, height: se })

    // Right (112, 16)
    const rightTex = new Texture({
      source: texture.source,
      frame: new Rectangle(fx + sc + se, fy + sc, sc, se)
    })
    this._right = new TilingSprite({ texture: rightTex, width: sc, height: se })

    this._frameContainer.addChild(this._top, this._bottom, this._left, this._right)

    this.refresh()
  }

  public update(): void {
    // Handle opening/closing animations
    if (this._opening) {
      this._openness += 32 // Speed of animation
      if (this._openness >= 255) {
        this._openness = 255
        this._opening = false
      }
      this.scale.y = this._openness / 255
    }

    if (this._closing) {
      this._openness -= 32
      if (this._openness <= 0) {
        this._openness = 0
        this._closing = false
        this.visible = false
      }
      this.scale.y = this._openness / 255
    }

    // Handle slide animations
    if (this._slideDirection) {
      const speed = 0.2 // Lerp factor (0.2 = smooth, 0.5 = faster)
      const dx = this._slideTargetX - this.x
      const dy = this._slideTargetY - this.y

      this.x += dx * speed
      this.y += dy * speed

      // Check if reached target (within 1px)
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
        this.x = this._slideTargetX
        this.y = this._slideTargetY
        this._slideDirection = null
      }
    }
  }
  public open(): void {
    if (!this.isOpen()) {
      this._opening = true
      this._closing = false
      this.visible = true
    }
  }

  public openImmediate(): void {
    this._openness = 255
    this._opening = false
    this._closing = false
    this.scale.y = 1
    this.visible = true
  }

  /**
   * Opens window with slide-in animation from specified direction.
   */
  public openWithSlide(
    direction: 'left' | 'right' | 'top' | 'bottom',
    screenWidth: number = 816,
    screenHeight: number = 624
  ): void {
    this._slideDirection = direction
    this._slideTargetX = this.x
    this._slideTargetY = this.y

    // Set initial off-screen position
    switch (direction) {
      case 'left':
        this.x = -this._width
        break
      case 'right':
        this.x = screenWidth
        break
      case 'top':
        this.y = -this._height
        break
      case 'bottom':
        this.y = screenHeight
        break
    }

    this.openImmediate() // Make visible immediately
  }

  public close(): void {
    if (!this.isClosed()) {
      this._closing = true
      this._opening = false
    }
  }

  public isOpen(): boolean {
    return this._openness >= 255
  }

  public isClosed(): boolean {
    return this._openness <= 0
  }

  public get contents(): Container {
    return this._contents
  }

  public get width(): number {
    return this._width
  }

  public get height(): number {
    return this._height
  }

  public get innerWidth(): number {
    return this._width - this._padding * 2
  }

  public get innerHeight(): number {
    return this._height - this._padding * 2
  }

  public refresh(): void {
    if (this._backSprite) {
      this._backSprite.width = this._width
      this._backSprite.height = this._height
    }

    if (
      this._tl &&
      this._tr &&
      this._bl &&
      this._br &&
      this._top &&
      this._bottom &&
      this._left &&
      this._right
    ) {
      const w = this._width
      const h = this._height
      const c = this._cornerSize

      // Corners
      this._tl.x = 0
      this._tl.y = 0
      this._tr.x = w - c
      this._tr.y = 0
      this._bl.x = 0
      this._bl.y = h - c
      this._br.x = w - c
      this._br.y = h - c

      this._tl.width = this._tl.height = c
      this._tr.width = this._tr.height = c
      this._bl.width = this._bl.height = c
      this._br.width = this._br.height = c

      // Edges
      this._top.x = c
      this._top.y = 0
      this._top.width = w - c * 2
      this._top.height = c

      this._bottom.x = c
      this._bottom.y = h - c
      this._bottom.width = w - c * 2
      this._bottom.height = c

      this._left.x = 0
      this._left.y = c
      this._left.width = c
      this._left.height = h - c * 2

      this._right.x = w - c
      this._right.y = c
      this._right.width = c
      this._right.height = h - c * 2
    }

    // Update mask
    this._mask.clear()
    this._mask.rect(this._padding, this._padding, this.innerWidth, this.innerHeight)
    this._mask.fill(0xffffff)
  }

  public activate(): void {
    this.active = true
  }

  public deactivate(): void {
    this.active = false
  }

  public resize(width: number, height: number): void {
    this._width = width
    this._height = height
    // Pivot needs update?
    // If height changes, center changes.
    const oldPivotY = this.pivot.y
    this.pivot.y = height / 2

    // Adjust y position to compensate for pivot shift
    this.y += this.pivot.y - oldPivotY

    this.refresh()
  }
}
