<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { useTilesetAtlas } from '@ui/composables/useTilesetAtlas'
import { useTilesetSelection } from '@ui/composables/useTilesetSelection'

const store = useEditorStore()

const { processedImageUrl, isProcessing, iconMapping, GRID_SIZE } = useTilesetAtlas()

const { handleMouseDown, handleMouseMove, handleMouseUp, selectionStyle } = useTilesetSelection(
  iconMapping,
  GRID_SIZE
)
</script>

<template>
  <div class="flex flex-col h-full border-l border-white/5 select-none rounded-xl">
    <div class="flex-1 overflow-auto relative scrollbar-thin bg-white">
      <div v-if="isProcessing" class="absolute inset-0 flex items-center justify-center">
        <span class="text-white/20 text-xs animate-pulse">GENERATING ATLAS...</span>
      </div>

      <div
        v-else
        class="relative w-max border border-white/5 cursor-pointer"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <img
          :src="processedImageUrl"
          class="block pixelated pointer-events-none"
          draggable="false"
        />

        <div class="absolute inset-0 pointer-events-none opacity-10 grid-48"></div>

        <div
          v-if="selectionStyle"
          :style="selectionStyle"
          class="absolute border-2 border-black z-10 shadow-lg transition-all duration-75"
        >
          <div
            v-if="store.selection?.isAutotile"
            class="absolute top-0 left-0 bg-black text-white text-[8px] px-1 font-bold"
          >
            AUTO
          </div>
        </div>
      </div>
    </div>

    <div class="flex p-1 gap-1 border-t border-white/5 bg-white">
      <button
        v-for="tab in ['A', 'B', 'C', 'D', 'Roofs']"
        :key="tab"
        :class="[
          'flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer',
          store.activeTab === tab ? 'bg-black text-white' : 'text-gray-500 hover:bg-white/5'
        ]"
        @click="store.activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
.grid-48 {
  background-image:
    linear-gradient(to right, #fff 1px, transparent 1px),
    linear-gradient(to bottom, #fff 1px, transparent 1px);
  background-size: 48px 48px;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
</style>
