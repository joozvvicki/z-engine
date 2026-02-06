import { ref, watch, nextTick, type Ref } from 'vue'
import type { FederatedPointerEvent } from '@engine/utils/pixi'
import { useEditorStore } from '@ui/stores/editor'
import { useViewport } from './useViewport'
import { useEditorTools } from './useEditorTools'
import { ZTool, type IEngineContext } from '@engine/types'

export const useEditorInput = (
  engine: Ref<IEngineContext | null>,
  canvasContainer: Ref<HTMLElement | null>
): {
  onPointerDown: (event: FederatedPointerEvent) => void
  onPointerMove: (event: FederatedPointerEvent) => void
  onPointerUp: (event: FederatedPointerEvent) => void
  onWheel: (event: WheelEvent) => void
  scale: Ref<number>
  target: Ref<{ x: number; y: number } | null | undefined>
  resetViewport: (container: HTMLElement) => void
  activeEventCoords: Ref<{ x: number; y: number } | null>
  activeEventId: Ref<string | null>
  clearEventSelection: () => void
  deleteSelection: (engine: IEngineContext) => void
} => {
  const store = useEditorStore()
  const isPointerDown = ref(false)
  const target = ref<{ x: number; y: number } | null | undefined>(null)

  const {
    scale,
    pan,
    isPanning,
    handleWheel,
    startPan,
    updatePan,
    endPan,
    resetViewport,
    updateTransform,
    center
  } = useViewport()

  const {
    shapeStartPos,
    activeEventCoords,
    activeEventId,
    handleInteraction,
    clearEventSelection,
    deleteSelection
  } = useEditorTools()

  const onPointerDown = (event: FederatedPointerEvent): void => {
    // Middle Mouse -> Pan
    if (event.button === 1) {
      startPan(event.global.x, event.global.y)
      return
    }

    if (event.button !== 0 || !engine.value) return
    if (store.isTestMode) return
    if (engine.value) {
      target.value = engine.value.grid.getTileCoords(event)
    }

    // Alt + Click -> Pick Tile
    if (event.altKey && target.value) {
      store.pickTile(target.value.x, target.value.y)
      return
    }

    isPointerDown.value = true

    if (store.currentTool === ZTool.bucket) {
      handleInteraction(event, engine.value, true)
      store.recordHistory()
      return
    }

    if ([ZTool.rectangle, ZTool.circle, ZTool.select].includes(store.currentTool) && target.value) {
      shapeStartPos.value = target.value
    } else {
      handleInteraction(event, engine.value)
    }
  }

  const onPointerMove = (event: FederatedPointerEvent): void => {
    if (store.isTestMode) return
    if (isPanning.value) {
      updatePan(event.global.x, event.global.y, canvasContainer.value)
      return
    }
    if (!engine.value) return

    target.value = engine.value.grid.getTileCoords(event)
    const tool = store.currentTool

    if (target.value) {
      store.cursorX = target.value.x
      store.cursorY = target.value.y
    }

    if (
      [ZTool.rectangle, ZTool.circle, ZTool.select].includes(tool) &&
      isPointerDown.value &&
      shapeStartPos.value
    ) {
      if (target.value)
        engine.value.ghost.updateShape(
          shapeStartPos.value,
          target.value,
          tool,
          store.selection,
          store.activeLayer
        )
    } else {
      if (target.value) {
        engine.value.ghost.update(
          target.value.x,
          target.value.y,
          store.selection,
          tool,
          store.activeLayer
        )
      } else {
        engine.value.ghost.hide()
      }

      if (
        isPointerDown.value &&
        (tool === ZTool.brush || tool === ZTool.eraser || tool === ZTool.event)
      ) {
        handleInteraction(event, engine.value)
      }
    }
  }

  const onPointerUp = (event: FederatedPointerEvent): void => {
    if (store.isTestMode) {
      isPointerDown.value = false
      return
    }
    if (isPanning.value) {
      endPan()
      return
    }

    if (isPointerDown.value) {
      if ([ZTool.rectangle, ZTool.circle, ZTool.event, ZTool.select].includes(store.currentTool)) {
        handleInteraction(event, engine.value, true)
      }
      store.recordHistory()
    }
    isPointerDown.value = false
    shapeStartPos.value = null
    engine.value?.ghost.hide()
  }

  const onWheel = (event: WheelEvent): void => {
    if (store.isTestMode) return
    handleWheel(event, canvasContainer.value)
  }

  // 1. Sync selection box with ghost system
  watch(
    () => store.selectionCoords,
    () => {
      const ghostSystem = engine.value?.ghost
      if (engine.value && ghostSystem && store.selectionCoords) {
        ghostSystem.setSelectionBox(store.selectionCoords)
      } else if (engine.value && ghostSystem) {
        ghostSystem.setSelectionBox(null)
      }
    }
  )

  // 1.2 Sync selected event highlight
  watch(
    () => [store.selectedEventId, store.activeMap?.events],
    () => {
      const ghostSystem = engine.value?.ghost
      if (engine.value && ghostSystem && store.selectedEventId && store.activeMap) {
        const ev = store.activeMap.events.find((e) => e.id === store.selectedEventId)
        if (ev) {
          ghostSystem.setSelectedEventPos({ x: ev.x, y: ev.y })
          ghostSystem.setVisible(true) // Ensure visible if we have a selection
          return
        }
      }
      ghostSystem?.setSelectedEventPos(null)
    },
    { deep: true }
  )

  // 1.5. Force immediate ghost update when selection or tool changes
  watch(
    [() => store.selection, () => store.currentTool],
    () => {
      if (engine.value && target.value) {
        engine.value.ghost.update(
          target.value.x,
          target.value.y,
          store.selection,
          store.currentTool,
          store.activeLayer
        )
      }
    },
    { deep: true }
  )

  // --- Viewport Persistence Logic ---

  // 1. Load state when switching maps OR when store changes externally (e.g. via UI)
  watch(
    () => (store.activeMapID !== null ? store.mapViewportStates[store.activeMapID] : null),
    (saved, oldSaved) => {
      if (!saved) return

      // Only update local refs if they differ from store (to avoid infinite loops)
      if (saved.scale !== scale.value) {
        scale.value = saved.scale
      }
      if (saved.pan.x !== pan.value.x || saved.pan.y !== pan.value.y) {
        pan.value = { ...saved.pan }
      }

      // Apply to DOM on next tick if just starting or scale/pan changed
      if (
        !oldSaved ||
        saved.scale !== oldSaved.scale ||
        saved.pan.x !== oldSaved.pan.x ||
        saved.pan.y !== oldSaved.pan.y
      ) {
        nextTick(() => updateTransform(canvasContainer.value))
      }
    },
    { immediate: true, deep: true }
  )

  // 1.5. Force transform update when container mounts/re-mounts
  watch(
    () => canvasContainer.value,
    (el) => {
      if (el) {
        // If we have a saved state, use it. Otherwise, apply default alignment.
        if (store.activeMapID !== null && store.mapViewportStates[store.activeMapID]) {
          updateTransform(el)
        } else {
          resetViewport(el, store.mapAlignment)
        }
      }
    }
  )

  // 1.7. Watch mapAlignment and force re-centering if enabled
  watch(
    () => store.mapAlignment,
    (align) => {
      // We only force a reset if we DON'T have a saved state OR if we want to force re-center
      // For now, let's just apply it to the current view if it's the default 1:1 view
      if (canvasContainer.value && scale.value === 1) {
        resetViewport(canvasContainer.value, align)
      }
    }
  )

  // 1.8. Maintain centering during zoom if alignment is 'center'
  watch(scale, () => {
    if (store.mapAlignment === 'center' && canvasContainer.value) {
      // Use nextTick to ensure transform is applied before re-centering
      nextTick(() => center(canvasContainer.value))
    }
  })

  // 2. Save state when it changes locally
  watch(
    [scale, () => pan.value.x, () => pan.value.y],
    ([newScale, newPanX, newPanY]) => {
      if (store.activeMapID === null) return

      const currentStoreState = store.mapViewportStates[store.activeMapID]

      // Only update store if local state changed compared to store
      if (
        !currentStoreState ||
        currentStoreState.scale !== newScale ||
        currentStoreState.pan.x !== newPanX ||
        currentStoreState.pan.y !== newPanY
      ) {
        store.mapViewportStates[store.activeMapID] = {
          scale: newScale,
          pan: { x: newPanX, y: newPanY }
        }
      }
    },
    { deep: true }
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    // Viewport State
    scale,
    target,
    resetViewport,
    // Tool State
    activeEventCoords,
    activeEventId,
    clearEventSelection,
    deleteSelection
  }
}
