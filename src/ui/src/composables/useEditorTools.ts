import { Ref, ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { useDatabaseStore } from '@ui/stores/database'
import { ZTool, type IEngineContext } from '@engine/types'
import type { FederatedPointerEvent } from '@engine/utils/pixi'

export const useEditorTools = (): {
  shapeStartPos: Ref<{ x: number; y: number } | null>
  activeEventCoords: Ref<{ x: number; y: number } | null>
  activeEventId: Ref<string | null>
  handleInteraction: (
    event: FederatedPointerEvent,
    engine: IEngineContext | null,
    isCommit?: boolean
  ) => void
  clearEventSelection: () => void
  deleteSelection: (engine: IEngineContext) => void
} => {
  const store = useEditorStore()
  const shapeStartPos = ref<{ x: number; y: number } | null>(null)

  // State for event editor
  const db = useDatabaseStore()
  const activeEventCoords = ref<{ x: number; y: number } | null>(null)
  const activeEventId = ref<string | null>(null)
  const draggingEventId = ref<string | null>(null)
  const draggingPlayerStart = ref(false)
  const dragStartPos = ref<{ x: number; y: number } | null>(null)

  const handleInteraction = (
    event: FederatedPointerEvent,
    engine: IEngineContext | null,
    isCommit = false
  ): void => {
    if (!engine || !store.selection || !store.activeMap) return
    const gridSystem = engine.grid
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
      engine.tools.bucketFill(target, store.selection, layer, isStacking)
      return
    }

    if (tool === ZTool.event) {
      const existing = store.activeMap.events?.find((e) => e.x === target.x && e.y === target.y)

      if (isCommit) {
        // Pointer Up (Commit)
        if (draggingEventId.value && dragStartPos.value) {
          // Finish Event Drag
          const hasMoved = dragStartPos.value.x !== target.x || dragStartPos.value.y !== target.y
          if (hasMoved) {
            store.moveEvent(draggingEventId.value, target.x, target.y)
            const ghost = engine.ghost
            ghost?.setSelectedEventPos({ x: target.x, y: target.y })
            ghost?.setDirty()
          } else {
            // Clicked, not moved
            if (existing?.name !== 'PlayerStart') {
              activeEventCoords.value = { x: target.x, y: target.y }
              activeEventId.value = existing?.id || null
              store.selectedEventId = existing?.id || null
            }
          }
        } else if (draggingPlayerStart.value && dragStartPos.value) {
          // Finish Player Start Drag
          const hasMoved = dragStartPos.value.x !== target.x || dragStartPos.value.y !== target.y
          if (hasMoved) {
            store.systemStartX = target.x
            store.systemStartY = target.y
            // Force redraw of player start marker via engine/store sync
            // The watcher in useEngine will pick this up
          }
          engine.ghost.setDraggingPlayerStart(null)
        } else if (!draggingEventId.value && !draggingPlayerStart.value) {
          // Click on empty space
          if (!existing) {
            // Check if we clicked Player Start to select it (optional, maybe just visual feedback?)
            // For now, if we click player start without dragging, we do nothing or clear selection
            const isPlayerStart =
              store.activeMap.id === store.systemStartMapId &&
              store.systemStartX === target.x &&
              store.systemStartY === target.y

            if (!isPlayerStart) {
              activeEventCoords.value = { x: target.x, y: target.y }
              activeEventId.value = null
            }
          }
        }
        draggingEventId.value = null
        draggingPlayerStart.value = false
        dragStartPos.value = null
        engine.ghost.setDraggingEventId(null)
        engine.ghost.setDraggingPlayerStart(null)
      } else {
        // Pointer Down or Move (Drag Start / Dragging)

        // Check for Player Start Drag Initiation
        const isPlayerStart =
          store.activeMap.id === store.systemStartMapId &&
          store.systemStartX === target.x &&
          store.systemStartY === target.y

        if (!draggingEventId.value && !draggingPlayerStart.value) {
          if (existing) {
            // Start Event Drag
            draggingEventId.value = existing.id
            dragStartPos.value = { x: target.x, y: target.y }
            store.selectedEventId = existing.id
            const ghost = engine.ghost
            ghost.setDraggingEventId(existing.id)
            ghost.setSelectedEventPos({ x: target.x, y: target.y })
            ghost.setVisible(true)
          } else if (isPlayerStart) {
            // Start Player Start Drag
            draggingPlayerStart.value = true
            dragStartPos.value = { x: target.x, y: target.y }

            // Prepare Ghost Data
            const actor1 = db.actors.find((a) => a.id === 1)
            let charPath = actor1?.character || ''
            if (charPath && !charPath.startsWith('img/')) {
              charPath = `img/characters/${charPath}`
            }

            engine.ghost.setDraggingPlayerStart({
              graphic: charPath,
              charX: actor1?.characterX || 0,
              charY: actor1?.characterY || 0,
              srcX: actor1?.characterSrcX,
              srcY: actor1?.characterSrcY,
              srcW: actor1?.characterSrcW,
              srcH: actor1?.characterSrcH
            })
            engine.ghost.setVisible(true)
          }
        }

        if (draggingEventId.value) {
          // Update Event Ghost
          const ghost = engine.ghost
          ghost.update(target.x, target.y, store.selection, tool, layer)
          ghost.setSelectedEventPos({ x: target.x, y: target.y })
        } else if (draggingPlayerStart.value) {
          // Update Player Start Ghost
          const ghost = engine.ghost
          ghost.update(target.x, target.y, store.selection, tool, layer)
        }
      }
      return
    }

    if ((tool === ZTool.rectangle || tool === ZTool.circle) && isCommit && shapeStartPos.value) {
      engine.tools.drawShape(
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
      engine.tools.brush(target, store.selection, layer, isStacking, tool === ZTool.eraser)
      return
    }
  }

  const clearEventSelection = (): void => {
    activeEventCoords.value = null
    activeEventId.value = null
  }

  const deleteSelection = (engine: IEngineContext): void => {
    if (!store.selectionCoords || !store.activeMap) return
    const { x, y, w, h } = store.selectionCoords
    const layer = store.activeLayer

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        engine.tools.applyTile(x + dx, y + dy, null, false, layer)
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
