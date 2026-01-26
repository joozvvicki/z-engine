<script setup lang="ts">
import { useEditorStore, ZLayer, ZTool } from '@ui/stores/editor'
import {
  IconPencil,
  IconEraser,
  IconBucketDroplet,
  IconRectangle,
  IconCircle
} from '@tabler/icons-vue'
import DynamicIcon from './DynamicIcon.vue'
import { computed, onMounted } from 'vue'

const store = useEditorStore()

const tools = [
  { tool: ZTool.brush, icon: IconPencil, tooltip: 'Pędzel (Ctrl + 1)' },
  { tool: ZTool.bucket, icon: IconBucketDroplet, tooltip: 'Wypełniacz (Ctrl + 2)' },
  { tool: ZTool.rectangle, icon: IconRectangle, tooltip: 'Prostokąt (Ctrl + 3)' },
  { tool: ZTool.circle, icon: IconCircle, tooltip: 'Okrąg (Ctrl + 4)' },
  { tool: ZTool.eraser, icon: IconEraser, tooltip: 'Gumka (Ctrl + 5)', isCritical: true }
]

const activeMap = computed(() => store.maps.find((map) => map.id === store.activeMapID))

onMounted(() => {
  const handleKeydown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'ArrowUp':
          const currentLayerID = activeMap.value?.layers[store.activeLayer]
            ? store.activeLayer
            : null
          if (!currentLayerID) return
          const layerKeys = Object.keys(activeMap.value!.layers)
          const currentIndex = layerKeys.indexOf(currentLayerID)
          const nextIndex = (currentIndex + 1) % layerKeys.length
          store.setLayer(layerKeys[nextIndex] as ZLayer)
          e.preventDefault()
          break
        case 'ArrowDown':
          const currLayerID = activeMap.value?.layers[store.activeLayer] ? store.activeLayer : null
          if (!currLayerID) return
          const lKeys = Object.keys(activeMap.value!.layers)
          const currIndex = lKeys.indexOf(currLayerID)
          const prevIndex = (currIndex - 1 + lKeys.length) % lKeys.length
          store.setLayer(lKeys[prevIndex] as ZLayer)
          e.preventDefault()
          break
        case '1':
          store.setTool(ZTool.brush)
          e.preventDefault()
          break
        case '2':
          store.setTool(ZTool.bucket)
          e.preventDefault()
          break
        case '3':
          store.setTool(ZTool.rectangle)
          e.preventDefault()
          break
        case '4':
          store.setTool(ZTool.circle)
          e.preventDefault()
          break
        case '5':
          store.setTool(ZTool.eraser)
          e.preventDefault()
          break
      }
    }
  }

  window.addEventListener('keydown', handleKeydown)
})

const sortedLayers = computed(() => {
  if (!activeMap.value) return []
  return Object.entries(activeMap.value.layers).sort((a, b) => b[1].index - a[1].index)
})
</script>

<template>
  <div class="flex flex-col items-center gap-4 p-1 border-b border-white/5">
    <div class="flex flex-col gap-1 bg-black/10 text-white rounded-xl border border-white/5">
      <button
        v-for="tool in tools"
        :key="tool.tooltip"
        :class="
          store.currentTool === tool.tool
            ? tool.isCritical
              ? 'bg-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]'
              : 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.4)]'
            : 'bg-transparent text-gray-400 hover:text-black'
        "
        class="group relative p-2 rounded-lg transition-all duration-200 cursor-pointer"
        :title="tool.tooltip"
        @click="store.setTool(tool.tool)"
      >
        <component :is="tool.icon" :size="18" />
        <div
          class="absolute top-1 z-[1000] left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700 z-50"
        >
          {{ tool.tooltip.split(' ')[0] }}
          <div
            class="absolute z-[1001] top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700"
          ></div>
        </div>
      </button>
    </div>

    <div
      v-if="sortedLayers.length"
      class="flex flex-col gap-1 bg-black/10 rounded-xl border border-white/5"
    >
      <button
        v-for="[key, data] in sortedLayers"
        :key="key"
        :value="key"
        class="p-1 rounded-lg transition-all duration-200 cursor-pointer"
        :class="
          store.activeLayer === key
            ? 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.4)]'
            : 'bg-transparent text-gray-400 hover:text-black'
        "
        @click="store.setLayer(key as ZLayer)"
      >
        <DynamicIcon :icon="data.icon" :tooltip="key.charAt(0).toUpperCase() + key.slice(1)" />
      </button>
    </div>
  </div>
</template>
