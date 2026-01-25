<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import imgA1 from '@ui/assets/img/tilesets/World_A1.png'
import imgA2 from '@ui/assets/img/tilesets/World_A2.png'
import imgB from '@ui/assets/img/tilesets/World_B.png'

const store = useEditorStore()
const isSelecting = ref(false)
const startPos = ref({ x: 0, y: 0 })
const activeTab = ref<'A1' | 'A2' | 'B'>('A1')

const tilesets = {
  A1: imgA1,
  A2: imgA2,
  B: imgB
}

const currentTilesetUrl = computed(() => tilesets[activeTab.value])

const handleMouseDown = (e: MouseEvent): void => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / store.tileSize)
  const ty = Math.floor((e.clientY - rect.top) / store.tileSize)

  isSelecting.value = true
  startPos.value = { x: tx, y: ty }

  store.setSelection({ x: tx, y: ty, w: 1, h: 1, tilesetId: activeTab.value })
}

const handleMouseMove = (e: MouseEvent): void => {
  if (!isSelecting.value) return

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / store.tileSize)
  const ty = Math.floor((e.clientY - rect.top) / store.tileSize)

  const x = Math.min(startPos.value.x, tx)
  const y = Math.min(startPos.value.y, ty)
  const w = Math.abs(startPos.value.x - tx) + 1
  const h = Math.abs(startPos.value.y - ty) + 1

  store.setSelection({
    x,
    y,
    w,
    h,
    tilesetId: activeTab.value
  })
}

const handleMouseUp = (): void => {
  isSelecting.value = false
}
</script>

<template>
  <div class="flex-1 overflow-auto p-2 scrollbar-thin scrollbar-thumb-slate-700 bg-[#1a1d25]">
    <div class="flex bg-black/40 p-1 gap-1 border-b border-white/5">
      <button
        v-for="(_, id) in tilesets"
        :key="id"
        :class="activeTab === id ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-500'"
        class="flex-1 py-1 text-[10px] font-bold rounded uppercase transition-colors"
        @click="activeTab = id"
      >
        {{ id }}
      </button>
    </div>
    <div
      class="relative cursor-crosshair w-max border border-white/5"
      :style="{
        backgroundImage:
          'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <img
        :src="currentTilesetUrl"
        class="block"
        style="image-rendering: pixelated; user-select: none"
        draggable="false"
        @dragstart.prevent
      />

      <div
        class="absolute border-2 border-blue-400 z-10 pointer-events-none"
        :style="{
          left: store.selection.x * store.tileSize + 'px',
          top: store.selection.y * store.tileSize + 'px',
          width: store.selection.w * store.tileSize + 'px',
          height: store.selection.h * store.tileSize + 'px'
        }"
      ></div>
    </div>
  </div>
</template>
