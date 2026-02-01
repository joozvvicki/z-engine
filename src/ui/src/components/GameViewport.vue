<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { IconAlertTriangle } from '@tabler/icons-vue'
import EventEditor from './modal/EventEditor.vue'
import { useEngine } from '@ui/composables/useEngine'
import { useEditorInput } from '@ui/composables/useEditorInput'
import { GhostSystem } from '@engine/systems/GhostSystem'

const canvasContainer = ref<HTMLElement | null>(null)
const store = useEditorStore()

// 1. Initialize Engine & State Sync
const { engine, initEngine, isLoading } = useEngine(canvasContainer, true)

// 2. Handle Inputs & Viewport
const {
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  activeEventCoords,
  activeEventId,
  clearEventSelection,
  deleteSelection
} = useEditorInput(engine, canvasContainer)

onMounted(async () => {
  await initEngine()

  if (engine.value) {
    engine.value.app.stage.on('pointerdown', onPointerDown)
    engine.value.app.stage.on('pointermove', onPointerMove)
    engine.value.app.stage.on('pointerup', onPointerUp)
    engine.value.app.stage.on('pointerleave', () => engine.value?.services.get(GhostSystem)?.hide())
  }

  // Handle Deletion
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && engine.value) {
      if (store.selectionCoords && !store.isTestMode) {
        deleteSelection(engine.value)
      }
    }
  })
})
</script>

<template>
  <div
    class="w-full h-full overflow-hidden relative outline-none bg-[#e5e5e5]"
    tabindex="0"
    @wheel.prevent="onWheel"
  >
    <!-- Loading Overlay -->
    <div
      v-if="isLoading"
      class="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-md transition-all duration-300 pointer-events-auto"
    >
      <div class="flex flex-col items-center gap-4">
        <div
          class="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin"
        ></div>
        <p class="text-xs font-black uppercase tracking-[0.2em] text-black/60">Loading Map</p>
      </div>
    </div>

    <div
      v-if="!store.activeMap"
      class="text-black/20 flex flex-col items-center pointer-events-none select-none justify-center h-full"
    >
      <IconAlertTriangle class="w-16 h-16 mb-4" />
      <p>No Map Active</p>
    </div>

    <div
      v-else
      ref="canvasContainer"
      class="relative shadow-2xl border border-black/20"
      :class="{
        'opacity-0': isLoading
      }"
    ></div>

    <!-- Event Editor Modal -->
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
