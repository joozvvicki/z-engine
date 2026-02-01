<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { ZLayer } from '@engine/types'
import {
  IconLayersIntersect,
  IconEye,
  IconPlus,
  IconTrash,
  IconSettings,
  IconX
} from '@tabler/icons-vue'
import DynamicIcon from './DynamicIcon.vue'

const store = useEditorStore()

const layers = computed(() => {
  if (!store.activeMap) return []
  return Object.entries(store.activeMap.layers)
    .filter(([key]) => key !== ZLayer.events)
    .sort((a, b) => b[1].index - a[1].index)
})

const selectLayer = (key: string): void => {
  store.setLayer(key as ZLayer)
}
</script>

<template>
  <div class="flex flex-col h-full bg-white text-black">
    <div class="p-4 border-b border-black/5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <IconLayersIntersect :size="18" class="text-black/40" />
        <h2 class="text-sm font-black uppercase tracking-widest">Layers</h2>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div
        v-for="[key, data] in layers"
        :key="key"
        class="group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border border-transparent"
        :class="[
          store.activeLayer === key
            ? 'bg-black text-white shadow-lg shadow-black/10'
            : 'hover:bg-black/5 text-black/60 hover:text-black'
        ]"
        @click="selectLayer(key)"
      >
        <div
          class="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"
        >
          <DynamicIcon :icon="data.icon" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-xs font-black capitalize tracking-tight">{{ key }}</div>
          <div class="text-[9px] font-bold opacity-40 uppercase tracking-tighter">
            Layer {{ data.index }}
          </div>
        </div>

        <button
          class="p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-0 group-hover:opacity-100"
        >
          <IconEye :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>
