<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { MapRenderer } from '@engine/MapRenderer'
import { useEditorStore } from '@ui/stores/editor'
import { type FederatedPointerEvent } from 'pixi.js'
import EditorBar from './EditorBar.vue'

// --- REFS & STATE ---
const viewportContainer = ref<HTMLElement | null>(null)
const isPointerDown = ref(false)
let renderer: MapRenderer | null = null
const store = useEditorStore()

// Pobieramy aktualną mapę z tablicy w store
const activeMap = computed(() => store.maps.find((m) => m.id === store.activeMapID))

/**
 * Główna funkcja interakcji.
 * Odpowiada za:
 * 1. Rysowanie wizualne (Renderer)
 * 2. Zapisywanie danych (Store)
 */
const handleInteraction = (event: FederatedPointerEvent): void => {
  if (!renderer || !store.selection || !activeMap.value) return

  // Pobieramy współrzędne kafelka pod myszką
  const target = renderer.getTileCoordsFromEvent(event)
  if (!target) return

  // --- LOGIKA PĘDZLA (BRUSH) ---
  if (store.currentTool === 'brush') {
    // 1. Wizualne narysowanie (dla płynności)
    renderer.placeSelection(target.x, target.y, store.selection, store.activeLayer)

    // 2. Zapis danych do Store (dla persystencji)
    // Musimy zapisać każdy kafelek z zaznaczenia osobno
    for (let ox = 0; ox < store.selection.w; ox++) {
      for (let oy = 0; oy < store.selection.h; oy++) {
        store.setTileAt(target.x + ox, target.y + oy, {
          ...store.selection,
          // Przesuwamy sourceX/Y, żeby zapisać poprawny fragment tilesetu
          x: store.selection.x + ox,
          y: store.selection.y + oy,
          // Resetujemy wymiary pojedynczego kafelka w danych (1x1)
          w: 1,
          h: 1
        })
      }
    }
  }
  // --- LOGIKA GUMKI (ERASER) ---
  else if (store.currentTool === 'eraser') {
    // 1. Wizualne usunięcie
    renderer.clearSelection(target.x, target.y, store.selection, store.activeLayer)

    // 2. Usunięcie danych ze Store
    for (let ox = 0; ox < store.selection.w; ox++) {
      for (let oy = 0; oy < store.selection.h; oy++) {
        store.setTileAt(target.x + ox, target.y + oy, null)
      }
    }
  }
}

// --- HANDLERY EVENTÓW PIXI ---

const onPointerDown = (event: FederatedPointerEvent): void => {
  if (event.button !== 0) return // Tylko LPM
  isPointerDown.value = true
  handleInteraction(event)
}

const onPointerMove = (event: FederatedPointerEvent): void => {
  if (!renderer) return

  const target = renderer.getTileCoordsFromEvent(event)

  if (target && store.selection) {
    // Aktualizacja ducha (podglądu)
    renderer.updateGhost(target.x, target.y, store.selection, store.currentTool === 'eraser')

    // Jeśli mysz wciśnięta -> maluj ciągle
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

// --- INITIALIZATION & MAP SWITCHING ---

/**
 * Inicjalizuje Renderer i ładuje aktualną mapę
 */
const initRenderer = async (): Promise<void> => {
  if (!viewportContainer.value || !activeMap.value) return

  // Sprzątamy poprzedni renderer (ważne przy przełączaniu map)
  if (renderer) {
    renderer.destroy()
    renderer = null
  }

  // Tworzymy nowy renderer z wymiarami aktywnej mapy
  renderer = new MapRenderer(store.tileSize, activeMap.value.width, activeMap.value.height)

  await renderer.init(viewportContainer.value)

  // Ładujemy wszystkie tekstury zdefiniowane w Store
  await Promise.all(store.tilesets.map((ts) => renderer!.loadTileset(ts.id, ts.url)))

  // Podpinamy eventy
  renderer.app.stage.on('pointerdown', onPointerDown)
  renderer.app.stage.on('pointermove', onPointerMove)
  renderer.app.stage.on('pointerleave', () => renderer?.hideGhost())

  // --- KLUCZOWE: RYSOWANIE STANU ZAPISANEGO W STORE ---
  // Jeśli zaimplementowałeś metodę renderMapFromStore w MapRenderer (jak w poprzednim kroku):
  if (renderer && 'renderMapFromStore' in renderer) {
    // @ts-ignore - Metoda dodana w poprzednim kroku
    renderer.renderMapFromStore(activeMap.value)
  }

  console.log(`[Z Engine] Map "${activeMap.value.name}" loaded.`)
}

// Obserwujemy zmianę ID mapy, aby przeładować edytor
watch(
  () => store.activeMapID,
  () => {
    initRenderer()
  },
  { immediate: false } // Wywołamy ręcznie w onMounted, żeby mieć pewność że DOM jest gotowy
)

onMounted(async () => {
  window.addEventListener('pointerup', onPointerUp)
  // Inicjalizacja przy starcie komponentu
  await initRenderer()
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
      class="absolute bottom-4 right-4 pointer-events-none text-[10px] text-white/20 font-mono flex flex-col items-end z-10"
    >
      <span>Z ENGINE RENDERER V8 (MANUAL MODE)</span>
      <span
        >MAP: {{ activeMap?.width }}x{{ activeMap?.height }} | GRID: {{ store.tileSize }}px</span
      >
      <span>LAYER: {{ store.activeLayer.toUpperCase() }}</span>
      <span>TILESET: {{ store.selection?.tilesetId || 'NONE' }}</span>
    </div>
  </div>
</template>

<style scoped>
canvas {
  touch-action: none;
  -webkit-user-drag: none;
  display: block; /* Usuwa dziwne marginesy canvasa */
}
</style>
