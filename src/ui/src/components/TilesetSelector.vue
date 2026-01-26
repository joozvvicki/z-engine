<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'

const store = useEditorStore()
const activeTab = ref<'A1' | 'A2' | 'A3' | 'A4' | 'B' | 'C' | 'D' | 'Roofs'>('A1')

const SELECTION_GRID = 48

const isA1 = computed(() => activeTab.value === 'A1')

const currentTilesetUrl = computed(() => {
  const ts = store.tilesets.find((t) => t.id === activeTab.value)
  return ts ? ts.url : ''
})

const isSelecting = ref(false)
const startPos = ref({ x: 0, y: 0 })

const handleMouseDown = (e: MouseEvent): void => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / SELECTION_GRID)
  const ty = Math.floor((e.clientY - rect.top) / SELECTION_GRID)

  isSelecting.value = true

  if (activeTab.value === 'A1') {
    // Logika A1: Klikasz w kwadrat 48x48
    // Ale silnik dostaje info: "To jest autotile, weź dane z obszaru 2x3 (sub-tiles)"
    store.setSelection({
      x: tx, // Pozycja klikniętego kwadratu
      y: ty,
      w: 2, // Szerokość logiczna dla Renderera (2 sub-tiles = 48px)
      h: 3, // Wysokość logiczna dla Renderera (3 sub-tiles = 72px)
      tilesetId: activeTab.value,
      isAutotile: true
    })
  } else {
    // Normalna logika dla B, C, D...
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
}

const handleMouseMove = (e: MouseEvent): void => {
  if (!isSelecting.value || isA1.value) return

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
  <div class="flex flex-col h-full border-l border-white/5 select-none">
    <div class="flex p-1 gap-1 border-b border-white/5">
      <button
        v-for="ts in store.tilesets"
        :key="ts.id"
        :class="activeTab === ts.id ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-500'"
        class="flex-1 py-1.5 text-[10px] font-bold rounded uppercase transition-colors cursor-pointer"
        @click="activeTab = ts.id as any"
      >
        {{ ts.id }}
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
            /* TUTAJA ZMIANA: Wizualna szerokość/wysokość */
            width: (isA1 ? 1 : store.selection.w) * SELECTION_GRID + 'px',
            height: (isA1 ? 1 : store.selection.h) * SELECTION_GRID + 'px'
          }"
        ></div>
      </div>
    </div>
  </div>
</template>
