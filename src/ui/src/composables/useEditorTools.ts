import { Ref, ref } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { ZTool } from '@engine/types'
import type { FederatedPointerEvent } from '@engine/utils/pixi'
import { ToolManager } from '@engine/managers/ToolManager'

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

  // State for event editor
  const activeEventCoords = ref<{ x: number; y: number } | null>(null)
  const activeEventId = ref<string | null>(null)

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
      engine.services.require(ToolManager).bucketFill(target, store.selection, layer, isStacking)
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
      engine.services
        .require(ToolManager)
        .drawShape(
          shapeStartPos.value,
          target,
          tool as ZTool.rectangle | ZTool.circle,
          store.selection,
          layer,
          isStacking
        )
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
      engine.services
        .require(ToolManager)
        .brush(target, store.selection, layer, isStacking, tool === ZTool.eraser)
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

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        engine.services.require(ToolManager).applyTile(x + dx, y + dy, null, false, layer)
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
