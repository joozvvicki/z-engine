import { ZLayer, TileSelection, ZTool, ZTileDelta } from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZManager } from '@engine/core/ZManager'
import { RenderSystem } from '@engine/systems'
import { HistoryManager } from '@engine/managers'

/**
 * Handles editor tool logic (painting, fill, etc.) inside the engine.
 */
export class ToolManager extends ZManager {
  constructor(services: ServiceLocator) {
    super(services)
  }

  private get historyManager(): HistoryManager {
    return this.services.require(HistoryManager)
  }

  private get renderSystem(): RenderSystem | undefined {
    return this.services.get(RenderSystem)
  }

  /**
   * Main entry point for applying a tile at a specific coordinate.
   */
  public applyTile(
    x: number,
    y: number,
    tile: TileSelection | null,
    isStacking: boolean,
    layer: ZLayer
  ): void {
    const map = this.map.currentMap
    if (!map) return
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return

    // 0. Capture old state for History
    const oldStack = map.layers[layer].data[y]?.[x] ? [...map.layers[layer].data[y][x]] : null

    // 1. Sync to Data Provider (Store) - This ensures store is the owner of data
    if (this.dataProvider) {
      this.dataProvider.setTileAt(x, y, tile, isStacking, layer)
    }

    // 2. Trigger Render Update (After store sync, map data is updated)
    const newStack = map.layers[layer].data[y]?.[x] ? [...map.layers[layer].data[y][x]] : null

    // Check if change actually occurred
    if (!this.areStacksEqual(oldStack, newStack)) {
      // Record delta
      const delta: ZTileDelta = {
        x,
        y,
        layer,
        oldStack: oldStack || [],
        newStack: newStack || []
      }
      this.historyManager.addDelta(delta)
    }

    if (newStack && newStack.length > 0) {
      this.renderSystem?.requestTileUpdate(x, y, newStack, layer)
    } else {
      // If stack is empty/null, clear the tile
      this.renderSystem?.clearTileAt(x, y, layer)
    }

    // 3. Refresh Neighbors for Autotiles
    this.refreshNeighbors(x, y, layer)
  }

  private areStacksEqual(
    a: TileSelection[] | null | undefined,
    b: TileSelection[] | null | undefined
  ): boolean {
    const stackA = a || []
    const stackB = b || []

    if (stackA.length !== stackB.length) return false

    for (let i = 0; i < stackA.length; i++) {
      const tA = stackA[i]
      const tB = stackB[i]
      if (
        tA.tilesetId !== tB.tilesetId ||
        tA.x !== tB.x ||
        tA.y !== tB.y ||
        tA.w !== tB.w ||
        tA.h !== tB.h
      ) {
        return false
      }
    }
    return true
  }

  /**
   * Brush tool: Applies a selection (possibly multi-tile/layer) at target.
   */
  public brush(
    target: { x: number; y: number },
    selection: TileSelection,
    layer: ZLayer,
    isStacking: boolean,
    isEraser: boolean = false
  ): void {
    this.historyManager.beginEntry(isEraser ? 'Erase' : 'Brush')

    if (isEraser) {
      this.applyTile(target.x, target.y, null, false, layer)
      this.historyManager.commitEntry()
      return
    }

    // Handle Multi-Layer Structure
    if (selection.structure) {
      const { w, h, structure, isMultiLayer } = selection
      for (const layerKey in structure) {
        const targetLayer = isMultiLayer ? (layerKey as ZLayer) : layer
        const grid = structure[layerKey as ZLayer]
        if (!grid) continue

        for (let ox = 0; ox < w; ox++) {
          for (let oy = 0; oy < h; oy++) {
            const stack = grid[oy]?.[ox]
            if (stack && stack.length > 0) {
              const tx = target.x + ox
              const ty = target.y + oy
              stack.forEach((tile, index) => {
                this.applyTile(tx, ty, tile, index > 0, targetLayer)
              })
            }
          }
        }
      }
      this.historyManager.commitEntry()
      return
    }

    // Handle Pattern/Stamp
    if (selection.pattern) {
      const { w, h, pattern } = selection
      for (let oy = 0; oy < h; oy++) {
        for (let ox = 0; ox < w; ox++) {
          const tile = pattern[oy]?.[ox]
          if (tile) {
            this.applyTile(target.x + ox, target.y + oy, tile, isStacking, layer)
          }
        }
      }
      this.historyManager.commitEntry()
      return
    }

    // Single Tile / Simple Selection
    const { w, h } = selection
    for (let oy = 0; oy < h; oy++) {
      for (let ox = 0; ox < w; ox++) {
        const tile = {
          ...selection,
          x: selection.isAutotile ? selection.x : selection.x + ox,
          y: selection.isAutotile ? selection.y : selection.y + oy,
          w: 1,
          h: 1
        }
        this.applyTile(target.x + ox, target.y + oy, tile, isStacking, layer)
      }
    }
    this.historyManager.commitEntry()
  }

  /**
   * Bucket Fill tool: Standard flood fill.
   */
  public bucketFill(
    target: { x: number; y: number },
    selection: TileSelection,
    layer: ZLayer,
    isStacking: boolean
  ): void {
    this.historyManager.beginEntry('Bucket Fill')
    const map = this.map.currentMap
    if (!map) return

    const stack = map.layers[layer].data[target.y]?.[target.x]
    if (!stack) return

    const targetTile = stack[stack.length - 1]
    if (!targetTile && !selection) return

    const queue: { x: number; y: number }[] = [target]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const current = queue.shift()!
      const key = `${current.x},${current.y}`
      if (visited.has(key)) continue
      visited.add(key)

      const currentStack = map.layers[layer].data[current.y]?.[current.x]
      if (!currentStack) continue

      const currentTile = currentStack[currentStack.length - 1]

      let match = false
      if (!currentTile && !targetTile) match = true
      else if (currentTile && targetTile && currentTile.tilesetId === targetTile.tilesetId) {
        match = true
      }

      if (match) {
        this.applyTile(current.x, current.y, selection, isStacking, layer)

        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 }
        ]

        for (const n of neighbors) {
          if (n.x >= 0 && n.x < map.width && n.y >= 0 && n.y < map.height) {
            queue.push(n)
          }
        }
      }
    }
    this.historyManager.commitEntry()
  }

  /**
   * Shape tool: Rectangle/Circle.
   */
  public drawShape(
    start: { x: number; y: number },
    end: { x: number; y: number },
    type: ZTool.rectangle | ZTool.circle,
    selection: TileSelection,
    layer: ZLayer,
    isStacking: boolean
  ): void {
    this.historyManager.beginEntry(type === ZTool.rectangle ? 'Rectangle' : 'Circle')
    const xMin = Math.min(start.x, end.x)
    const xMax = Math.max(start.x, end.x)
    const yMin = Math.min(start.y, end.y)
    const yMax = Math.max(start.y, end.y)

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        let shouldDraw = false
        if (type === ZTool.rectangle) shouldDraw = true
        else if (type === ZTool.circle) {
          const cx = (xMin + xMax) / 2
          const cy = (yMin + yMax) / 2
          const rx = (xMax - xMin) / 2 + 0.5
          const ry = (yMax - yMin) / 2 + 0.5
          if (Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) <= 1) shouldDraw = true
        }

        if (shouldDraw) this.applyTile(x, y, selection, isStacking, layer)
      }
    }
    this.historyManager.commitEntry()
  }

  private refreshNeighbors(tx: number, ty: number, layer: ZLayer): void {
    const map = this.map.currentMap
    if (!map) return

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = tx + dx
        const ny = ty + dy
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          const stack = map.layers[layer].data[ny]?.[nx]
          if (stack && stack.length > 0) {
            this.renderSystem?.requestTileUpdate(nx, ny, stack, layer)
          }
        }
      }
    }
  }
}
