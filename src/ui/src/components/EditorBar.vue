<template>
  <div class="flex items-center gap-4 p-2 border-b border-white/5 shadow-lg">
    <div class="flex gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
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
      <div class="relative group">
        <select
          v-model="store.activeLayer"
          class="appearance-none bg-[#1a1d25] text-[0.75rem] text-slate-300 px-3 py-1.5 pr-8 rounded-lg border border-white/10 focus:border-blue-500 outline-none cursor-pointer transition-all hover:border-white/20 uppercase tracking-widest font-semibold"
        >
          <option value="ground">Warstwa 1: Podłoże</option>
          <option value="decoration">Warstwa 2: Dekoracje</option>
          <option value="events">Warstwa 3: Zdarzenia</option>
        </select>
        <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
          <IconChevronDown :size="14" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { IconPencil, IconEraser, IconChevronDown } from '@tabler/icons-vue'

const store = useEditorStore()
</script>
