<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { MapRenderer } from '@engine/MapRenderer'
import { useEditorStore } from '@ui/stores/editor'
import { type FederatedPointerEvent } from 'pixi.js'
import EditorBar from './EditorBar.vue'

// --- REFS & STATE ---
const viewportContainer = ref<HTMLElement | null>(null)
const isPointerDown = ref(false)
let renderer: MapRenderer | null = null
const store = useEditorStore()

// --- LOGIKA INTERAKCJI ---

/**
 * Główna funkcja wykonawcza dla narzędzi (Pędzel/Gumka)
 */
const handleInteraction = (event: FederatedPointerEvent): void => {
  if (!renderer || !store.selection) return

  const target = renderer.getTileCoordsFromEvent(event)
  if (!target) return

  if (store.currentTool === 'brush') {
    // Malowanie blokiem kafelków z konkretnego arkusza (tilesetId jest wewnątrz store.selection)
    renderer.placeSelection(target.x, target.y, store.selection, store.activeLayer)
  } else if (store.currentTool === 'eraser') {
    // Usuwanie obszaru o wielkości aktualnego zaznaczenia (gumka blokowa)
    renderer.clearSelection(target.x, target.y, store.selection, store.activeLayer)
  }
}

// --- HANDLERY EVENTÓW PIXI ---

const onPointerDown = (event: FederatedPointerEvent): void => {
  if (event.button !== 0) return // Tylko lewy przycisk myszy
  isPointerDown.value = true
  handleInteraction(event)
}

const onPointerMove = (event: FederatedPointerEvent): void => {
  if (!renderer) return

  const target = renderer.getTileCoordsFromEvent(event)

  if (target && store.selection) {
    // 1. Aktualizacja podglądu (Ghost) - renderer sam wie, jakiego arkusza użyć
    renderer.updateGhost(target.x, target.y, store.selection, store.currentTool === 'eraser')

    // 2. Jeśli mysz jest wciśnięta - maluj/maż w locie
    if (isPointerDown.value) {
      handleInteraction(event)
    }
  } else {
    renderer.hideGhost()
  }
}

const onPointerUp = (): void => {
  isPointerDown.value = false
}

onMounted(async () => {
  if (!viewportContainer.value) return

  renderer = new MapRenderer(store.tileSize, store.mapSize.width, store.mapSize.height)
  await renderer.init(viewportContainer.value)

  await Promise.all([...store.tilesets.map((ts) => renderer!.loadTileset(ts.id, ts.url))])

  // 3. Podpięcie zdarzeń PixiJS
  renderer.app.stage.on('pointerdown', onPointerDown)
  renderer.app.stage.on('pointermove', onPointerMove)

  // 4. Obsługa puszczenia przycisku i wyjścia kursora
  window.addEventListener('pointerup', onPointerUp)
  renderer.app.stage.on('pointerleave', () => renderer?.hideGhost())

  // Inicjalizacja pustej mapy w store
  store.initMap(store.mapSize.width, store.mapSize.height)

  console.log('Z Engine: Viewport Ready with Multi-Tileset support')
})

onUnmounted(() => {
  window.removeEventListener('pointerup', onPointerUp)
  renderer?.destroy()
  renderer = null
})
</script>

<template>
  <div
    ref="viewportContainer"
    class="w-full h-full overflow-hidden relative outline-none"
    tabindex="0"
  >
    <EditorBar />

    <div
      class="absolute bottom-4 right-4 pointer-events-none text-[10px] text-white/20 font-mono flex flex-col items-end"
    >
      <span>Z ENGINE RENDERER V8</span>
      <span>GRID: {{ store.tileSize }}px | LAYER: {{ store.activeLayer.toUpperCase() }}</span>
      <span>TILESET: {{ store.selection?.tilesetId || 'NONE' }}</span>
    </div>
  </div>
</template>

<style scoped>
canvas {
  touch-action: none;
  -webkit-user-drag: none;
}
</style>
