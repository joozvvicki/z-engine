import { Container, Sprite, Texture, Graphics, Rectangle, TilingSprite } from '@engine/utils/pixi'

export class Window_Base extends Container {
  protected _width: number = 0
  protected _height: number = 0
  protected _padding: number = 18

  protected _backSprite: Sprite | null = null
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

  // Standard RPG Maker MV skin metrics (192x192, 96x96 tiles)
  private _cornerSize: number = 32

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

    // 1. Background (0,0, 96,96)
    const backRect = new Rectangle(0, 0, 96, 96)
    const backTex = new Texture({ source: texture.source, frame: backRect })

    this._backSprite = new Sprite(backTex)
    this._backSprite.alpha = 0.8
    this.addChildAt(this._backSprite, 0)

    // 2. Frame Construction (96,0 offset, 96x96 total)
    const slice = 32

    // Top-Left (96+0, 0)
    this._tl = new Sprite(
      new Texture({ source: texture.source, frame: new Rectangle(96, 0, slice, slice) })
    )
    // Top-Right (160, 0)
    this._tr = new Sprite(
      new Texture({ source: texture.source, frame: new Rectangle(160, 0, slice, slice) })
    )
    // Bot-Left (96, 64)
    this._bl = new Sprite(
      new Texture({ source: texture.source, frame: new Rectangle(96, 64, slice, slice) })
    )
    // Bot-Right (160, 64)
    this._br = new Sprite(
      new Texture({ source: texture.source, frame: new Rectangle(160, 64, slice, slice) })
    )

    this._frameContainer.addChild(this._tl, this._tr, this._bl, this._br)

    // Edges (Tiling)
    // Top (128, 0)
    const topTex = new Texture({
      source: texture.source,
      frame: new Rectangle(128, 0, slice, slice)
    })
    this._top = new TilingSprite({ texture: topTex, width: slice, height: slice })

    // Bottom (128, 64)
    const botTex = new Texture({
      source: texture.source,
      frame: new Rectangle(128, 64, slice, slice)
    })
    this._bottom = new TilingSprite({ texture: botTex, width: slice, height: slice })

    // Left (96, 32)
    const leftTex = new Texture({
      source: texture.source,
      frame: new Rectangle(96, 32, slice, slice)
    })
    this._left = new TilingSprite({ texture: leftTex, width: slice, height: slice })

    // Right (160, 32)
    const rightTex = new Texture({
      source: texture.source,
      frame: new Rectangle(160, 32, slice, slice)
    })
    this._right = new TilingSprite({ texture: rightTex, width: slice, height: slice })

    this._frameContainer.addChild(this._top, this._bottom, this._left, this._right)

    this.refresh()
  }

  public update(): void {
    if (this._opening) {
      this._openness += 32
      if (this._openness >= 255) {
        this._openness = 255
        this._opening = false
      }
    } else if (this._closing) {
      this._openness -= 32
      if (this._openness <= 0) {
        this._openness = 0
        this._closing = false
        this.visible = false
      }
    }

    // Apply openness
    this.scale.y = this._openness / 255
  }

  public open(): void {
    if (!this.isOpen()) {
      this._opening = true
      this._closing = false
      this.visible = true
    }
    // Force reset opacity/scale just in case
    if (this._openness <= 0) this.scale.y = 0
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
