<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import {
  IconPencil,
  IconEraser,
  IconBucketDroplet,
  IconRectangle,
  IconCircle
} from '@tabler/icons-vue'

const store = useEditorStore()
</script>

<template>
  <div class="flex items-center gap-4 p-1 border-b border-white/5 shadow-lg rounded-xl">
    <div class="flex gap-1 bg-black/20 rounded-xl border border-white/5">
      <button
        :class="
          store.currentTool === 'brush'
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-200'
        "
        class="p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Pędzel (B)"
        @click="store.setTool('brush')"
      >
        <IconPencil :size="18" />
      </button>
      <button
        :class="
          store.currentTool === 'bucket'
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-200'
        "
        class="p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Pędzel (B)"
        @click="store.setTool('bucket')"
      >
        <IconBucketDroplet :size="18" />
      </button>
      <button
        :class="
          store.currentTool === 'rectangle'
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-200'
        "
        class="p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Pędzel (B)"
        @click="store.setTool('rectangle')"
      >
        <IconRectangle :size="18" />
      </button>
      <button
        :class="
          store.currentTool === 'circle'
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-200'
        "
        class="p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Pędzel (B)"
        @click="store.setTool('circle')"
      >
        <IconCircle :size="18" />
      </button>
      <button
        :class="
          store.currentTool === 'eraser'
            ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]'
            : 'bg-transparent text-slate-500 hover:text-slate-200'
        "
        class="p-2 rounded-lg transition-all duration-200 cursor-pointer"
        title="Gumka (E)"
        @click="store.setTool('eraser')"
      >
        <IconEraser :size="18" />
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button
        v-for="(layer, id) in store.maps.find((map) => map.id === store.activeMapID)?.layers"
        :key="id"
        :value="id"
        class="cursor-pointer text-slate-500 hover:text-black transition-colors duration-200"
        :class="{
          'text-black': store.activeLayer === id
        }"
        @click="store.setLayer(id)"
      >
        <component :is="layer.icon" :size="`1.5rem`" />
      </button>
    </div>
  </div>
</template>
