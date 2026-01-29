import { Ref, ref } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { ZLayer, ZTool, TileSelection } from '@engine/types'
import type { FederatedPointerEvent } from '@engine/utils/pixi'

export const useEditorTools = (): {
  shapeStartPos: Ref<{ x: number; y: number } | null>
  activeEventCoords: Ref<{ x: number; y: number } | null>
  activeEventId: Ref<string | null>
  handleInteraction: (
    event: FederatedPointerEvent,
    engine: ZEngine | null,
    isCommit?: boolean
  ) => void
  clearEventSelection: () => void
  deleteSelection: (engine: ZEngine) => void
} => {
  const store = useEditorStore()
  const shapeStartPos = ref<{ x: number; y: number } | null>(null)

  // State for event editor (can be exposed if needed by the component)
  const activeEventCoords = ref<{ x: number; y: number } | null>(null)
  const activeEventId = ref<string | null>(null)

  const applyTile = (
    x: number,
    y: number,
    ox: number,
    oy: number,
    layer: ZLayer,
    isEraser: boolean,
    isStacking: boolean,
    engine: ZEngine,
    overrideTile?: TileSelection | null
  ): void => {
    if (!store.activeMap) return // store.selection check moved down
    if (x < 0 || x >= store.activeMap.width || y < 0 || y >= store.activeMap.height) return

    // Use overrideTile if provided, otherwise use store.selection
    const sourceTile = overrideTile !== undefined ? overrideTile : store.selection

    if (isEraser) {
      store.setTileAt(x, y, null, false, layer)
      engine.renderSystem?.clearTileAt(x, y, layer)
    } else if (sourceTile) {
      const isAutotile = sourceTile.isAutotile
      const tile = {
        ...sourceTile,
        x: isAutotile ? sourceTile.x : sourceTile.x + ox,
        y: isAutotile ? sourceTile.y : sourceTile.y + oy,
        w: 1,
        h: 1
      }
      store.setTileAt(x, y, tile, isStacking, layer)
      const stack = store.activeMap.layers[layer].data[y]?.[x]
      if (stack) engine.renderSystem?.requestTileUpdate(x, y, stack, layer)
    }
    refreshNeighbors(x, y, layer, engine)
  }

  const refreshNeighbors = (tx: number, ty: number, layer: ZLayer, engine: ZEngine): void => {
    if (!store.activeMap) return
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = tx + dx
        const ny = ty + dy
        if (nx >= 0 && nx < store.activeMap.width && ny >= 0 && ny < store.activeMap.height) {
          const stack = store.activeMap.layers[layer].data[ny]?.[nx]
          if (stack && stack.length > 0) {
            engine.renderSystem?.requestTileUpdate(nx, ny, stack, layer)
          }
        }
      }
    }
  }

  const drawBucket = (
    target: { x: number; y: number },
    layer: ZLayer,
    isStacking: boolean,
    engine: ZEngine
  ): void => {
    if (!store.activeMap || !store.selection) return

    const stack = store.activeMap.layers[layer].data[target.y]?.[target.x]
    if (!stack) return

    const targetTile = stack[stack.length - 1]
    if (!targetTile) return

    const queue = [target]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const current = queue.shift()!
      const key = `${current.x},${current.y}`

      if (visited.has(key)) continue
      visited.add(key)

      const currentStack = store.activeMap.layers[layer].data[current.y]?.[current.x]
      if (!currentStack) continue

      const currentTile = currentStack[currentStack.length - 1]
      // If no tile, fill it. If distinct tile is same as target, fill it.
      if (!currentTile) {
        applyTile(current.x, current.y, 0, 0, layer, false, isStacking, engine)
        continue
      }

      if (currentTile.tilesetId !== targetTile.tilesetId) continue

      applyTile(current.x, current.y, 0, 0, layer, false, isStacking, engine)

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ]

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < store.activeMap.width && n.y >= 0 && n.y < store.activeMap.height) {
          queue.push(n)
        }
      }
    }
  }

  const drawBrush = (
    target: { x: number; y: number },
    tool: ZTool,
    layer: ZLayer,
    isStacking: boolean,
    engine: ZEngine
  ): void => {
    // If pattern exists, use its dimensions. Otherwise respect autotile logic.
    // NOTE: This fixes the bug where pasting a pattern with an autotile base tile would result in w=1, h=1.
    const pattern = store.selection?.pattern
    const isEraser = tool === ZTool.eraser
    const isAutotile = store.selection?.isAutotile

    let w = 1
    let h = 1

    // Check for multi-layer structure
    if (store.selection?.structure && !isEraser) {
      const structure = store.selection.structure
      const w = store.selection.w
      const h = store.selection.h

      for (const layerKey in structure) {
        // If it's a multi-layer copy, we respect the original layer IDs (ZLayer values).
        // If it's a single-layer copy (but with stack structure), we paste everything into the CURRENT active layer.
        const targetLayer = store.selection.isMultiLayer === true ? (layerKey as ZLayer) : layer // 'layer' arg is the active layer passed to drawBrush

        const grid = structure[layerKey as ZLayer]
        if (!grid) continue

        for (let ox = 0; ox < w; ox++) {
          for (let oy = 0; oy < h; oy++) {
            const stack = grid[oy]?.[ox]
            if (stack && stack.length > 0) {
              const tx = target.x + ox
              const ty = target.y + oy

              stack.forEach((tile, index) => {
                if (index === 0) {
                  // Replace mode for first tile in stack
                  applyTile(tx, ty, 0, 0, targetLayer, false, false, engine, tile)
                } else {
                  // Stack mode for subsequent tiles
                  applyTile(tx, ty, 0, 0, targetLayer, false, true, engine, tile)
                }
              })
            }
          }
        }
      }
      return
    }

    if (pattern && !isEraser) {
      w = store.selection!.w
      h = store.selection!.h
    } else {
      w = isEraser || isAutotile ? 1 : store.selection!.w
      h = isEraser || isAutotile ? 1 : store.selection!.h
    }

    // console.log('drawBrush executing. Pattern:', !!pattern, 'Eraser:', isEraser)
    for (let ox = 0; ox < w; ox++) {
      for (let oy = 0; oy < h; oy++) {
        // If we have a pattern (clipboard paste), use the specific tile from pattern
        if (store.selection?.pattern && !isEraser) {
          const patternTile = store.selection.pattern[oy]?.[ox]
          // console.log('Pattern tile at', ox, oy, patternTile)
          if (patternTile) {
            // We need to override the tile being applied with the one from pattern
            // Hack: we modify the selection temporarily or pass the tile directly?
            // `applyTile` uses `store.selection`.
            // We should modify `applyTile` or `drawBrush` to support explicit tile data.
            // Providing a modified applyTile is better.
            applyTile(
              target.x + ox,
              target.y + oy,
              0,
              0,
              layer,
              false,
              isStacking,
              engine,
              patternTile
            )
          }
          // If pattern tile is null, we might want to skip or erase?
          // Standard generic behavior: skip nulls in pattern (transparent).
        } else {
          applyTile(target.x + ox, target.y + oy, ox, oy, layer, isEraser, isStacking, engine)
        }
      }
    }
  }

  const drawShape = (
    start: { x: number; y: number },
    end: { x: number; y: number },
    tool: ZTool,
    layer: ZLayer,
    isStacking: boolean,
    engine: ZEngine
  ): void => {
    const xMin = Math.min(start.x, end.x),
      xMax = Math.max(start.x, end.x)
    const yMin = Math.min(start.y, end.y),
      yMax = Math.max(start.y, end.y)

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        let shouldDraw = false
        if (tool === ZTool.rectangle) shouldDraw = true
        else if (tool === ZTool.circle) {
          const cx = (xMin + xMax) / 2,
            cy = (yMin + yMax) / 2
          const rx = (xMax - xMin) / 2 + 0.5,
            ry = (yMax - yMin) / 2 + 0.5
          if (Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) <= 1) shouldDraw = true
        }

        if (shouldDraw) applyTile(x, y, 0, 0, layer, false, isStacking, engine)
      }
    }
  }

  const handleInteraction = (
    event: FederatedPointerEvent,
    engine: ZEngine | null,
    isCommit = false
  ): void => {
    if (!engine || !engine.gridSystem || !store.selection || !store.activeMap) return
    const target = engine.gridSystem.getTileCoords(event)

    if (
      !target ||
      target.x < 0 ||
      target.x >= store.activeMap.width ||
      target.y < 0 ||
      target.y >= store.activeMap.height
    )
      return

    const tool = store.currentTool
    const layer = store.activeLayer
    const isStacking = event.shiftKey

    if (tool === ZTool.bucket && isCommit) {
      drawBucket(target, layer, isStacking, engine)
      return
    }

    if (tool === ZTool.event && isCommit) {
      const existing = store.activeMap.events?.find((e) => e.x === target.x && e.y === target.y)

      // Prevent opening editor for PlayerStart
      if (existing?.name === 'PlayerStart') {
        return
      }

      activeEventCoords.value = { x: target.x, y: target.y }
      activeEventId.value = existing?.id || null
      return
    }

    if ((tool === ZTool.rectangle || tool === ZTool.circle) && isCommit && shapeStartPos.value) {
      drawShape(shapeStartPos.value, target, tool, layer, isStacking, engine)
      return
    }

    if (tool === ZTool.select && isCommit && shapeStartPos.value) {
      const start = shapeStartPos.value
      const end = target
      const x = Math.min(start.x, end.x)
      const y = Math.min(start.y, end.y)
      const w = Math.abs(start.x - end.x) + 1
      const h = Math.abs(start.y - end.y) + 1

      store.setSelectionCoords({ x, y, w, h })
      return
    }

    // Default brush/eraser behavior
    if ((tool === ZTool.brush || tool === ZTool.eraser) && !shapeStartPos.value) {
      drawBrush(target, tool, layer, isStacking, engine)
      return
    }
  }

  const clearEventSelection = (): void => {
    activeEventCoords.value = null
    activeEventId.value = null
  }

  const deleteSelection = (engine: ZEngine): void => {
    if (!store.selectionCoords || !store.activeMap) return
    const { x, y, w, h } = store.selectionCoords
    const layer = store.activeLayer

    // Batch update store (IO heavy)
    store.clearRegion(x, y, w, h)

    // Batch update engine visuals
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = x + dx
        const ty = y + dy
        if (tx >= 0 && tx < store.activeMap.width && ty >= 0 && ty < store.activeMap.height) {
          engine.renderSystem?.clearTileAt(tx, ty, layer)
          // Also refresh neighbors to update auto-tiles
          // refreshNeighbors(tx, ty, layer, engine)
          // Note: refreshNeighbors iterates neighbors. For a large block, this is overlapping.
          // Ideally we refresh the perimeter. For now, doing it per tile is safer for correctness,
          // though redundant. engine updates are cheap (PIXI).
          // Actually, let's skip neighbor refresh for internal tiles for optimization if needed,
          // but for now correctness first.
        }
      }
    }

    // Refresh neighbors for the entire block perimeter to fix autotiles
    // Doing it naively for all for now.
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        refreshNeighbors(x + dx, y + dy, layer, engine)
      }
    }

    store.setSelectionCoords(null)
  }

  return {
    shapeStartPos,
    activeEventCoords,
    activeEventId,
    handleInteraction,
    clearEventSelection,
    deleteSelection
  }
}
