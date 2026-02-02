import { type TileSelection, ZTool, ZLayer } from '@engine/types'
import { Container, Graphics, Sprite, Texture, Rectangle, AnimatedSprite } from '@engine/utils/pixi'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { AutotileSolver } from '@engine/utils/AutotileSolver'
import { MapManager } from '@engine/managers/MapManager'
import { SpriteUtils } from '@engine/utils/SpriteUtils'

export class GhostSystem extends ZSystem {
  public container: Container
  private tileSize: number

  // State
  private active: boolean = false
  private dirty: boolean = false
  private position: { x: number; y: number } = { x: 0, y: 0 }
  private selection: TileSelection | null = null
  private currentTool: ZTool = ZTool.brush
  private shapeStart: { x: number; y: number } | null = null
  private shapeEnd: { x: number; y: number } | null = null
  private isShape: boolean = false
  private activeLayer: ZLayer = ZLayer.ground

  private selectionBox: { x: number; y: number; w: number; h: number } | null = null

  constructor(_stage: Container, services: ServiceLocator, tileSize: number) {
    super(services)
    this.updateMode = SystemMode.EDIT
    this.tileSize = tileSize
    this.container = null!
  }

  public onBoot(): void {
    this.container = new Container()
    this.container.label = 'GhostContainer'
    this.container.zIndex = 999
    this.container.visible = false
    this.container.eventMode = 'none'
  }

  public onDestroy(): void {
    if (this.container) {
      this.container.destroy({ children: true })
    }
  }

  public update(x: number, y: number, sel: TileSelection | null, tool: ZTool, layer: ZLayer): void {
    this.active = true
    this.isShape = false
    this.position = { x, y }
    this.selection = sel
    this.currentTool = tool
    this.activeLayer = layer
    this.dirty = true
  }

  public updateShape(
    start: { x: number; y: number },
    end: { x: number; y: number },
    tool: ZTool,
    sel: TileSelection | null = null,
    layer: ZLayer = ZLayer.ground
  ): void {
    this.active = true
    this.isShape = true
    this.shapeStart = start
    this.shapeEnd = end
    this.currentTool = tool
    this.selection = sel
    this.activeLayer = layer
    this.dirty = true
  }

  public hide(): void {
    if (this.active) {
      this.active = false
      this.dirty = true
    }
  }

  public setVisible(visible: boolean): void {
    if (this.container) {
      this.container.visible = visible
    }
  }

  public setSelectionBox(box: { x: number; y: number; w: number; h: number } | null): void {
    this.selectionBox = box
    this.dirty = true
  }

  private renderSingleGhost(): void {
    const sel = this.selection
    const x = this.position.x * this.tileSize
    const y = this.position.y * this.tileSize

    if (!sel) {
      // 1x1 Guide for Brush/Eraser/Select/Shapes when no selection
      const isPickableTool = [
        ZTool.brush,
        ZTool.eraser,
        ZTool.rectangle,
        ZTool.circle,
        ZTool.select
      ].includes(this.currentTool)
      if (isPickableTool) {
        const g = new Graphics()
          .rect(x, y, this.tileSize, this.tileSize)
          .stroke({ width: 1, color: 0xffffff, alpha: 0.5 })
          .stroke({ width: 1, color: 0x000000, alpha: 0.2, alignment: 1 })
        this.container.addChild(g)
      }
      return
    }

    if (this.currentTool === ZTool.eraser) {
      const g = new Graphics()
        .rect(x, y, this.tileSize, this.tileSize)
        .fill({ color: 0xff0000, alpha: 0.3 })
        .stroke({ width: 1, color: 0xff0000, alpha: 0.8 })
      this.container.addChild(g)
    } else if (this.currentTool === ZTool.event) {
      const g = new Graphics()
        .rect(x, y, this.tileSize, this.tileSize)
        .fill({ color: 0x00ffff, alpha: 0.3 })
        .stroke({ width: 1, color: 0x00ffff, alpha: 0.8 })
      this.container.addChild(g)
    } else if (
      this.currentTool === ZTool.brush ||
      this.currentTool === ZTool.bucket ||
      this.currentTool === ZTool.rectangle ||
      this.currentTool === ZTool.circle
    ) {
      if (sel.tilesetId.endsWith('.png')) {
        // Render large object (character) as a single unit at the foot position
        this.renderSingleTileSource(sel, this.position.x, this.position.y)
      } else {
        this.renderTileSelectionAt(this.position.x, this.position.y, sel)
      }
    }
  }

  private renderShape(): void {
    if (!this.shapeStart || !this.shapeEnd) return

    const xOrigin = Math.min(this.shapeStart.x, this.shapeEnd.x)
    const yOrigin = Math.min(this.shapeStart.y, this.shapeEnd.y)
    const xMax = Math.max(this.shapeStart.x, this.shapeEnd.x)
    const yMax = Math.max(this.shapeStart.y, this.shapeEnd.y)

    const w = (xMax - xOrigin + 1) * this.tileSize
    const h = (yMax - yOrigin + 1) * this.tileSize
    const x = xOrigin * this.tileSize
    const y = yOrigin * this.tileSize

    // 1. Render Tiled Content if selection exists
    const sel = this.selection
    if (sel && (this.currentTool === ZTool.rectangle || this.currentTool === ZTool.circle)) {
      const selW = sel.w || 1
      const selH = sel.h || 1

      for (let sy = yOrigin; sy <= yMax; sy++) {
        for (let sx = xOrigin; sx <= xMax; sx++) {
          if (this.currentTool === ZTool.circle) {
            const cx = (xOrigin + xMax) / 2
            const cy = (yOrigin + yMax) / 2
            const rx = (xMax - xOrigin) / 2 + 0.5
            const ry = (yMax - yOrigin) / 2 + 0.5
            if (Math.pow((sx - cx) / rx, 2) + Math.pow((sy - cy) / ry, 2) > 1) continue
          }

          const dx = (sx - xOrigin) % selW
          const dy = (sy - yOrigin) % selH

          if (sel.tilesetId.endsWith('.png')) {
            // Characters in shapes: render one full character per "tiled slot" if it's the top-left of the slot
            if (dx === 0 && dy === 0) {
              this.renderSingleTileSource(sel, sx, sy)
            }
          } else if (sel.isAutotile) {
            // New logic: Autotile solver for shape ghosts
            const checkInShape = (tx: number, ty: number): boolean => {
              if (this.currentTool === ZTool.rectangle) {
                return tx >= xOrigin && tx <= xMax && ty >= yOrigin && ty <= yMax
              } else if (this.currentTool === ZTool.circle) {
                const cx = (xOrigin + xMax) / 2
                const cy = (yOrigin + yMax) / 2
                const rx = (xMax - xOrigin) / 2 + 0.5
                const ry = (yMax - yOrigin) / 2 + 0.5
                return Math.pow((tx - cx) / rx, 2) + Math.pow((ty - cy) / ry, 2) <= 1
              }
              return false
            }
            this.renderAutotileGhostAt(sx, sy, sel, checkInShape)
          } else {
            this.renderTileGhostAt(sx, sy, sel, dx, dy)
          }
        }
      }
    }

    // 2. Render Shape Border/Outline
    const g = new Graphics()
    if (this.currentTool === ZTool.rectangle) {
      g.rect(x, y, w, h)
      g.fill({ color: 0x00ff00, alpha: 0.1 }).stroke({ width: 2, color: 0x00ff00, alpha: 0.8 })
    } else if (this.currentTool === ZTool.circle) {
      g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2)
      g.fill({ color: 0x00ff00, alpha: 0.1 }).stroke({ width: 2, color: 0x00ff00, alpha: 0.8 })
    } else if (this.currentTool === ZTool.select) {
      g.rect(x, y, w, h)
      g.fill({ color: 0x0000ff, alpha: 0.1 }).stroke({ width: 2, color: 0x3399ff, alpha: 0.9 })
    }

    this.container.addChild(g)
  }

  private renderTileSelectionAt(mapX: number, mapY: number, sel: TileSelection): void {
    const { w, h } = sel
    for (let sy = 0; sy < h; sy++) {
      for (let sx = 0; sx < w; sx++) {
        const mx = mapX + sx
        const my = mapY + sy

        if (sel.isAutotile) {
          const checkAtPos = (tx: number, ty: number): boolean => tx === mx && ty === my
          this.renderAutotileGhostAt(mx, my, sel, checkAtPos)
        } else {
          this.renderTileGhostAt(mx, my, sel, sx, sy)
        }
      }
    }
  }

  private renderTileGhostAt(
    mapX: number,
    mapY: number,
    sel: TileSelection,
    selOffsetX: number = 0,
    selOffsetY: number = 0
  ): void {
    const absX = mapX * this.tileSize
    const absY = mapY * this.tileSize

    if (sel.structure) {
      for (const layerKey in sel.structure) {
        const grid = sel.structure[layerKey as ZLayer]
        if (!grid) continue

        const stack = grid[selOffsetY]?.[selOffsetX]
        if (stack && stack.length > 0) {
          for (const tile of stack) {
            this.renderSingleTileSource(tile, absX, absY)
          }
        }
      }
    } else if (sel.pattern) {
      const tile = sel.pattern[selOffsetY]?.[selOffsetX]
      if (tile) {
        this.renderSingleTileSource(tile, absX, absY)
      }
    } else {
      // Single tile or simple selection
      const tex = this.textures.get(sel.tilesetId)
      if (!tex) return

      // Use grid-based calculation or pixel overrides
      // If we are sub-sampling (selOffsetX/Y > 0 or multi-tile), we calculate per chunk
      const sW = this.tileSize
      const sH = this.tileSize
      let sX = (sel.x + selOffsetX) * this.tileSize
      let sY = (sel.y + selOffsetY) * this.tileSize

      if (!sel.isAutotile && sel.pixelX !== undefined && sel.pixelY !== undefined) {
        // If we have pixel coordinates, they represent the TOP-LEFT of the WHOLE selection.
        // We add the offset in pixels to get the sub-tile source.
        sX = sel.pixelX + selOffsetX * this.tileSize
        sY = sel.pixelY + selOffsetY * this.tileSize
      }

      // CRITICAL: We render exactly ONE tile size piece here to avoid duplicate drawing
      this.renderSourceTile(sel.tilesetId, sX, sY, sW, sH, absX, absY)
    }
  }

  private renderAutotileGhostAt(
    mapX: number,
    mapY: number,
    sel: TileSelection,
    checkOverride: (x: number, y: number) => boolean
  ): void {
    const tex = this.textures.get(sel.tilesetId)
    if (!tex) return

    const absX = mapX * this.tileSize
    const absY = mapY * this.tileSize

    const mapManager = this.services.get(MapManager)
    const currentMap = mapManager?.currentMap
    if (!currentMap) return

    const isA1 = sel.tilesetId === 'A1'
    let frameCount = 1
    if (isA1) {
      const blockXIndex = Math.floor(sel.x / 2)
      if (blockXIndex !== 3 && blockXIndex !== 7) frameCount = 3
    }

    for (let qy = 0; qy < 2; qy++) {
      for (let qx = 0; qx < 2; qx++) {
        const offset = AutotileSolver.getQuadrantOffset(
          mapX,
          mapY,
          qx,
          qy,
          this.tileSize,
          sel,
          this.activeLayer,
          currentMap,
          currentMap.width,
          currentMap.height,
          0,
          checkOverride
        )

        const textures: Texture[] = []
        for (let i = 0; i < frameCount; i++) {
          const animOffset = isA1 ? i * (this.tileSize * 2) : 0
          textures.push(
            new Texture({
              source: tex.source,
              frame: new Rectangle(
                sel.x * this.tileSize + animOffset + offset.x,
                sel.y * this.tileSize + offset.y,
                this.tileSize / 2,
                this.tileSize / 2
              )
            })
          )
        }

        let spr: Sprite
        if (textures.length > 1) {
          const anim = new AnimatedSprite(textures)
          anim.animationSpeed = 0.025
          anim.play()
          spr = anim
        } else {
          spr = new Sprite(textures[0])
        }

        spr.x = absX + qx * (this.tileSize / 2)
        spr.y = absY + qy * (this.tileSize / 2)
        spr.alpha = 0.5
        this.container.addChild(spr)
      }
    }
  }

  private renderSingleTileSource(tile: TileSelection, absX: number, absY: number): void {
    const pX = tile.pixelX ?? tile.x * this.tileSize
    const pY = tile.pixelY ?? tile.y * this.tileSize
    const pW = tile.pixelW ?? this.tileSize
    const pH = tile.pixelH ?? this.tileSize
    this.renderSourceTile(tile.tilesetId, pX, pY, pW, pH, absX, absY)
  }

  private renderSourceTile(
    tilesetId: string,
    sX: number,
    sY: number,
    sW: number,
    sH: number,
    absX: number,
    absY: number
  ): void {
    const isCharacter = tilesetId.endsWith('.png') || tilesetId.includes('characters/')
    const tex = this.textures.get(tilesetId)
    if (!tex) return

    let finalSX = sX
    let finalSY = sY
    let finalSW = sW
    let finalSH = sH

    if (isCharacter) {
      const { frameW, frameH, divW } = SpriteUtils.getFrameRect(
        { assetId: tilesetId, x: 0, y: 0, w: 0, h: 0, group: 'character' },
        tex
      )
      const idleCol = SpriteUtils.getIdleFrameIndex(divW)

      // If we don't have explicit pixel overrides, use detected frame size
      if (sW === this.tileSize && sH === this.tileSize) {
        finalSW = frameW
        finalSH = frameH
        finalSX = idleCol * frameW
        finalSY = 0 // Default row
      }
    }

    const sprite = new Sprite(
      new Texture({
        source: tex.source,
        frame: new Rectangle(finalSX, finalSY, finalSW, finalSH)
      })
    )

    if (isCharacter) {
      sprite.anchor.set(0.5, 1)
      sprite.x = absX + this.tileSize / 2
      sprite.y = absY + this.tileSize
    } else {
      sprite.x = absX
      sprite.y = absY
    }

    sprite.alpha = 0.5
    this.container.addChild(sprite)
  }

  private renderSelectionBox(): void {
    if (!this.selectionBox) return
    const g = new Graphics()
    const x = this.selectionBox.x * this.tileSize
    const y = this.selectionBox.y * this.tileSize
    const w = this.selectionBox.w * this.tileSize
    const h = this.selectionBox.h * this.tileSize
    g.rect(x, y, w, h)
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
    g.rect(x, y, w, h)
    g.stroke({ width: 2, color: 0x000000, alpha: 0.5, alignment: 1 })
    this.container.addChild(g)
  }

  public onUpdate(): void {
    if (!this.dirty) return
    this.container.removeChildren()
    this.container.visible = this.active
    this.container.x = 0
    this.container.y = 0

    if (this.isShape && this.shapeStart && this.shapeEnd) {
      this.renderShape()
    } else {
      this.renderSingleGhost()
    }

    this.renderSelectionBox()
    this.dirty = false
  }
}
