<script setup lang="ts">
import { IconMap, IconPlus, IconUpload } from '@tabler/icons-vue'
import { useEditorStore } from '@ui/stores/editor'
import NewMap from './modal/NewMap.vue'
import { ref } from 'vue'

const store = useEditorStore()

const isNewMapOpen = ref(false)
</script>

<template>
  <div class="overflow-y-auto p-2 grid grid-cols-4 gap-2">
    <div
      v-for="map in store.maps"
      :key="map.id"
      :class="[
        'flex flex-col items-center gap-2 px-3 py-1.5 rounded-md mb-1 cursor-pointer transition-colors ',
        map.id === store.activeMapID
          ? 'bg-black text-white hover:bg-black/100 hover:text-white shadow-[0_0_10px_rgba(0,0,0,0.3)]'
          : 'hover:text-black/100 hover:bg-gray-100'
      ]"
      @click="store.setActiveMap(map.id)"
    >
      <IconMap :size="24" />
      <span class="text-sm truncate">{{ map.name }}</span>
      <div class="flex justify-between items-center w-full">
        <span class="text-sm truncate text-center w-full">{{ map.width }} x {{ map.height }}</span>
      </div>
    </div>
    <button
      :class="[
        'flex flex-col items-center gap-2 px-3 py-1.5 rounded-md mb-1 cursor-pointer transition-colors hover:text-black/100 hover:bg-gray-100'
      ]"
      @click="isNewMapOpen = true"
    >
      <IconPlus :size="24" />
      <span class="text-sm word-wrap">Nowa mapa</span>
    </button>
    <button
      :class="[
        'flex flex-col items-center gap-2 px-3 py-1.5 rounded-md mb-1 cursor-pointer transition-colors hover:text-black/100 hover:bg-gray-100'
      ]"
      @click="store.importMapFromJSON"
    >
      <IconUpload :size="24" />
      <span class="text-sm word-wrap">Importuj mapę </span>
    </button>
  </div>

  <NewMap :is-open="isNewMapOpen" @close="isNewMapOpen = false" />
</template>
