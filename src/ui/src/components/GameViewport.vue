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
const { engine, initEngine } = useEngine(canvasContainer)

// 2. Handle Inputs & Viewport
const {
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  scale,
  target,
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
      if (store.selectionCoords) {
        deleteSelection(engine.value)
      }
    }
  })
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

    <div
      v-else
      ref="canvasContainer"
      class="transition-opacity duration-300 delay-500 shadow-2xl bg-white border border-black/50 border-box"
    ></div>

    <!-- Stats Bar -->
    <div
      class="absolute bottom-0 px-4 py-1 w-full pointer-events-none flex items-center bg-white/50 backdrop-blur-sm justify-between text-[10px] text-black/40 font-mono uppercase z-10"
    >
      <span class="w-1/3 text-left">Location: {{ target?.x ?? '-' }}, {{ target?.y ?? '-' }}</span>
      <span class="w-1/3 text-center">Zoom: {{ Math.round(scale * 100) }}%</span>
      <span class="w-1/3 text-right text-black/60 font-black italic">Z Creator v0.1.0</span>
    </div>

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
