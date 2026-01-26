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

const activeMap = computed(() => store.maps.find((m) => m.id === store.activeMapID))

const handleInteraction = (event: FederatedPointerEvent): void => {
  if (!renderer || !store.selection || !activeMap.value) return

  const target = renderer.getTileCoordsFromEvent(event)
  if (!target) return

  if (store.currentTool === 'brush') {
    if (store.selection.isAutotile) {
      renderer.drawTile(target.x, target.y, store.selection, store.activeLayer)
      store.setTileAt(target.x, target.y, store.selection)
    } else {
      for (let ox = 0; ox < store.selection.w; ox++) {
        for (let oy = 0; oy < store.selection.h; oy++) {
          const tile = {
            ...store.selection,
            x: store.selection.x + ox,
            y: store.selection.y + oy,
            w: 1,
            h: 1
          }
          renderer.drawTile(target.x + ox, target.y + oy, tile, store.activeLayer)
          store.setTileAt(target.x + ox, target.y + oy, tile)
        }
      }
    }
  } else if (store.currentTool === 'eraser') {
    renderer.clearSelection(target.x, target.y, store.selection, store.activeLayer)

    store.setTileAt(target.x, target.y, null)
  }

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = target.x + dx
      const ny = target.y + dy

      const neighborTile = activeMap.value?.layers[store.activeLayer][ny]?.[nx]

      if (neighborTile) {
        renderer.drawTile(nx, ny, neighborTile, store.activeLayer)
      }
    }
  }
}

const onPointerDown = (event: FederatedPointerEvent): void => {
  if (event.button !== 0) return
  isPointerDown.value = true

  store.recordHistory()
  handleInteraction(event)
}

const onPointerMove = (event: FederatedPointerEvent): void => {
  if (!renderer) return

  const target = renderer.getTileCoordsFromEvent(event)

  if (target && store.selection) {
    renderer.updateGhost(target.x, target.y, store.selection, store.currentTool === 'eraser')

    if (isPointerDown.value) {
      handleInteraction(event)
    }
  } else {
    renderer.hideGhost()
  }
}

const onPointerUp = (): void => {
  store.recordHistory()
  isPointerDown.value = false
}

const initRenderer = async (): Promise<void> => {
  if (!viewportContainer.value || !activeMap.value) return

  // Sprzątamy poprzedni renderer (ważne przy przełączaniu map)
  if (renderer) {
    renderer.destroy()
    renderer = null
  }

  renderer = new MapRenderer(store.tileSize, activeMap.value.width, activeMap.value.height)

  await renderer.init(viewportContainer.value)

  await Promise.all(store.tilesets.map((ts) => renderer!.loadTileset(ts.id, ts.url)))

  renderer.app.stage.on('pointerdown', onPointerDown)
  renderer.app.stage.on('pointermove', onPointerMove)
  renderer.app.stage.on('pointerleave', () => renderer?.hideGhost())

  if (renderer && 'renderMapFromStore' in renderer) {
    renderer.renderMapFromStore(activeMap.value)
  }

  console.log(`[Z Engine] Map "${activeMap.value.name}" loaded.`)
}

/**
 * KEYBOARD SHORTCUTS
 */
const handleKeyDown = (event: KeyboardEvent): void => {
  const isCtrl = event.ctrlKey || event.metaKey // Support Mac (Cmd)

  if (isCtrl && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) {
      store.redo()
    } else {
      store.undo()
    }
  }

  if (isCtrl && event.key.toLowerCase() === 'y') {
    event.preventDefault()
    store.redo()
  }
}

watch(
  () => store.activeMapID,
  () => {
    initRenderer()
  },
  { immediate: false }
)

watch(
  () => store.historyIndex,
  () => {
    if (renderer && activeMap.value) {
      renderer.renderMapFromStore(activeMap.value)
    }
  }
)

onMounted(async () => {
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', handleKeyDown)

  await initRenderer()
})

onUnmounted(() => {
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', handleKeyDown)
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
