<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { type FederatedPointerEvent } from '@engine/utils/pixi'
import { IconAlertTriangle } from '@tabler/icons-vue'
import EventEditor from './modal/EventEditor.vue'
import { ZTool } from '@engine/utils/enums'
import { useViewport } from '@ui/composables/useViewport'
import { useEditorTools } from '@ui/composables/useEditorTools'

const canvasContainer = ref<HTMLElement | null>(null)
let engine: ZEngine | null = null

const store = useEditorStore()
const isPointerDown = ref(false)

const { scale, isPanning, handleWheel, startPan, updatePan, endPan, resetViewport } = useViewport()

const { shapeStartPos, activeEventCoords, activeEventId, handleInteraction, clearEventSelection } =
  useEditorTools()

const onPointerDown = (event: FederatedPointerEvent): void => {
  if (event.button === 1) {
    startPan(event.global.x, event.global.y)
    return
  }

  if (event.button !== 0 || !engine) return

  const target = engine.gridSystem?.getTileCoords(event)

  if (event.altKey && target) {
    store.pickTile(target.x, target.y)
    return
  }

  isPointerDown.value = true
  store.recordHistory()

  if (store.currentTool === ZTool.bucket) {
    handleInteraction(event, engine, true)
    return
  }

  if ([ZTool.rectangle, ZTool.circle].includes(store.currentTool) && target) {
    shapeStartPos.value = target
  } else {
    handleInteraction(event, engine)
  }
}

const onPointerMove = (event: FederatedPointerEvent): void => {
  if (isPanning.value) {
    updatePan(event.global.x, event.global.y, canvasContainer.value)
    return
  }
  if (!engine) return

  const target = engine.gridSystem?.getTileCoords(event)
  const tool = store.currentTool

  if (
    [ZTool.rectangle, ZTool.circle].includes(tool) &&
    isPointerDown.value &&
    shapeStartPos.value
  ) {
    if (target) engine.ghostSystem?.updateShape(shapeStartPos.value, target, tool)
  } else {
    if (target) engine.ghostSystem?.update(target.x, target.y, store.selection, tool)

    if (isPointerDown.value && (tool === ZTool.brush || tool === ZTool.eraser)) {
      handleInteraction(event, engine)
    }
  }
}

const onPointerUp = (event: FederatedPointerEvent): void => {
  if (isPanning.value) {
    endPan()
    return
  }

  if (isPointerDown.value) {
    if ([ZTool.rectangle, ZTool.circle, ZTool.event].includes(store.currentTool)) {
      handleInteraction(event, engine, true)
    }
  }
  isPointerDown.value = false
  shapeStartPos.value = null
  engine?.ghostSystem?.hide()
}

const onWheel = (event: WheelEvent): void => {
  handleWheel(event, canvasContainer.value)
}

const initEngine = async (): Promise<void> => {
  if (!canvasContainer.value || !store.activeMap) return
  if (engine) engine.destroy()

  resetViewport(canvasContainer.value)

  const w = store.activeMap.width * store.tileSize
  const h = store.activeMap.height * store.tileSize
  canvasContainer.value.style.width = `${w}px`
  canvasContainer.value.style.height = `${h}px`

  engine = new ZEngine()
  await engine.init(canvasContainer.value, store.tileSize)

  await Promise.all(store.tilesets.map((ts) => engine!.textureManager.loadTileset(ts.id, ts.url)))

  engine.app.stage.on('pointerdown', onPointerDown)
  engine.app.stage.on('pointermove', onPointerMove)
  engine.app.stage.on('pointerup', onPointerUp)
  engine.app.stage.on('pointerleave', () => engine?.ghostSystem?.hide())

  engine.mapSystem?.setMap(store.activeMap)
  const isEventTool = store.currentTool === ZTool.event
  engine.gridSystem?.setSize(
    isEventTool ? store.activeMap.width : 0,
    isEventTool ? store.activeMap.height : 0
  )
}

watch(() => store.activeMapID, initEngine)
watch(
  () => store.historyIndex,
  () => {
    if (store.activeMap && engine?.mapSystem && engine?.gridSystem) {
      engine.mapSystem.setMap(store.activeMap)
    }
  }
)
watch(
  () => store.currentTool,
  () => {
    if (engine?.mapSystem && engine?.gridSystem && store.activeMap) {
      engine.mapSystem.setMap(store.activeMap)
      const isEventTool = store.currentTool === ZTool.event
      engine.gridSystem.setSize(
        isEventTool ? store.activeMap.width : 0,
        isEventTool ? store.activeMap.height : 0
      )
    }
  }
)

onMounted(async () => {
  window.addEventListener('pointerup', () => {
    isPointerDown.value = false
    endPan()
  })
  await initEngine()
})

onUnmounted(() => {
  engine?.destroy()
})
</script>

<template>
  <div
    class="w-full h-full overflow-hidden relative bg-white flex items-center justify-center outline-none"
    tabindex="0"
    @wheel.prevent="onWheel"
  >
    <div
      v-if="!store.activeMap"
      class="text-white/20 flex flex-col items-center pointer-events-none select-none"
    >
      <IconAlertTriangle class="w-16 h-16 mb-4" />
      <p>No Map Active</p>
    </div>

    <div v-else ref="canvasContainer" class="shadow-2xl bg-white border border-black/50"></div>

    <div
      class="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end text-[10px] text-black/40 font-mono uppercase z-10"
    >
      <span>Zoom: {{ Math.round(scale * 100) }}%</span>
      <span>Tool: {{ store.currentTool }}</span>
      <span class="text-black/60 font-black italic">Z-Engine Modular v0.1.0</span>
    </div>

    <EventEditor
      v-if="activeEventCoords"
      :event-id="activeEventId"
      :x="activeEventCoords.x"
      :y="activeEventCoords.y"
      @close="clearEventSelection"
    />
  </div>
</template>

<style scoped>
canvas {
  display: block;
  image-rendering: pixelated;
  will-change: transform;
  transition: none;
}
</style>
