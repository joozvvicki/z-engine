import { Ref, ref } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { ZLayer, ZTool } from '@engine/utils/enums'
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
    engine: ZEngine
  ): void => {
    if (!store.activeMap || !store.selection) return
    if (x < 0 || x >= store.activeMap.width || y < 0 || y >= store.activeMap.height) return

    if (isEraser) {
      store.setTileAt(x, y, null)
      engine.renderSystem?.clearTileAt(x, y, layer)
    } else {
      const isAutotile = store.selection.isAutotile
      const tile = {
        ...store.selection,
        x: isAutotile ? store.selection.x : store.selection.x + ox,
        y: isAutotile ? store.selection.y : store.selection.y + oy,
        w: 1,
        h: 1
      }
      store.setTileAt(x, y, tile, isStacking)
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
    const isEraser = tool === ZTool.eraser
    const isAutotile = store.selection?.isAutotile
    const w = isEraser || isAutotile ? 1 : store.selection!.w
    const h = isEraser || isAutotile ? 1 : store.selection!.h

    for (let ox = 0; ox < w; ox++) {
      for (let oy = 0; oy < h; oy++) {
        applyTile(target.x + ox, target.y + oy, ox, oy, layer, isEraser, isStacking, engine)
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
      activeEventCoords.value = { x: target.x, y: target.y }
      activeEventId.value = existing?.id || null
      return
    }

    if ((tool === ZTool.rectangle || tool === ZTool.circle) && isCommit && shapeStartPos.value) {
      drawShape(shapeStartPos.value, target, tool, layer, isStacking, engine)
      return
    }

    if ((tool === ZTool.brush || tool === ZTool.eraser) && !shapeStartPos.value) {
      drawBrush(target, tool, layer, isStacking, engine)
      return
    }
  }

  const clearEventSelection = (): void => {
    activeEventCoords.value = null
    activeEventId.value = null
  }

  return {
    shapeStartPos,
    activeEventCoords,
    activeEventId,
    handleInteraction,
    clearEventSelection
  }
}
