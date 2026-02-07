import { type TileSelection, ZTool, ZLayer, ZEngineSignal } from '@engine/types'
import { Container, Graphics, Sprite, Texture, Rectangle, AnimatedSprite } from '@engine/utils/pixi'
import { AutotileSolver } from '@engine/utils/AutotileSolver'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import { MapManager } from '@engine/managers/MapManager'
import { TextureManager } from '@engine/managers/TextureManager'
import { ZEventBus } from '@engine/core/ZEventBus'

/**
 * Handles Editor visualization (Ghosting, Selection, Event placeholders).
 * Refactored for Manual Dependency Injection.
 */
export class GhostSystem {
  // Dependencies
  private wrapper: Container
  private textures: TextureManager
  private mapManager: MapManager
  private eventBus: ZEventBus
  private tileSize: number

  // Internal State
  public container: Container
  private contentContainer: Container
  private maskGraphics: Graphics
  private active: boolean = false
  private dirty: boolean = false
  private position: { x: number; y: number } = { x: 0, y: 0 }
  private selection: TileSelection | null = null
  private currentTool: ZTool = ZTool.brush
  private shapeStart: { x: number; y: number } | null = null
  private shapeEnd: { x: number; y: number } | null = null
  private isShape: boolean = false
  private activeLayer: ZLayer = ZLayer.ground
  private draggingEventId: string | null = null
  private eraserSize: number = 1

  private selectionBox: { x: number; y: number; w: number; h: number } | null = null
  private selectedEventPos: { x: number; y: number } | null = null

  // Player Start Dragging Support
  private draggingPlayerStart: {
    graphic: string
    charX: number
    charY: number
    srcX?: number
    srcY?: number
    srcW?: number
    srcH?: number
  } | null = null

  constructor(
    stage: Container,
    textures: TextureManager,
    mapManager: MapManager,
    eventBus: ZEventBus,
    tileSize: number
  ) {
    this.wrapper = stage
    this.textures = textures
    this.mapManager = mapManager
    this.eventBus = eventBus
    this.tileSize = tileSize

    this.container = new Container()
    this.container.label = 'GhostSystem'
    this.container.zIndex = 999
    this.container.visible = false
    this.container.eventMode = 'none'

    this.contentContainer = new Container()
    this.contentContainer.label = 'GhostContent'
    this.container.addChild(this.contentContainer)

    this.maskGraphics = new Graphics()
    this.container.addChild(this.maskGraphics)
    this.contentContainer.mask = this.maskGraphics

    // Add directly to the scene layer provided
    this.wrapper.addChild(this.container)

    this.setupListeners()
  }

  private setupListeners(): void {
    this.eventBus.on(ZEngineSignal.MapLoaded, () => {
      this.dirty = true
    })
  }

  public setDirty(): void {
    this.dirty = true
  }

  public onDestroy(): void {
    if (this.container) {
      this.container.destroy({ children: true })
    }
  }

  public update(
    x: number,
    y: number,
    sel: TileSelection | null,
    tool: ZTool,
    layer: ZLayer,
    eraserSize: number = 1
  ): void {
    this.active = true
    this.isShape = false
    this.position = { x, y }
    this.selection = sel
    this.currentTool = tool
    this.activeLayer = layer
    this.eraserSize = eraserSize
    this.dirty = true
  }

  public setTool(tool: ZTool): void {
    if (this.currentTool !== tool) {
      this.currentTool = tool
      this.dirty = true
    }
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

  public setVisible(visible: boolean): void {
    this.container.visible = visible
    this.dirty = true
  }

  public hide(): void {
    if (this.active) {
      this.active = false
      this.dirty = true
    }
  }

  public setSelectionBox(box: { x: number; y: number; w: number; h: number } | null): void {
    this.selectionBox = box
    this.dirty = true
  }

  public setSelectedEventPos(pos: { x: number; y: number } | null): void {
    this.selectedEventPos = pos
    this.dirty = true
  }

  public setDraggingPlayerStart(
    info: {
      graphic: string
      charX: number
      charY: number
      srcX?: number
      srcY?: number
      srcW?: number
      srcH?: number
    } | null
  ): void {
    this.draggingPlayerStart = info
    this.dirty = true
  }

  // --- Rendering Logic ---

  public onUpdate(): void {
    if (!this.dirty) return
    this.contentContainer.removeChildren()

    if (this.active) {
      if (this.isShape && this.shapeStart && this.shapeEnd) {
        this.renderShape()
      } else {
        this.renderSingleGhost()
      }
    }

    this.renderExistingEvents()

    if (this.selectedEventPos) {
      this.renderSelectedEventHighlight()
    }
    if (this.selectionBox) {
      this.renderSelectionBox()
    }
    if (this.draggingPlayerStart) {
      this.renderPlayerStartGhost()
    }

    const map = this.mapManager.currentMap
    this.maskGraphics.clear()
    if (map) {
      this.maskGraphics
        .rect(0, 0, map.width * this.tileSize, map.height * this.tileSize)
        .fill({ color: 0xffffff, alpha: 1 })
    }

    this.dirty = false
  }

  private renderSingleGhost(): void {
    const sel = this.selection
    const x = this.position.x * this.tileSize
    const y = this.position.y * this.tileSize

    if (!sel) {
      const isPickableTool = [
        ZTool.brush,
        ZTool.eraser,
        ZTool.rectangle,
        ZTool.circle,
        ZTool.select,
        ZTool.event
      ].includes(this.currentTool)
      if (isPickableTool) {
        const color = this.currentTool === ZTool.event ? 0x00ffff : 0xffffff
        const g = new Graphics()
          .rect(x, y, this.tileSize, this.tileSize)
          .stroke({ width: 1, color, alpha: 0.5 })
          .stroke({ width: 1, color: 0x000000, alpha: 0.2, alignment: 1 })
        this.contentContainer.addChild(g)
      }
      return
    }

    if (this.currentTool === ZTool.eraser) {
      const size = this.eraserSize * this.tileSize
      const offset = Math.floor(this.eraserSize / 2) * this.tileSize
      const g = new Graphics()
        .rect(x - offset, y - offset, size, size)
        .fill({ color: 0xff0000, alpha: 0.3 })
        .stroke({ width: 1, color: 0xff0000, alpha: 0.8 })
      this.contentContainer.addChild(g)
    } else if (this.currentTool === ZTool.event) {
      const g = new Graphics()
        .rect(x, y, this.tileSize, this.tileSize)
        .fill({ color: 0x000000, alpha: 0.3 })
        .stroke({ width: 1, color: 0x000000, alpha: 0.6 })
      this.contentContainer.addChild(g)

      if (this.draggingEventId) {
        const event = this.mapManager.currentMap?.events.find((e) => e.id === this.draggingEventId)
        const activePage = event?.pages[0]
        if (activePage?.graphic) {
          const assetPath = activePage.graphic.assetId
          if (!this.textures.get(assetPath)) {
            this.textures.load(assetPath).then(() => {
              this.dirty = true
            })
          }

          const sprite = SpriteUtils.createEventSprite(
            activePage.graphic,
            this.textures,
            this.tileSize,
            true
          )
          if (sprite) {
            sprite.x = x + this.tileSize / 2
            sprite.y = y + this.tileSize
            sprite.alpha = 0.5
            this.contentContainer.addChild(sprite)
          }
        }
      }
    } else if (
      this.currentTool === ZTool.brush ||
      this.currentTool === ZTool.bucket ||
      this.currentTool === ZTool.rectangle ||
      this.currentTool === ZTool.circle
    ) {
      if (sel.tilesetId.endsWith('.png')) {
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
            if (dx === 0 && dy === 0) {
              this.renderSingleTileSource(sel, sx, sy)
            }
          } else if (sel.isAutotile) {
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

    this.contentContainer.addChild(g)
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
      const tex = this.textures.get(sel.tilesetId)
      if (!tex) return

      const sW = this.tileSize
      const sH = this.tileSize
      let sX = (sel.x + selOffsetX) * this.tileSize
      let sY = (sel.y + selOffsetY) * this.tileSize

      if (!sel.isAutotile && sel.pixelX !== undefined && sel.pixelY !== undefined) {
        sX = sel.pixelX + selOffsetX * this.tileSize
        sY = sel.pixelY + selOffsetY * this.tileSize
      }

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

    const currentMap = this.mapManager.currentMap
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
        this.contentContainer.addChild(spr)
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

      if (sW === this.tileSize && sH === this.tileSize) {
        finalSW = frameW
        finalSH = frameH
        finalSX = idleCol * frameW
        finalSY = 0
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
    this.contentContainer.addChild(sprite)
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
    this.contentContainer.addChild(g)
  }

  public setDraggingEventId(id: string | null): void {
    this.draggingEventId = id
    this.dirty = true
  }

  private renderExistingEvents(): void {
    // Only render event placeholders if we are in Event Tool mode
    if (this.currentTool !== ZTool.event) return

    const map = this.mapManager.currentMap
    if (!map || !map.events) return

    for (const event of map.events) {
      if (event.name === 'PlayerStart') continue
      if (event.id === this.draggingEventId) continue

      const x = event.x * this.tileSize
      const y = event.y * this.tileSize

      const g = new Graphics()
        .rect(x, y, this.tileSize, this.tileSize)
        .fill({ color: 0x000000, alpha: 0.3 })
        .stroke({ width: 2, color: 0x000000, alpha: 0.6 })
      this.contentContainer.addChild(g)

      const activePage = event.pages[0]
      if (activePage?.graphic) {
        const assetPath = activePage.graphic.assetId
        if (!this.textures.get(assetPath)) {
          this.textures.load(assetPath).then(() => {
            this.dirty = true
          })
        }

        const sprite = SpriteUtils.createEventSprite(
          activePage.graphic,
          this.textures,
          this.tileSize,
          true
        )
        if (sprite) {
          sprite.x = x + this.tileSize / 2
          sprite.y = y + this.tileSize
          sprite.alpha = 0.3
          this.contentContainer.addChild(sprite)
        }
      }
    }
  }

  private renderSelectedEventHighlight(): void {
    if (!this.selectedEventPos) return
    const x = this.selectedEventPos.x * this.tileSize
    const y = this.selectedEventPos.y * this.tileSize
    const g = new Graphics()
      .rect(x, y, this.tileSize, this.tileSize)
      .stroke({ width: 2, color: 0x000000, alpha: 0.8 })
      .rect(x - 2, y - 2, this.tileSize + 4, this.tileSize + 4)
      .stroke({ width: 1, color: 0x000000, alpha: 0.6 })
    this.contentContainer.addChild(g)
  }

  private renderPlayerStartGhost(): void {
    if (!this.draggingPlayerStart) return

    const x = this.position.x * this.tileSize
    const y = this.position.y * this.tileSize

    // 1. Draw Tile Box
    const g = new Graphics()
      .rect(x, y, this.tileSize, this.tileSize)
      .fill({ color: 0x00ff00, alpha: 0.3 })
      .stroke({ width: 2, color: 0x00ff00, alpha: 0.8 })
    this.contentContainer.addChild(g)

    // 2. Draw Sprite
    const graphicData = {
      assetId: this.draggingPlayerStart.graphic,
      group: 'character' as const,
      x: this.draggingPlayerStart.charX,
      y: this.draggingPlayerStart.charY,
      srcX: this.draggingPlayerStart.srcX,
      srcY: this.draggingPlayerStart.srcY,
      srcW: this.draggingPlayerStart.srcW,
      srcH: this.draggingPlayerStart.srcH,
      w: 0,
      h: 0
    }

    // Load if needed
    if (!this.textures.get(graphicData.assetId)) {
      this.textures.load(graphicData.assetId).then(() => {
        this.dirty = true
      })
      return
    }

    // Determine idle frame if needed
    const tex = this.textures.get(graphicData.assetId)
    if (tex && !graphicData.srcW && !this.draggingPlayerStart.charX) {
      // Logic check: if no explicit src rect AND no specific grid char index provided?
      // Actually SpriteUtils handles x=0 y=0 defaults mostly, but let's check basic idle logic
      const { divW } = SpriteUtils.getFrameRect(graphicData, tex)
      // We might want to force idle frame if not specified
      if (graphicData.x === 0 && graphicData.y === 0 && !graphicData.srcX) {
        graphicData.x = SpriteUtils.getIdleFrameIndex(divW)
      }
    }

    const sprite = SpriteUtils.createEventSprite(graphicData, this.textures, this.tileSize, true)
    if (sprite) {
      sprite.x = x + this.tileSize / 2
      sprite.y = y + this.tileSize
      sprite.alpha = 0.6
      this.contentContainer.addChild(sprite)
    }

    // 3. Label
    // (Optional, simple text requires importing TextStyle/Text which might bloat this file imports if not already there)
  }
}
