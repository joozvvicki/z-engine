import { ref, watch, nextTick, type Ref } from 'vue'
import type { FederatedPointerEvent } from '@engine/utils/pixi'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { useViewport } from './useViewport'
import { useEditorTools } from './useEditorTools'
import { ZTool } from '@engine/types'
import { GridSystem } from '@engine/systems/GridSystem'
import { GhostSystem } from '@engine/systems/GhostSystem'

export const useEditorInput = (
  engine: Ref<ZEngine | null>,
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
  deleteSelection: (engine: ZEngine) => void
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
    updateTransform
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
      target.value = engine.value.services.get(GridSystem)?.getTileCoords(event)
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

    target.value = engine.value.services.get(GridSystem)?.getTileCoords(event)
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
        engine.value.services
          .get(GhostSystem)
          ?.updateShape(shapeStartPos.value, target.value, tool, store.selection)
    } else {
      if (target.value) {
        engine.value.services
          .get(GhostSystem)
          ?.update(target.value.x, target.value.y, store.selection, tool)
      } else {
        engine.value.services.get(GhostSystem)?.hide()
      }

      if (isPointerDown.value && (tool === ZTool.brush || tool === ZTool.eraser)) {
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
    engine.value?.services.get(GhostSystem)?.hide()
  }

  const onWheel = (event: WheelEvent): void => {
    if (store.isTestMode) return
    handleWheel(event, canvasContainer.value)
  }

  // 1. Sync selection box with ghost system
  watch(
    () => store.selectionCoords,
    () => {
      const ghostSystem = engine.value?.services.get(GhostSystem)
      if (engine.value && ghostSystem && store.selectionCoords) {
        ghostSystem.setSelectionBox(store.selectionCoords)
      } else if (engine.value && ghostSystem) {
        ghostSystem.setSelectionBox(null)
      }
    }
  )

  // --- Viewport Persistence Logic ---

  // 1. Load state when switching maps
  watch(
    () => store.activeMapID,
    (newId) => {
      if (newId === null) return
      const saved = store.mapViewportStates[newId]
      if (saved) {
        scale.value = saved.scale
        pan.value = { ...saved.pan }
      } else {
        scale.value = 1
        pan.value = { x: 0, y: 0 }
      }
      // Apply to DOM on next tick to ensure canvasContainer is ready
      nextTick(() => updateTransform(canvasContainer.value))
    },
    { immediate: true }
  )

  // 1.5. Force transform update when container mounts/re-mounts
  watch(
    () => canvasContainer.value,
    (el) => {
      if (el) {
        updateTransform(el)
      }
    }
  )

  // 2. Save state when it changes
  watch(
    [scale, () => pan.value.x, () => pan.value.y],
    () => {
      if (store.activeMapID === null) return
      // Don't save if values are default and we don't have a record yet?
      // Actually, simple overwrite is fine.
      store.mapViewportStates[store.activeMapID] = {
        scale: scale.value,
        pan: { ...pan.value }
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
