<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { IconAlertTriangle } from '@tabler/icons-vue'
import EventEditor from './modal/EventEditor.vue'
import ZContextMenu from './ZContextMenu.vue'
import { useEngine } from '@ui/composables/useEngine'
import { useEditorInput } from '@ui/composables/useEditorInput'

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

const contextMenu = ref({ show: false, x: 0, y: 0 })
const contextTarget = ref<{ x: number; y: number } | null>(null)

const onContextMenu = (e: MouseEvent): void => {
  if (store.isTestMode || !engine.value) return

  const rect = canvasContainer.value?.getBoundingClientRect()
  if (!rect || !store.activeMapID) return

  const viewport = store.mapViewportStates[store.activeMapID] || { scale: 1 }

  // Calculate tile coords from mouse pos
  const gx = (e.clientX - rect.left) / store.tileSize / viewport.scale
  const gy = (e.clientY - rect.top) / store.tileSize / viewport.scale

  // This is a bit rough, better use engine service if possible, but for simplicity:
  const tx = Math.floor(gx)
  const ty = Math.floor(gy)

  contextTarget.value = { x: tx, y: ty }
  contextMenu.value = { show: true, x: e.clientX, y: e.clientY }

  // Select the event under cursor if any
  const existing = store.activeMap?.events.find((ev) => ev.x === tx && ev.y === ty)
  if (existing) {
    store.selectedEventId = existing.id
  }
}

const handleContextAction = (action: string): void => {
  if (!contextTarget.value || !store.activeMap) return
  const tx = contextTarget.value.x
  const ty = contextTarget.value.y
  const existing = store.activeMap.events.find((ev) => ev.x === tx && ev.y === ty)

  switch (action) {
    case 'edit':
      if (existing) {
        activeEventCoords.value = { x: tx, y: ty }
        activeEventId.value = existing.id
      }
      break
    case 'copy':
      if (existing) {
        store.eventClipboard = store.copyEvent(existing.id)
      }
      break
    case 'paste':
      if (store.eventClipboard) {
        store.pasteEvent(tx, ty, store.eventClipboard)
      }
      break
    case 'delete':
      if (existing) {
        store.deleteEvent(existing.id)
      }
      break
    case 'setPlayerStart':
      if (store.activeMap) {
        store.systemStartMapId = store.activeMap.id
        store.systemStartX = tx
        store.systemStartY = ty
      }
      break
  }
  contextMenu.value.show = false
}

onMounted(async () => {
  await initEngine()

  if (engine.value) {
    engine.value.app.stage.on('pointerdown', onPointerDown)
    engine.value.app.stage.on('pointermove', onPointerMove)
    engine.value.app.stage.on('pointerup', onPointerUp)
    engine.value.app.stage.on('pointerleave', () => engine.value?.ghost.hide())
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
    @contextmenu.prevent="onContextMenu"
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

    <!-- Context Menu -->
    <ZContextMenu
      v-if="contextMenu.show"
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @close="contextMenu.show = false"
    >
      <div
        v-if="
          store.activeMap?.events.find((e) => e.x === contextTarget?.x && e.y === contextTarget?.y)
        "
        class="flex flex-col"
      >
        <button
          class="px-3 py-1.5 text-xs hover:bg-black/5 text-left flex items-center gap-2"
          @click="handleContextAction('edit')"
        >
          Edit Event
        </button>
        <button
          class="px-3 py-1.5 text-xs hover:bg-black/5 text-left flex items-center gap-2"
          @click="handleContextAction('copy')"
        >
          Copy
        </button>
        <div class="h-px bg-black/5 my-1"></div>
        <button
          class="px-3 py-1.5 text-xs hover:bg-black/5 text-left text-red-500"
          @click="handleContextAction('delete')"
        >
          Delete
        </button>
      </div>
      <div v-else class="flex flex-col">
        <button
          class="px-3 py-1.5 text-xs hover:bg-black/5 text-left flex items-center gap-2"
          :disabled="!store.eventClipboard"
          :class="{ 'opacity-50 pointer-events-none': !store.eventClipboard }"
          @click="handleContextAction('paste')"
        >
          Paste Event
        </button>
        <div class="h-px bg-black/5 my-1"></div>
        <button
          class="px-3 py-1.5 text-xs hover:bg-black/5 text-left flex items-center gap-2"
          @click="handleContextAction('setPlayerStart')"
        >
          Set Player Start
        </button>
      </div>
    </ZContextMenu>
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
