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

import { ref, watch, onMounted, nextTick } from 'vue'

const TABS = ['A', 'B', 'C', 'D', 'Roofs']
const tabRefs = ref<HTMLElement[]>([])
const highlightStyle = ref({
  left: '0px',
  width: '0px'
})

const updateHighlight = (): void => {
  const activeIndex = TABS.indexOf(store.activeTab)
  const el = tabRefs.value[activeIndex]

  if (el) {
    highlightStyle.value = {
      left: `${el.offsetLeft}px`,
      width: `${el.offsetWidth}px`
    }
  }
}

watch(
  () => store.activeTab,
  () => {
    nextTick(updateHighlight)
  },
  { immediate: true }
)

onMounted(() => {
  nextTick(updateHighlight)
  window.addEventListener('resize', updateHighlight)
})
</script>

<template>
  <div
    class="flex relative flex-col h-full border-l border-white/5 select-none rounded-xl overflow-hidden"
  >
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

    <div class="absolute bottom-0 left-0 w-full flex p-2 max-w-[calc(100%-8px)]">
      <div
        class="relative flex gap-2 w-full bg-white/20 backdrop-blur-lg rounded-xl overflow-hidden py-1"
      >
        <div
          class="absolute top-0 bottom-0 bg-black rounded-xl transition-all duration-300 ease-out z-0"
          :style="highlightStyle"
        ></div>
        <button
          v-for="tab in TABS"
          :key="tab"
          ref="tabRefs"
          :class="[
            'relative flex-1 py-1 text-xs font-bold rounded-xl cursor-pointer z-10 transition-colors duration-200',
            store.activeTab === tab ? 'text-white' : 'text-black/50 hover:text-black/80'
          ]"
          @click="store.activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
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
