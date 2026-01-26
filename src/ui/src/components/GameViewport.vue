<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { MapRenderer } from '@engine/MapRenderer'
import { useEditorStore, type ZLayer } from '@ui/stores/editor'
import { type FederatedPointerEvent } from 'pixi.js'
import { IconAlertTriangle } from '@tabler/icons-vue'

const viewportContainer = ref<HTMLElement | null>(null)
const isPointerDown = ref(false)
const shapeStartPos = ref<{ x: number; y: number } | null>(null)
let renderer: MapRenderer | null = null
const store = useEditorStore()

const activeMap = computed(() => store.maps.find((m) => m.id === store.activeMapID))

/**
 * Odświeża kafelki autotile wokół podanych współrzędnych
 */
const refreshAutotileNeighbors = (tx: number, ty: number, layer: ZLayer): void => {
  if (!activeMap.value || !renderer) return
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = tx + dx
      const ny = ty + dy
      const neighbor = activeMap.value.layers[layer].data[ny]?.[nx]
      if (neighbor) renderer.drawTile(nx, ny, neighbor, layer)
    }
  }
}

/**
 * Główna logika interakcji z narzędziami
 */
const handleInteraction = (event: FederatedPointerEvent, isCommit = false): void => {
  if (!renderer || !store.selection || !activeMap.value) return

  const target = renderer.getTileCoordsFromEvent(event)
  if (!target) return

  const tool = store.currentTool
  const layer = store.activeLayer

  // 1. NARZĘDZIE: WIADRO (Flood Fill)
  if (tool === 'bucket') {
    // Implementacja floodFill musi być w MapRenderer, by mieć dostęp do gridu
    if ('floodFill' in renderer) {
      renderer.floodFill(target.x, target.y, store.selection, layer, store)
    }
    return
  }

  // 2. NARZĘDZIE: KSZTAŁTY (Prostokąt / Koło) - wykonanie tylko przy "Commit" (onPointerUp)
  if ((tool === 'rectangle' || tool === 'circle') && isCommit && shapeStartPos.value) {
    const start = shapeStartPos.value
    const xMin = Math.min(start.x, target.x)
    const xMax = Math.max(start.x, target.x)
    const yMin = Math.min(start.y, target.y)
    const yMax = Math.max(start.y, target.y)

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        let shouldDraw = true

        if (tool === 'circle') {
          const rx = (xMax - xMin) / 2
          const ry = (yMax - yMin) / 2
          const cx = xMin + rx
          const cy = yMin + ry
          const dx = x - cx
          const dy = y - cy
          // Algorytm elipsy
          if ((dx * dx) / (rx * rx || 1) + (dy * dy) / (ry * ry || 1) > 1.1) shouldDraw = false
        }

        if (shouldDraw) {
          const tileToPlace = { ...store.selection, w: 1, h: 1 }
          renderer.drawTile(x, y, tileToPlace, layer)
          store.setTileAt(x, y, tileToPlace)
        }
      }
    }
    // Po narysowaniu kształtu odświeżamy widok, by autotile się połączyły
    renderer.renderMapFromStore(activeMap.value)
    return
  }

  // 3. NARZĘDZIE: EVENT (Kliknięcie stawia zdarzenie)
  if (tool === 'event' && isCommit) {
    console.log(`[Z Engine] Opening Event Editor at ${target.x}, ${target.y}`)
    // store.openEventEditor(target.x, target.y)
    return
  }

  // 4. NARZĘDZIE: PĘDZEL / GUMKA
  if (tool === 'brush' || tool === 'eraser') {
    const isEraser = tool === 'eraser'

    if (store.selection.isAutotile && !isEraser) {
      renderer.drawTile(target.x, target.y, store.selection, layer)
      store.setTileAt(target.x, target.y, store.selection)
    } else {
      // Dla gumki lub statycznych kafelków (obsługa multi-select)
      const w = isEraser ? 1 : store.selection.w
      const h = isEraser ? 1 : store.selection.h

      for (let ox = 0; ox < w; ox++) {
        for (let oy = 0; oy < h; oy++) {
          const nx = target.x + ox
          const ny = target.y + oy
          if (isEraser) {
            renderer.clearTileAt(nx, ny, layer)
            store.setTileAt(nx, ny, null)
          } else {
            const tile = {
              ...store.selection,
              x: store.selection.x + ox,
              y: store.selection.y + oy,
              w: 1,
              h: 1
            }
            renderer.drawTile(nx, ny, tile, layer)
            store.setTileAt(nx, ny, tile)
          }
        }
      }
    }
    // Zawsze odświeżamy sąsiadów dla pędzla/gumki (ważne dla autotili)
    refreshAutotileNeighbors(target.x, target.y, layer)
  }
}

const onPointerDown = (event: FederatedPointerEvent): void => {
  if (event.button !== 0) return // Tylko LPM
  isPointerDown.value = true

  const target = renderer?.getTileCoordsFromEvent(event)
  if (target) shapeStartPos.value = target

  store.recordHistory()

  if (['brush', 'eraser', 'bucket'].includes(store.currentTool)) {
    handleInteraction(event)
  }
}

const onPointerMove = (event: FederatedPointerEvent): void => {
  if (!renderer) return
  const target = renderer.getTileCoordsFromEvent(event)

  if (target && store.selection) {
    const tool = store.currentTool

    // Podgląd dla kształtów
    if (['rectangle', 'circle'].includes(tool) && isPointerDown.value && shapeStartPos.value) {
      if ('updateShapeGhost' in renderer) {
        renderer.updateShapeGhost(shapeStartPos.value, target, tool)
      }
    }
    // Podgląd standardowy (duch kafelka / gumka)
    else {
      renderer.updateGhost(target.x, target.y, store.selection, tool === 'eraser')
      if (isPointerDown.value && (tool === 'brush' || tool === 'eraser')) {
        handleInteraction(event)
      }
    }
  } else {
    renderer.hideGhost()
  }
}

const onPointerUp = (event: FederatedPointerEvent): void => {
  if (isPointerDown.value) {
    // Zatwierdzenie kształtów lub zdarzeń
    if (['rectangle', 'circle', 'event'].includes(store.currentTool)) {
      handleInteraction(event, true)
    }
  }
  isPointerDown.value = false
  shapeStartPos.value = null
}

// --- Inicjalizacja i Watchery ---

const initRenderer = async (): Promise<void> => {
  if (!viewportContainer.value || !activeMap.value) return
  if (renderer) renderer.destroy()

  renderer = new MapRenderer(store.tileSize, activeMap.value.width, activeMap.value.height)
  viewportContainer.value.style.width = `${activeMap.value.width * store.tileSize}px`
  viewportContainer.value.style.height = `${activeMap.value.height * store.tileSize}px`
  await renderer.init(viewportContainer.value)
  await Promise.all(store.tilesets.map((ts) => renderer!.loadTileset(ts.id, ts.url)))

  renderer.app.stage.on('pointerdown', onPointerDown)
  renderer.app.stage.on('pointermove', onPointerMove)
  renderer.app.stage.on('pointerup', onPointerUp)
  renderer.app.stage.on('pointerleave', () => renderer?.hideGhost())

  renderer.renderMapFromStore(activeMap.value)
}

watch(() => store.activeMapID, initRenderer)

// Reakcja na Undo/Redo
watch(
  () => store.historyIndex,
  () => {
    if (renderer && activeMap.value) renderer.renderMapFromStore(activeMap.value)
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
</script>

<template>
  <div
    class="w-full h-full overflow-hidden relative outline-none flex items-center justify-center"
    tabindex="0"
  >
    <div v-if="!activeMap">
      <div
        class="absolute inset-0 flex flex-col items-center justify-center text-black pointer-events-none select-none"
      >
        <IconAlertTriangle class="w-12 h-12 mb-4" />
        <p class="text-lg font-bold mb-2">No map selected</p>
        <p class="text-center px-4">
          Please create or select a map from the map list to start editing.
        </p>
      </div>
    </div>

    <div v-else ref="viewportContainer" class="border border-black border-box"></div>

    <div
      class="absolute bottom-4 right-4 pointer-events-none !text-black text-[10px] text-white/20 font-mono flex flex-col items-end z-10"
    >
      <span class="font-bold italic">Z ENGINE CORE</span>
      <span>TOOL: {{ store.currentTool.toUpperCase() }}</span>
      <span>LAYER: {{ store.activeLayer.toUpperCase() }}</span>
      <span>POS: {{ store.selection?.x }}, {{ store.selection?.y }}</span>
    </div>
  </div>
</template>

<style scoped>
canvas {
  touch-action: none;
  display: block;
}
</style>
