import { Container, Graphics, Sprite, Texture, Rectangle } from '@engine/utils/pixi'
import { type TileSelection, ZTool, ZLayer } from '@engine/types'
import { ZSystem as ZSystemCore, SystemMode } from '@engine/core/ZSystem'

import { ServiceLocator } from '@engine/core/ServiceLocator'

export class GhostSystem extends ZSystemCore {
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
    this.container.eventMode = 'none' // Ensure ghost doesn't block interactions
    // No longer adding to wrapper here, scene will mount it
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

  public setVisible(visible: boolean): void {
    if (this.container) {
      this.container.visible = visible
    }
  }

  private renderSingleGhost(): void {
    if (!this.selection) return

    // Keep container at 0,0
    this.container.x = 0
    this.container.y = 0

    const x = this.position.x * this.tileSize
    const y = this.position.y * this.tileSize

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
    } else if (this.currentTool === ZTool.brush || this.currentTool === ZTool.bucket) {
      if (this.selection.structure) {
        // Render multi-layer structure (prioritize over flat pattern)
        for (const layerKey in this.selection.structure) {
          const grid = this.selection.structure[layerKey as ZLayer]
          if (!grid) continue

          for (let dy = 0; dy < this.selection.h; dy++) {
            for (let dx = 0; dx < this.selection.w; dx++) {
              const stack = grid[dy]?.[dx]
              if (stack && stack.length > 0) {
                for (const tile of stack) {
                  const tex = this.textures.get(tile.tilesetId)
                  if (!tex) continue

                  if (tile.isAutotile) {
                    // Autotile interaction logic for GHOST structure
                    const halfSize = this.tileSize / 2

                    for (let qy = 0; qy < 2; qy++) {
                      for (let qx = 0; qx < 2; qx++) {
                        // Check neighbors within the CURRENT LAYER GRID
                        const check = (odx: number, ody: number): boolean => {
                          const nx = dx + odx
                          const ny = dy + ody
                          if (
                            nx < 0 ||
                            nx >= this.selection!.w ||
                            ny < 0 ||
                            ny >= this.selection!.h
                          )
                            return false

                          const neighborStack: TileSelection[] | null = grid[ny]?.[nx]
                          if (!neighborStack) return false

                          // Check if any tile in neighbor stack matches
                          return neighborStack.some(
                            (n: TileSelection) =>
                              n.tilesetId === tile.tilesetId && n.x === tile.x && n.y === tile.y
                          )
                        }

                        // Logic copied/adapted from AutotileSolver
                        const ndx = qx === 0 ? -1 : 1
                        const ndy = qy === 0 ? -1 : 1

                        const hasH = check(ndx, 0)
                        const hasV = check(0, ndy)
                        const hasD = check(ndx, ndy)

                        const isA3 = tile.tilesetId === 'A3'
                        const isA4Wall =
                          tile.tilesetId === 'A4' && (tile.y === 3 || tile.y === 8 || tile.y === 13)

                        let srcX = 0
                        let srcY = 0

                        if (isA3 || isA4Wall) {
                          if (qx === 0 && qy === 0) {
                            srcX = hasH ? halfSize : 0
                            srcY = hasV ? halfSize : 0
                          } else if (qx === 1 && qy === 0) {
                            srcX = hasH ? this.tileSize : this.tileSize * 1.5
                            srcY = hasV ? halfSize : 0
                          } else if (qx === 0 && qy === 1) {
                            srcX = hasH ? halfSize : 0
                            srcY = !hasV ? this.tileSize * 1.5 : halfSize
                          } else if (qx === 1 && qy === 1) {
                            srcX = hasH ? this.tileSize : this.tileSize * 1.5
                            srcY = !hasV ? this.tileSize * 1.5 : halfSize
                          }
                        } else {
                          // Standard Autotile
                          if (qx === 0 && qy === 0) {
                            if (!hasH && !hasV) {
                              srcX = 0
                              srcY = this.tileSize
                            } else if (hasH && !hasV) {
                              srcX = this.tileSize
                              srcY = this.tileSize
                            } else if (!hasH && hasV) {
                              srcX = 0
                              srcY = this.tileSize * 2
                            } else if (hasH && hasV && !hasD) {
                              srcX = this.tileSize
                              srcY = 0
                            } else {
                              srcX = this.tileSize
                              srcY = this.tileSize * 2
                            }
                          } else if (qx === 1 && qy === 0) {
                            if (!hasH && !hasV) {
                              srcX = this.tileSize * 1.5
                              srcY = this.tileSize
                            } else if (hasH && !hasV) {
                              srcX = halfSize
                              srcY = this.tileSize
                            } else if (!hasH && hasV) {
                              srcX = this.tileSize * 1.5
                              srcY = this.tileSize * 2
                            } else if (hasH && hasV && !hasD) {
                              srcX = this.tileSize * 1.5
                              srcY = 0
                            } else {
                              srcX = halfSize
                              srcY = this.tileSize * 2
                            }
                          } else if (qx === 0 && qy === 1) {
                            if (!hasH && !hasV) {
                              srcX = 0
                              srcY = this.tileSize * 2.5
                            } else if (hasH && !hasV) {
                              srcX = this.tileSize
                              srcY = this.tileSize * 2.5
                            } else if (!hasH && hasV) {
                              srcX = 0
                              srcY = this.tileSize * 1.5
                            } else if (hasH && hasV && !hasD) {
                              srcX = this.tileSize
                              srcY = halfSize
                            } else {
                              srcX = this.tileSize
                              srcY = this.tileSize * 1.5
                            }
                          } else if (qx === 1 && qy === 1) {
                            if (!hasH && !hasV) {
                              srcX = this.tileSize * 1.5
                              srcY = this.tileSize * 2.5
                            } else if (hasH && !hasV) {
                              srcX = halfSize
                              srcY = this.tileSize * 2.5
                            } else if (!hasH && hasV) {
                              srcX = this.tileSize * 1.5
                              srcY = this.tileSize * 1.5
                            } else if (hasH && hasV && !hasD) {
                              srcX = this.tileSize * 1.5
                              srcY = halfSize
                            } else {
                              srcX = halfSize
                              srcY = this.tileSize * 1.5
                            }
                          }
                        }

                        const sprite = new Sprite(
                          new Texture({
                            source: tex.source,
                            frame: new Rectangle(
                              tile.x * this.tileSize + srcX,
                              tile.y * this.tileSize + srcY,
                              halfSize,
                              halfSize
                            )
                          })
                        )
                        sprite.x = x + dx * this.tileSize + qx * halfSize
                        sprite.y = y + dy * this.tileSize + qy * halfSize
                        sprite.alpha = 0.5
                        this.container.addChild(sprite)
                      }
                    }
                  } else {
                    // Standard Tile
                    const sprite = new Sprite(
                      new Texture({
                        source: tex.source,
                        frame: new Rectangle(
                          tile.x * this.tileSize,
                          tile.y * this.tileSize,
                          this.tileSize,
                          this.tileSize
                        )
                      })
                    )
                    sprite.x = x + dx * this.tileSize
                    sprite.y = y + dy * this.tileSize
                    sprite.alpha = 0.5
                    this.container.addChild(sprite)
                  }
                }
              }
            }
          }
        }
      } else if (this.selection.pattern) {
        // Fallback or legacy pattern
        // (This code block is mostly redundant now since we always populate structure, but kept for safety)
        for (let dy = 0; dy < this.selection.h; dy++) {
          for (let dx = 0; dx < this.selection.w; dx++) {
            const tile = this.selection.pattern[dy]?.[dx]
            if (tile) {
              const tex = this.textures.get(tile.tilesetId)
              if (tex) {
                const sprite = new Sprite(
                  new Texture({
                    source: tex.source,
                    frame: new Rectangle(
                      tile.x * this.tileSize,
                      tile.y * this.tileSize,
                      this.tileSize,
                      this.tileSize
                    )
                  })
                )
                sprite.x = x + dx * this.tileSize
                sprite.y = y + dy * this.tileSize
                sprite.alpha = 0.5
                this.container.addChild(sprite)
              }
            }
          }
        }
      } else {
        // Single tile selection fallback
        const tex = this.textures.get(this.selection.tilesetId)
        if (tex) {
          // Check for pixel override
          const pX = this.selection.pixelX ?? this.selection.x * this.tileSize
          const pY = this.selection.pixelY ?? this.selection.y * this.tileSize
          const pW =
            this.selection.pixelW ??
            (this.selection.isAutotile ? this.tileSize : this.selection.w * this.tileSize)
          const pH =
            this.selection.pixelH ??
            (this.selection.isAutotile ? this.tileSize : this.selection.h * this.tileSize)

          const sprite = new Sprite(
            new Texture({
              source: tex.source,
              frame: new Rectangle(pX, pY, pW, pH)
            })
          )

          // Center-bottom align if it looks like a character (png)
          const isCharacter = this.selection.tilesetId.endsWith('.png')

          if (isCharacter) {
            sprite.anchor.set(0.5, 1)
            // Ghost position is top-left of the target tile.
            // We want the sprite bottom-center to be at the bottom-center of the target tile.
            sprite.x = x + this.tileSize / 2
            sprite.y = y + this.tileSize
          } else {
            sprite.x = x
            sprite.y = y
          }

          sprite.alpha = 0.5
          this.container.addChild(sprite)
        }
      }
    }
  }

  private selectionBox: { x: number; y: number; w: number; h: number } | null = null

  public setSelectionBox(box: { x: number; y: number; w: number; h: number } | null): void {
    this.selectionBox = box
    this.dirty = true
    this.active = true // Ensure render loop runs
  }

  private renderShape(): void {
    if (!this.shapeStart || !this.shapeEnd) return

    this.container.x = 0
    this.container.y = 0

    const g = new Graphics()
    const x = Math.min(this.shapeStart.x, this.shapeEnd.x) * this.tileSize
    const y = Math.min(this.shapeStart.y, this.shapeEnd.y) * this.tileSize
    const w = (Math.abs(this.shapeStart.x - this.shapeEnd.x) + 1) * this.tileSize
    const h = (Math.abs(this.shapeStart.y - this.shapeEnd.y) + 1) * this.tileSize

    if (this.currentTool === ZTool.rectangle) {
      g.rect(x, y, w, h)
      g.fill({ color: 0x00ff00, alpha: 0.2 }).stroke({ width: 2, color: 0x00ff00, alpha: 0.6 })
    } else if (this.currentTool === ZTool.circle) {
      g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2)
      g.fill({ color: 0x00ff00, alpha: 0.2 }).stroke({ width: 2, color: 0x00ff00, alpha: 0.6 })
    } else if (this.currentTool === ZTool.select) {
      g.rect(x, y, w, h)
      g.fill({ color: 0x0000ff, alpha: 0.1 }).stroke({ width: 2, color: 0x3399ff, alpha: 0.8 })
    }

    this.container.addChild(g)
  }

  private renderSelectionBox(): void {
    if (!this.selectionBox) return

    // Don't render selection box if we are currently dragging a shape (avoid double render)
    // Actually, selection box is persistent, shape drag is temporary.
    // If we are dragging a NEW selection, we show the shape drag.
    // If we have an existing selection, we show it.

    const g = new Graphics()
    const x = this.selectionBox.x * this.tileSize
    const y = this.selectionBox.y * this.tileSize
    const w = this.selectionBox.w * this.tileSize
    const h = this.selectionBox.h * this.tileSize

    g.rect(x, y, w, h)
    // Styling for persistent selection: animated ants would be cool, but simple dashed line for now or solid.
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
    g.rect(x, y, w, h)
    g.stroke({ width: 2, color: 0x000000, alpha: 0.5, alignment: 1 }) // Double stroke for visibility

    this.container.addChild(g)
  }

  public onUpdate(): void {
    if (!this.dirty) return

    this.container.removeChildren()
    this.container.visible = this.active

    if (this.isShape && this.shapeStart && this.shapeEnd) {
      this.renderShape()
    } else if (!this.isShape && this.selection) {
      this.renderSingleGhost()
    }

    // Always render selection box if it exists
    this.renderSelectionBox()

    // If usage of selectionBox keeps active true, we might need to handle 'dirty' carefully.
    // Ideally we only redraw on change.
    this.dirty = false
  }
}
