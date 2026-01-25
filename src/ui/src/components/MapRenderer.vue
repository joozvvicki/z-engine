<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import tilesetUrl from '@ui/assets/img/tileset.png'

const store = useEditorStore()

const selectTile = (event: MouseEvent): void => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = Math.floor((event.clientX - rect.left) / store.tileSize)
  const y = Math.floor((event.clientY - rect.top) / store.tileSize)

  store.setSelectedTile({ x, y })
}
</script>

<template>
  <div class="flex-1 overflow-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
    <div
      class="relative cursor-crosshair"
      :style="{
        backgroundImage:
          'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      }"
      @mousedown="selectTile"
    >
      <img :src="tilesetUrl" class="block w-full h-auto" style="image-rendering: pixelated" />

      <div
        v-if="store.selectedTileCoords"
        class="absolute border-2 border-blue-400 box-border shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-75 pointer-events-none"
        :style="{
          width: store.tileSize + 'px',
          height: store.tileSize + 'px',
          left: store.selectedTileCoords.x * store.tileSize + 'px',
          top: store.selectedTileCoords.y * store.tileSize + 'px'
        }"
      ></div>
    </div>
  </div>
</template>
