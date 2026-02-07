<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { IconLayersIntersect, IconSquare, IconMaximize } from '@tabler/icons-vue'

const store = useEditorStore()

const sizes = [
  { label: '1x1', value: 1, icon: IconSquare },
  { label: '2x2', value: 2, icon: IconSquare },
  { label: '3x3', value: 3, icon: IconMaximize }
]
</script>

<template>
  <div
    class="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-2xl min-w-max z-100"
  >
    <!-- Size Selection -->
    <div class="flex bg-slate-100 p-0.5 rounded-lg items-center">
      <button
        v-for="s in sizes"
        :key="s.value"
        class="flex items-center justify-center px-1.5 py-0.5 rounded-md text-[9px] font-black transition-all"
        :class="
          store.eraserSize === s.value
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-900'
        "
        @click="store.eraserSize = s.value"
      >
        {{ s.label }}
      </button>

      <div class="w-px h-3 bg-slate-200 mx-1"></div>

      <input
        v-model.number="store.eraserSize"
        type="number"
        min="1"
        max="32"
        class="w-8 h-4 bg-white/50 border-none rounded text-[9px] font-black text-center focus:bg-white focus:ring-1 focus:ring-slate-300 outline-none transition-all placeholder:text-slate-300"
        placeholder="?"
      />
    </div>

    <div class="w-px h-3 bg-slate-200 mx-0.5"></div>

    <!-- All Layers Toggle -->
    <button
      class="flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all text-[9px] font-black"
      :class="
        store.eraseAllLayers
          ? 'bg-red-50 text-red-600 shadow-sm shadow-red-100'
          : 'text-slate-500 hover:bg-slate-50'
      "
      @click="store.eraseAllLayers = !store.eraseAllLayers"
    >
      <IconLayersIntersect :size="12" />
      <span class="whitespace-nowrap uppercase tracking-tighter">WARSTWY</span>
      <div
        class="w-1 h-1 rounded-full transition-all"
        :class="
          store.eraseAllLayers ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-slate-300'
        "
      ></div>
    </button>

    <!-- Arrow down -->
    <div
      class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45"
    ></div>
  </div>
</template>
