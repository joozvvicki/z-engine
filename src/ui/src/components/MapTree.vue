<script setup lang="ts">
import { ref } from 'vue'
import { IconMap } from '@tabler/icons-vue'

const maps = ref([
  { id: 1, name: 'Las Początkowy', active: true },
  { id: 2, name: 'Karczma "Z"', active: false },
  { id: 3, name: 'Podziemia - Poziom 1', active: false }
])
</script>

<template>
  <div class="flex-1 overflow-y-auto px-2 pb-2">
    <div
      v-for="map in maps"
      :key="map.id"
      :class="[
        'flex items-center gap-2 px-3 py-1.5 rounded-md mb-1 cursor-pointer transition-colors',
        map.active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-white/5'
      ]"
    >
      <IconMap :size="16" />
      <span class="text-sm truncate">{{ map.name }}</span>
    </div>

    <button
      class="w-full mt-2 py-2 border border-dashed border-white/10 rounded-md text-xs hover:border-white/30 transition-all"
    >
      + Nowa Mapa
    </button>
  </div>
</template>
