<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore, ZLayer, ZTool } from '@ui/stores/editor'
import { type FederatedPointerEvent } from '@engine/utils/pixi'
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
  if (!engine || !engine.gridSystem || !store.selection || !store.activeMap) return

  const target = engine.gridSystem.getTileCoords(event)

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

  if (tool == ZTool.bucket && isCommit) {
    drawBucket(target, layer, isStacking)
    return
  }

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
    return
  }
}

const drawBucket = (target: { x: number; y: number }, layer: ZLayer, isStacking: boolean): void => {
  if (!store.activeMap || !engine || !store.selection) return

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
    if (!currentTile) {
      applyTile(current.x, current.y, 0, 0, layer, false, isStacking)
      continue
    }

    if (currentTile.tilesetId !== targetTile.tilesetId) continue

    applyTile(current.x, current.y, 0, 0, layer, false, isStacking)

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    ]

    for (const neighbor of neighbors) {
      if (
        neighbor.x >= 0 &&
        neighbor.x < store.activeMap.width &&
        neighbor.y >= 0 &&
        neighbor.y < store.activeMap.height
      ) {
        queue.push(neighbor)
      }
    }
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
    engine.mapSystem?.clearTileAt(x, y, layer)
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
    if (stack) engine.mapSystem?.requestTileUpdate(x, y, stack, layer)
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
          engine.mapSystem?.requestTileUpdate(nx, ny, stack, layer)
        }
      }
    }
  }
}
const onPointerDown = (event: FederatedPointerEvent): void => {
  if (event.button === 1) {
    isPanning.value = true
    lastPanPos.value = { x: event.global.x, y: event.global.y }
    return
  }

  if (event.button !== 0 || !engine) return

  const target = engine.gridSystem?.getTileCoords(event)

  // Pipeta pod Alt
  if (event.altKey && target) {
    store.pickTile(target.x, target.y)
    return
  }

  isPointerDown.value = true
  store.recordHistory()

  if (store.currentTool === ZTool.bucket) {
    handleInteraction(event, true)
    return
  }

  if ([ZTool.rectangle, ZTool.circle].includes(store.currentTool) && target) {
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
  engine?.ghostSystem?.hide()
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
      engine.gridSystem.setSize(store.activeMap.width, store.activeMap.height)
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
