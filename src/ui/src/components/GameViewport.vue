<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore, ZLayer, ZTool } from '@ui/stores/editor'
import { type FederatedPointerEvent } from 'pixi.js'
import { IconAlertTriangle } from '@tabler/icons-vue'
import EventEditor from './modal/EventEditor.vue'

const canvasContainer = ref<HTMLElement | null>(null)
let engine: ZEngine | null = null

const store = useEditorStore()
const isPointerDown = ref(false)
const isPanning = ref(false)
const shapeStartPos = ref<{ x: number; y: number } | null>(null)
const lastPanPos = ref<{ x: number; y: number } | null>(null)
const scale = ref(1)
const pan = ref({ x: 0, y: 0 })
const activeEventCoords = ref<{ x: number; y: number } | null>(null)
const activeEventId = ref<string | null>(null)

const handleInteraction = (event: FederatedPointerEvent, isCommit = false): void => {
  if (!engine || !store.selection || !store.activeMap) return

  const target = engine.getTileCoords(event)

  if (
    target.x < 0 ||
    target.x >= store.activeMap.width ||
    target.y < 0 ||
    target.y >= store.activeMap.height
  )
    return

  const tool = store.currentTool
  const layer = store.activeLayer
  const isStacking = event.shiftKey

  if (tool === ZTool.event && isCommit) {
    const existing = store.activeMap.events?.find((e) => e.x === target.x && e.y === target.y)
    activeEventCoords.value = { x: target.x, y: target.y }
    activeEventId.value = existing?.id || null
    return
  }

  if ((tool === ZTool.rectangle || tool === ZTool.circle) && isCommit && shapeStartPos.value) {
    drawShape(shapeStartPos.value, target, tool, layer, isStacking)
    return
  }

  if ((tool === ZTool.brush || tool === ZTool.eraser) && !shapeStartPos.value) {
    drawBrush(target, tool, layer, isStacking)
  }
}

const drawBrush = (
  target: { x: number; y: number },
  tool: ZTool,
  layer: ZLayer,
  isStacking: boolean
): void => {
  const isEraser = tool === ZTool.eraser
  const isAutotile = store.selection?.isAutotile

  const w = isEraser || isAutotile ? 1 : store.selection!.w
  const h = isEraser || isAutotile ? 1 : store.selection!.h

  for (let ox = 0; ox < w; ox++) {
    for (let oy = 0; oy < h; oy++) {
      const nx = target.x + ox
      const ny = target.y + oy

      applyTile(nx, ny, ox, oy, layer, isEraser, isStacking)
    }
  }
}

const drawShape = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  tool: ZTool,
  layer: ZLayer,
  isStacking: boolean
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

      if (shouldDraw) applyTile(x, y, 0, 0, layer, false, isStacking)
    }
  }
}

const applyTile = (
  x: number,
  y: number,
  ox: number,
  oy: number,
  layer: ZLayer,
  isEraser: boolean,
  isStacking: boolean
): void => {
  if (!store.activeMap || !engine || !store.selection) return

  if (x < 0 || x >= store.activeMap.width || y < 0 || y >= store.activeMap.height) return

  if (isEraser) {
    store.setTileAt(x, y, null)
    engine.clearTile(x, y, layer)
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
    if (stack) engine.drawTile(x, y, stack, layer, store.activeMap)
  }

  refreshNeighbors(x, y, layer)
}

const refreshNeighbors = (tx: number, ty: number, layer: ZLayer): void => {
  if (!store.activeMap || !engine) return

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = tx + dx
      const ny = ty + dy

      if (nx >= 0 && nx < store.activeMap.width && ny >= 0 && ny < store.activeMap.height) {
        const stack = store.activeMap.layers[layer].data[ny]?.[nx]
        if (stack && stack.length > 0) {
          engine.drawTile(nx, ny, stack, layer, store.activeMap)
        }
      }
    }
  }
}
const onPointerDown = (event: FederatedPointerEvent): void => {
  // Zostawiamy tylko przycisk 1 (środkowy/scroll) dla panningu
  // Jeśli chcesz przesuwać klawiszem, lepiej użyć np. event.ctrlKey lub spacji
  if (event.button === 1) {
    isPanning.value = true
    lastPanPos.value = { x: event.global.x, y: event.global.y }
    return
  }

  if (event.button !== 0 || !engine) return

  const target = engine.getTileCoords(event)

  // Pipeta pod Alt
  if (event.altKey) {
    store.pickTile(target.x, target.y)
    return
  }

  isPointerDown.value = true
  store.recordHistory()

  // Teraz Shift przejdzie tutaj i trafi do handleInteraction
  if ([ZTool.rectangle, ZTool.circle].includes(store.currentTool)) {
    shapeStartPos.value = target
  } else {
    handleInteraction(event)
  }
}
const onPointerMove = (event: FederatedPointerEvent): void => {
  if (isPanning.value && lastPanPos.value) {
    pan.value.x += event.global.x - lastPanPos.value.x
    pan.value.y += event.global.y - lastPanPos.value.y
    updateTransform()
    lastPanPos.value = { x: event.global.x, y: event.global.y }
    return
  }
  if (!engine) return

  const target = engine.getTileCoords(event)
  const tool = store.currentTool

  if (
    [ZTool.rectangle, ZTool.circle].includes(tool) &&
    isPointerDown.value &&
    shapeStartPos.value
  ) {
    engine.updateShapeGhost(shapeStartPos.value, target, tool)
  } else {
    engine.updateGhost(target.x, target.y, store.selection, tool)

    if (isPointerDown.value && (tool === ZTool.brush || tool === ZTool.eraser)) {
      handleInteraction(event)
    }
  }
}

const onPointerUp = (event: FederatedPointerEvent): void => {
  if (isPanning.value) {
    isPanning.value = false
    return
  }

  if (isPointerDown.value) {
    if ([ZTool.rectangle, ZTool.circle, ZTool.event].includes(store.currentTool)) {
      handleInteraction(event, true)
    }
  }
  isPointerDown.value = false
  shapeStartPos.value = null
  engine?.hideGhost()
}
const onWheel = (event: WheelEvent): void => {
  if (!canvasContainer.value) return

  if (event.ctrlKey) {
    const zoomSensitivity = 0.005
    const delta = -event.deltaY * zoomSensitivity
    const prevScale = scale.value
    const newScale = Math.min(Math.max(0.2, prevScale + delta), 4)

    const rect = canvasContainer.value.getBoundingClientRect()
    const mouseX = (event.clientX - rect.left) / prevScale
    const mouseY = (event.clientY - rect.top) / prevScale

    scale.value = newScale
    pan.value.x -= mouseX * (newScale - prevScale)
    pan.value.y -= mouseY * (newScale - prevScale)
  } else {
    pan.value.x -= event.deltaX
    pan.value.y -= event.deltaY
  }

  updateTransform()
}

const updateTransform = (): void => {
  if (canvasContainer.value) {
    // Ważne: transform-origin musi być ustawiony na 0 0
    canvasContainer.value.style.transformOrigin = '0 0'
    canvasContainer.value.style.transform = `translate(${pan.value.x}px, ${pan.value.y}px) scale(${scale.value})`
  }
}

const initEngine = async (): Promise<void> => {
  if (!canvasContainer.value || !store.activeMap) return
  if (engine) engine.destroy()

  scale.value = 1
  pan.value = { x: 0, y: 0 }
  updateTransform()

  const w = store.activeMap.width * store.tileSize
  const h = store.activeMap.height * store.tileSize
  canvasContainer.value.style.width = `${w}px`
  canvasContainer.value.style.height = `${h}px`

  engine = new ZEngine()
  await engine.init(canvasContainer.value, store.tileSize)

  await Promise.all(store.tilesets.map((ts) => engine!.loadTileset(ts.id, ts.url)))

  engine.app.stage.on('pointerdown', onPointerDown)
  engine.app.stage.on('pointermove', onPointerMove)
  engine.app.stage.on('pointerup', onPointerUp)
  engine.app.stage.on('pointerleave', () => engine?.hideGhost())

  engine.renderMap(store.activeMap, isEventTool.value)
}

watch(() => store.activeMapID, initEngine)
watch(
  () => store.historyIndex,
  () => {
    if (store.activeMap && engine) engine.renderMap(store.activeMap, isEventTool.value)
  }
)

const isEventTool = computed(() => store.currentTool === ZTool.event)

watch(
  () => store.currentTool,
  () => {
    if (engine && store.activeMap) engine.renderMap(store.activeMap, isEventTool.value)
  }
)

onMounted(async () => {
  window.addEventListener('pointerup', () => {
    isPointerDown.value = false
    isPanning.value = false
  })
  await initEngine()
})

onUnmounted(() => {
  engine?.destroy()
})

const handleCloseEventEditor = (): void => {
  activeEventCoords.value = null
  activeEventId.value = null
}
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
      @close="handleCloseEventEditor"
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
