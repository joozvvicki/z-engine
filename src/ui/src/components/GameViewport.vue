<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { MapRenderer } from '@engine/MapRenderer'
import { useEditorStore } from '@ui/stores/editor'
import { type FederatedPointerEvent } from 'pixi.js'
import EditorBar from './EditorBar.vue'

import tilesetA1 from '@ui/assets/img/tilesets/World_A1.png'
import tilesetA2 from '@ui/assets/img/tilesets/World_A2.png'
import tilesetB from '@ui/assets/img/tilesets/World_B.png'

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

// --- CYKL ŻYCIA ---

onMounted(async () => {
  if (!viewportContainer.value) return

  // 1. Inicjalizacja Renderera (Pixi v8)
  renderer = new MapRenderer(store.tileSize, 20, 15)
  await renderer.init(viewportContainer.value)

  // 2. Ładowanie manifestu arkuszy
  // Tutaj rejestrujemy wszystkie arkusze pod ich kluczami (A1, B, etc.)
  await Promise.all([
    renderer.loadTileset('A1', tilesetA1),
    renderer.loadTileset('A2', tilesetA2),
    renderer.loadTileset('B', tilesetB)
  ])

  // 3. Podpięcie zdarzeń PixiJS
  renderer.app.stage.on('pointerdown', onPointerDown)
  renderer.app.stage.on('pointermove', onPointerMove)

  // 4. Obsługa puszczenia przycisku i wyjścia kursora
  window.addEventListener('pointerup', onPointerUp)
  renderer.app.stage.on('pointerleave', () => renderer?.hideGhost())

  // Inicjalizacja pustej mapy w store
  store.initMap(20, 15)

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
    class="w-full h-full overflow-hidden relative outline-none bg-[#0b0e14]"
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
