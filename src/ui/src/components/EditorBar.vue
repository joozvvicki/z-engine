<script setup lang="ts">
import { useEditorStore, ZTool } from '@ui/stores/editor'
import {
  IconPencil,
  IconEraser,
  IconBucketDroplet,
  IconRectangle,
  IconCircle
} from '@tabler/icons-vue'
import DynamicIcon from './DynamicIcon.vue'
import { computed } from 'vue'

const store = useEditorStore()

const tools = [
  { tool: ZTool.brush, icon: IconPencil, tooltip: 'Pędzel (1)' },
  { tool: ZTool.bucket, icon: IconBucketDroplet, tooltip: 'Wypełniacz (2)' },
  { tool: ZTool.rectangle, icon: IconRectangle, tooltip: 'Prostokąt (3)' },
  { tool: ZTool.circle, icon: IconCircle, tooltip: 'Okrąg (4)' },
  { tool: ZTool.eraser, icon: IconEraser, tooltip: 'Gumka (5)', isCritical: true }
]

const activeMap = computed(() => store.maps.find((map) => map.id === store.activeMapID))
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

    <div v-if="activeMap" class="flex flex-col gap-1 bg-black/10 rounded-xl border border-white/5">
      <button
        v-for="(layer, id) in activeMap.layers"
        :key="id"
        :value="id"
        class="p-1 rounded-lg transition-all duration-200 cursor-pointer"
        :class="
          store.activeLayer === id
            ? 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.4)]'
            : 'bg-transparent text-gray-400 hover:text-black'
        "
        @click="store.setLayer(id)"
      >
        <DynamicIcon :icon="layer.icon" :tooltip="id.charAt(0).toUpperCase() + id.slice(1)" />
      </button>
    </div>
  </div>
</template>
