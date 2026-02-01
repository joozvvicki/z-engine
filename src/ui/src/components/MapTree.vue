<script setup lang="ts">
import {
  IconDotsVertical,
  IconDownload,
  IconMap,
  IconPlus,
  IconTrash,
  IconUpload,
  IconSettings
} from '@tabler/icons-vue'
import { useEditorStore } from '@ui/stores/editor'
import MapPropertiesModal from './modal/MapPropertiesModal.vue'
import { ref } from 'vue'
import type { ZMap } from '@engine/types'

const store = useEditorStore()

const isMapModalOpen = ref(false)
const editMapId = ref<number | null>(null)

const isContextMenuOpen = ref(false)
const contextMapId = ref<number | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })

const getMapSizeInKB = (map: ZMap): number => {
  const json = JSON.stringify(map)
  const bytes = new TextEncoder().encode(json).length
  const kb = bytes / 1024
  return kb
}

const showContextMenu = (mapId: number, event: MouseEvent): void => {
  isContextMenuOpen.value = true
  contextMapId.value = mapId
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
}

const openNewMapModal = (): void => {
  editMapId.value = null
  isMapModalOpen.value = true
}

const openEditMapModal = (): void => {
  if (contextMapId.value) {
    editMapId.value = contextMapId.value
    isMapModalOpen.value = true
    isContextMenuOpen.value = false
  }
}
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 py-6 space-y-4">
    <div class="flex gap-2 justify-between items-center px-1 mb-4">
      <h2 class="text-xs font-black uppercase tracking-widest text-black/40">Project Maps</h2>

      <div class="flex gap-2">
        <button
          :disabled="store.isTestMode"
          :class="[
            'flex items-center justify-center gap-2 p-1 rounded-md transition-colors',
            store.isTestMode
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:text-black hover:bg-gray-100'
          ]"
          @click="openNewMapModal"
        >
          <IconPlus :size="24" />
        </button>
        <button
          :disabled="store.isTestMode"
          :class="[
            'flex items-center justify-center gap-2 p-1 rounded-md transition-colors',
            store.isTestMode
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:text-black hover:bg-gray-100'
          ]"
          @click="store.importMapFromJSON"
        >
          <IconUpload :size="24" />
        </button>
      </div>
    </div>

    <div
      v-for="map in store.maps"
      :key="map.id"
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-md transition-colors',
        store.isTestMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        map.id === store.activeMapID
          ? 'bg-black text-white hover:bg-black hover:text-white shadow-[0_0_10px_rgba(0,0,0,0.3)]'
          : !store.isTestMode && 'hover:text-black hover:bg-gray-100'
      ]"
      @click="!store.isTestMode && store.setActiveMap(map.id)"
    >
      <div class="flex items-center gap-2 w-1/2">
        <IconMap :size="24" />
        <span class="text-sm truncate">{{ map.name }}</span>
      </div>
      <div class="flex gap-2 justify-end items-center w-full">
        <span class="text-[0.6rem] leading-none text-gray-400 text-right mr-2">
          {{ map.width }} x {{ map.height }}
        </span>
        <span class="text-[0.6rem] leading-none text-gray-400 text-right"
          >{{ getMapSizeInKB(map).toPrecision(2) }} KB</span
        >
        <button
          :disabled="store.isTestMode"
          :class="[
            'flex items-center justify-center gap-2 rounded-md transition-all duration-150',
            store.isTestMode
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:text-gray-500'
          ]"
          @click.stop="!store.isTestMode && showContextMenu(map.id, $event)"
        >
          <IconDotsVertical :size="18" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="isContextMenuOpen"
        class="fixed top-0 left-0 w-full h-full"
        @click="isContextMenuOpen = false"
      ></div>
      <div
        v-if="isContextMenuOpen"
        :style="{
          top: contextMenuPosition.y + 20 + 'px',
          left: contextMenuPosition.x - 10 + 'px'
        }"
        class="absolute bg-white border border-black/10 rounded-md shadow-lg z-50 flex flex-col overflow-hidden w-32"
      >
        <button
          class="px-4 py-2 text-xs cursor-pointer flex items-center gap-2 transition-all duration-150 text-black bg-white hover:bg-gray-100"
          @click="openEditMapModal"
        >
          <IconSettings :size="18" />
          <span>Właściwości</span>
        </button>
        <button
          class="px-4 py-2 text-xs cursor-pointer flex items-center gap-2 transition-all duration-150 text-black bg-white hover:bg-gray-100"
          @click="
            () => {
              store.exportMapAsJSON()
              isContextMenuOpen = false
            }
          "
        >
          <IconDownload :size="18" />
          <span>Eksportuj</span>
        </button>
        <button
          class="px-4 py-2 text-xs cursor-pointer flex items-center gap-2 transition-all duration-150 text-red-700 bg-red-100 hover:bg-red-200"
          @click="
            () => {
              store.deleteMap(contextMapId!)
              isContextMenuOpen = false
            }
          "
        >
          <IconTrash :size="18" />
          <span>Usuń</span>
        </button>
      </div>
    </Teleport>
  </div>

  <MapPropertiesModal
    :is-open="isMapModalOpen"
    :edit-mode="!!editMapId"
    :map-id="editMapId"
    @close="isMapModalOpen = false"
  />
</template>
