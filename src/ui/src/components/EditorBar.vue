<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
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

const activeMap = computed(() => store.maps.find((map) => map.id === store.activeMapID))
</script>

<template>
  <div class="flex flex-col items-center gap-4 p-1 border-b border-white/5">
    <div class="flex flex-col gap-1 bg-black/10 rounded-xl border border-white/5">
      <button
        :class="
          store.currentTool === 'brush'
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-900'
        "
        class="group relative p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Pędzel (1)"
        @click="store.setTool('brush')"
      >
        <IconPencil :size="18" />
        <div
          class="absolute top-1 z-[1000] left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700 z-50"
        >
          Pędzel
          <div
            class="absolute z-[1001] top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700"
          ></div>
        </div>
      </button>
      <button
        :class="
          store.currentTool === 'bucket'
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-900'
        "
        class="group relative p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Wypelniacz (2)"
        @click="store.setTool('bucket')"
      >
        <IconBucketDroplet :size="18" />
        <div
          class="absolute top-1 z-[1000] left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700 z-50"
        >
          Wypełniacz
          <div
            class="absolute z-[1001] top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700"
          ></div>
        </div>
      </button>
      <button
        :class="
          store.currentTool === 'rectangle'
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-900'
        "
        class="group relative p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Prostokąt (3)"
        @click="store.setTool('rectangle')"
      >
        <IconRectangle :size="18" />
        <div
          class="absolute top-1 z-[1000] left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700 z-50"
        >
          Prostokąt
          <div
            class="absolute z-[1001] top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700"
          ></div>
        </div>
      </button>
      <button
        :class="
          store.currentTool === 'circle'
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-900'
        "
        class="group relative p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Okrąg (4)"
        @click="store.setTool('circle')"
      >
        <IconCircle :size="18" />
        <div
          class="absolute top-1 z-[1000] left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700 z-50"
        >
          Okrąg
          <div
            class="absolute z-[1001] top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700"
          ></div>
        </div>
      </button>
      <button
        :class="
          store.currentTool === 'eraser'
            ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-900'
        "
        class="group relative p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Gumka (5)"
        @click="store.setTool('eraser')"
      >
        <IconEraser :size="18" />
        <div
          class="absolute top-1 z-[1000] left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700 z-50"
        >
          Gumka
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
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-900'
        "
        @click="store.setLayer(id)"
      >
        <DynamicIcon :icon="layer.icon" :tooltip="id.charAt(0).toUpperCase() + id.slice(1)" />
      </button>
    </div>
  </div>
</template>
