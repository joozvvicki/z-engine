<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { MapRenderer } from '@engine/MapRenderer'
import { useEditorStore, ZLayer, ZTool } from '@ui/stores/editor'
import { type FederatedPointerEvent } from 'pixi.js'
import { IconAlertTriangle } from '@tabler/icons-vue'
import EventEditor from './modal/EventEditor.vue'

// --- REFS ---
const viewportContainer = ref<HTMLElement | null>(null)
const isPointerDown = ref(false)
const shapeStartPos = ref<{ x: number; y: number } | null>(null)
let renderer: MapRenderer | null = null

const store = useEditorStore()

// --- STATE DLA EVENTÓW ---
const activeEventCoords = ref<{ x: number; y: number } | null>(null)
const activeEventId = ref<string | null>(null)

// --- LOGIKA INTERAKCJI ---

/**
 * Główna funkcja procesująca kliknięcia i ruchy myszy
 */
const handleInteraction = (event: FederatedPointerEvent, isCommit = false): void => {
  if (store.isTestMode || !renderer || !store.selection || !store.activeMap) return

  const target = renderer.getTileCoordsFromEvent(event)
  if (!target) return

  const tool = store.currentTool
  const layer = store.activeLayer

  const isStacking = event.shiftKey

  // 1. WIADRO (Flood Fill)
  if (tool === ZTool.bucket) {
    renderer.floodFill(target.x, target.y, store.selection, layer, store)
    return
  }

  // 2. NARZĘDZIE EVENTÓW
  if (tool === ZTool.event && isCommit) {
    const existing = store.activeMap.events?.find((e) => e.x === target.x && e.y === target.y)
    activeEventCoords.value = { x: target.x, y: target.y }
    activeEventId.value = existing?.id || null
    return
  }

  // 3. PĘDZEL / GUMKAif (tool === ZTool.brush || tool === ZTool.eraser) {
  const isEraser = tool === ZTool.eraser
  const isAutotile = store.selection.isAutotile

  // FIX: Jeśli to autotile lub gumka, wymuszamy rozmiar 1x1
  const w = isEraser || isAutotile ? 1 : store.selection.w
  const h = isEraser || isAutotile ? 1 : store.selection.h

  for (let ox = 0; ox < w; ox++) {
    for (let oy = 0; oy < h; oy++) {
      const nx = target.x + ox
      const ny = target.y + oy

      if (isEraser) {
        store.setTileAt(nx, ny, null)
        renderer.clearTileAt(nx, ny, layer)
      } else {
        const tile = {
          ...store.selection,
          // Jeśli to autotile, zawsze bierzemy bazowe x/y selekcji,
          // nie przesuwamy ich o ox/oy
          x: isAutotile ? store.selection.x : store.selection.x + ox,
          y: isAutotile ? store.selection.y : store.selection.y + oy,
          w: 1,
          h: 1
        }
        store.setTileAt(nx, ny, tile, isStacking)

        const updatedStack = store.activeMap.layers[layer].data[ny]?.[nx]
        if (updatedStack) renderer.drawTile(nx, ny, updatedStack, layer)
      }

      // Odświeżamy sąsiadów dla każdego postawionego kafelka
      refreshAutotileNeighbors(nx, ny, layer)
    }
  }
}

// --- PIXI EVENT HANDLERS ---

const onPointerDown = (event: FederatedPointerEvent): void => {
  const target = renderer?.getTileCoordsFromEvent(event)
  if (!target) return

  if (event.button !== 0) return

  if (event.metaKey) {
    store.pickTile(target.x, target.y)
    return
  }
  isPointerDown.value = true
  shapeStartPos.value = target
  store.recordHistory()

  if ([ZTool.brush, ZTool.eraser, ZTool.bucket].includes(store.currentTool)) {
    handleInteraction(event)
  }
}

const onPointerMove = (event: FederatedPointerEvent): void => {
  if (!renderer) return
  const target = renderer.getTileCoordsFromEvent(event)

  if (target && store.selection) {
    const tool = store.currentTool

    // Podgląd kształtów
    if (
      [ZTool.rectangle, ZTool.circle].includes(tool) &&
      isPointerDown.value &&
      shapeStartPos.value
    ) {
      renderer.updateShapeGhost(shapeStartPos.value, target, tool)
    } else {
      // Standardowy podgląd pędzla (Ghost)
      renderer.updateGhost(target.x, target.y, store.selection, tool)

      // Jeśli przycisk myszy jest wciśnięty - maluj (brush/eraser)
      if (isPointerDown.value && (tool === ZTool.brush || tool === ZTool.eraser)) {
        handleInteraction(event)
      }
    }
  } else {
    renderer.hideGhost()
  }
}

const onPointerUp = (event: FederatedPointerEvent): void => {
  if (isPointerDown.value) {
    // Zatwierdzanie kształtów/eventów odbywa się przy puszczeniu myszy
    if ([ZTool.rectangle, ZTool.circle, ZTool.event].includes(store.currentTool)) {
      handleInteraction(event, true)
    }
  }
  isPointerDown.value = false
  shapeStartPos.value = null
}

// --- HELPERY ---

const refreshAutotileNeighbors = (tx: number, ty: number, layer: ZLayer): void => {
  if (!store.activeMap || !renderer) return
  // Odświeżamy pole i 8 pól wokół niego dla poprawnego łączenia krawędzi
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = tx + dx,
        ny = ty + dy
      const stack = store.activeMap.layers[layer].data[ny]?.[nx]
      if (stack?.length) renderer.drawTile(nx, ny, stack, layer)
    }
  }
}

// --- LIFECYCLE & RENDERER INIT ---

const initRenderer = async (): Promise<void> => {
  if (!viewportContainer.value || !store.activeMap) return
  if (renderer) renderer.destroy()

  renderer = new MapRenderer(store.tileSize, store.activeMap.width, store.activeMap.height)

  // Ustawienie wymiarów kontenera pod mapę
  viewportContainer.value.style.width = `${store.activeMap.width * store.tileSize}px`
  viewportContainer.value.style.height = `${store.activeMap.height * store.tileSize}px`

  await renderer.init(viewportContainer.value)

  // Ładowanie wszystkich tekstur z tilesetów zdefiniowanych w store
  await Promise.all(store.tilesets.map((ts) => renderer!.loadTileset(ts.id, ts.url)))

  // Podpięcie eventów PIXI
  renderer.app.stage.on('pointerdown', onPointerDown)
  renderer.app.stage.on('pointermove', onPointerMove)
  renderer.app.stage.on('pointerup', onPointerUp)
  renderer.app.stage.on('pointerleave', () => renderer?.hideGhost())

  // Pierwsze pełne rysowanie mapy
  renderer.renderMapFromStore(store.activeMap)
}

// Watchery dla reaktywnego UI
watch(() => store.activeMapID, initRenderer)
watch(
  () => store.historyIndex,
  () => {
    if (store.activeMap) renderer?.renderMapFromStore(store.activeMap)
  }
)

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  await initRenderer()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  renderer?.destroy()
})

const handleKeyDown = (e: KeyboardEvent): void => {
  const isCtrl = e.ctrlKey || e.metaKey
  if (isCtrl && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    e.shiftKey ? store.redo() : store.undo()
  }
  if (isCtrl && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    store.redo()
  }
}

const handleCloseEventEditor = (): void => {
  activeEventCoords.value = null
  activeEventId.value = null
}
</script>

<template>
  <div
    class="w-full h-full overflow-hidden relative bg-neutral-900 flex items-center justify-center"
    tabindex="0"
  >
    <div v-if="!store.activeMap" class="text-white/20 flex flex-col items-center select-none">
      <IconAlertTriangle class="w-16 h-16 mb-4" />
      <p class="text-xl font-bold">No Map Active</p>
    </div>

    <div
      v-else
      ref="viewportContainer"
      class="shadow-2xl bg-white border border-black shadow-black/50"
    ></div>

    <div
      class="absolute bottom-6 right-6 pointer-events-none flex flex-col items-end font-mono text-[10px] text-white/40 tracking-widest uppercase"
    >
      <span class="text-white/60 font-black italic mb-1">Z-Engine Viewport v8</span>
      <span>Layer: {{ store.activeLayer }}</span>
      <span>Tool: {{ store.currentTool }}</span>
      <span class="text-blue-400 mt-1">Hold SHIFT to stack tiles</span>
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
/* Zapobiega scrollowaniu strony podczas interakcji z canvasem */
canvas {
  touch-action: none;
  display: block;
  image-rendering: pixelated;
}
</style>
