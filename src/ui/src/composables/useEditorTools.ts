import { Ref, ref } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { ZTool } from '@engine/types'
import type { FederatedPointerEvent } from '@engine/utils/pixi'
import { ToolManager } from '@engine/managers/ToolManager'
import { GridSystem } from '@engine/systems/GridSystem'
import { GhostSystem } from '@engine/systems/GhostSystem'

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
  const draggingEventId = ref<string | null>(null)
  const dragStartPos = ref<{ x: number; y: number } | null>(null)

  const handleInteraction = (
    event: FederatedPointerEvent,
    engine: ZEngine | null,
    isCommit = false
  ): void => {
    if (!engine || !store.selection || !store.activeMap) return
    const gridSystem = engine.services.get(GridSystem)
    if (!gridSystem) return
    const target = gridSystem.getTileCoords(event)

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

    if (tool === ZTool.event) {
      const existing = store.activeMap.events?.find((e) => e.x === target.x && e.y === target.y)

      if (isCommit) {
        // Pointer Up (Commit)
        if (draggingEventId.value && dragStartPos.value) {
          // Finish Drag
          const hasMoved = dragStartPos.value.x !== target.x || dragStartPos.value.y !== target.y
          if (hasMoved) {
            store.moveEvent(draggingEventId.value, target.x, target.y)
            const ghost = engine.services.get(GhostSystem)
            ghost?.setSelectedEventPos({ x: target.x, y: target.y })
            ghost?.setDirty()
          } else {
            // It was a click, not a drag
            if (existing?.name !== 'PlayerStart') {
              activeEventCoords.value = { x: target.x, y: target.y }
              activeEventId.value = existing?.id || null
              store.selectedEventId = existing?.id || null
            }
          }
        } else if (!draggingEventId.value) {
          // Click on empty space (possibly to create new event or just deselect)
          if (!existing) {
            activeEventCoords.value = { x: target.x, y: target.y }
            activeEventId.value = null
          }
        }
        draggingEventId.value = null
        dragStartPos.value = null
        engine.services.get(GhostSystem)?.setDraggingEventId(null)
      } else {
        // Pointer Down or Move
        if (!draggingEventId.value && existing) {
          // Start Drag
          draggingEventId.value = existing.id
          dragStartPos.value = { x: target.x, y: target.y }
          store.selectedEventId = existing.id
          const ghost = engine.services.get(GhostSystem)
          ghost?.setDraggingEventId(existing.id)
          ghost?.setSelectedEventPos({ x: target.x, y: target.y })
          ghost?.setVisible(true)
        }

        if (draggingEventId.value) {
          // Update Ghost during drag
          const ghost = engine.services.require(GhostSystem)
          ghost.update(target.x, target.y, store.selection, tool, layer)
          ghost.setSelectedEventPos({ x: target.x, y: target.y })
        }
      }
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
