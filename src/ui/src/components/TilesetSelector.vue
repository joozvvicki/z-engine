<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useEditorStore } from '@ui/stores/editor'

// Importuj swoje tilesety
import imgA1 from '@ui/assets/img/tilesets/World_A1.png'
import imgA2 from '@ui/assets/img/tilesets/World_A2.png'
import imgB from '@ui/assets/img/tilesets/World_B.png'
import imgC from '@ui/assets/img/tilesets/World_C.png'

const store = useEditorStore()
const activeTab = ref<'A1' | 'A2' | 'B'>('A1')

const tilesets = {
  A1: imgA1,
  A2: imgA2,
  B: imgB,
  C: imgC
}

const SELECTION_GRID = 24

const currentTilesetUrl = computed(() => tilesets[activeTab.value])

const isSelecting = ref(false)
const startPos = ref({ x: 0, y: 0 })

const handleMouseDown = (e: MouseEvent): void => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / SELECTION_GRID)
  const ty = Math.floor((e.clientY - rect.top) / SELECTION_GRID)

  isSelecting.value = true
  startPos.value = { x: tx, y: ty }

  store.setSelection({
    x: tx,
    y: ty,
    w: 1,
    h: 1,
    tilesetId: activeTab.value,
    isAutotile: false
  })
}

const handleMouseMove = (e: MouseEvent): void => {
  if (!isSelecting.value) return

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / SELECTION_GRID)
  const ty = Math.floor((e.clientY - rect.top) / SELECTION_GRID)

  const x = Math.min(startPos.value.x, tx)
  const y = Math.min(startPos.value.y, ty)
  const w = Math.abs(startPos.value.x - tx) + 1
  const h = Math.abs(startPos.value.y - ty) + 1

  store.setSelection({
    x,
    y,
    w,
    h,
    tilesetId: activeTab.value,
    isAutotile: false
  })
}

const handleMouseUp = (): void => {
  isSelecting.value = false
}
</script>

<template>
  <div class="flex flex-col h-full bg-[#1a1d25] border-l border-white/5 select-none">
    <div class="flex bg-black/40 p-1 gap-1 border-b border-white/5">
      <button
        v-for="(_, id) in tilesets"
        :key="id"
        :class="activeTab === id ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-500'"
        class="flex-1 py-1.5 text-[10px] font-bold rounded uppercase transition-colors"
        @click="activeTab = id as any"
      >
        {{ id }}
      </button>
    </div>

    <div class="flex-1 overflow-auto p-4 scrollbar-thin bg-[#121212]">
      <div
        class="relative cursor-crosshair w-max border border-white/10 shadow-lg"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <img
          :src="currentTilesetUrl"
          class="block"
          style="image-rendering: pixelated; pointer-events: none"
          draggable="false"
        />

        <div
          class="absolute inset-0 pointer-events-none opacity-20"
          :style="{
            backgroundImage: `
              linear-gradient(to right, #ffffff 1px, transparent 1px),
              linear-gradient(to bottom, #ffffff 1px, transparent 1px)
            `,
            backgroundSize: `${SELECTION_GRID}px ${SELECTION_GRID}px`
          }"
        ></div>

        <div
          v-if="store.selection"
          class="absolute border-2 border-yellow-400 z-10 pointer-events-none mix-blend-difference"
          :style="{
            left: store.selection.x * SELECTION_GRID + 'px',
            top: store.selection.y * SELECTION_GRID + 'px',
            width: store.selection.w * SELECTION_GRID + 'px',
            height: store.selection.h * SELECTION_GRID + 'px'
          }"
        ></div>
      </div>
    </div>
  </div>
</template>
