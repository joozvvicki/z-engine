import { ref, watch, type Ref } from 'vue'
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

  const { scale, isPanning, handleWheel, startPan, updatePan, endPan, resetViewport } =
    useViewport()

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

    target.value = engine.value.services.get(GridSystem)?.getTileCoords(event)

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
    if (isPanning.value) {
      updatePan(event.global.x, event.global.y, canvasContainer.value)
      return
    }
    if (!engine.value) return

    target.value = engine.value.services.get(GridSystem)?.getTileCoords(event)
    const tool = store.currentTool

    if (
      [ZTool.rectangle, ZTool.circle, ZTool.select].includes(tool) &&
      isPointerDown.value &&
      shapeStartPos.value
    ) {
      if (target.value)
        engine.value.services.get(GhostSystem)?.updateShape(shapeStartPos.value, target.value, tool)
    } else {
      if (target.value)
        engine.value.services
          .get(GhostSystem)
          ?.update(target.value.x, target.value.y, store.selection, tool)

      if (isPointerDown.value && (tool === ZTool.brush || tool === ZTool.eraser)) {
        handleInteraction(event, engine.value)
      }
    }
  }

  const onPointerUp = (event: FederatedPointerEvent): void => {
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
    handleWheel(event, canvasContainer.value)
  }

  // Sync selection box with ghost system
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
