<script setup lang="ts">
import {
  IconPlus,
  IconTrash,
  IconFolderPlus,
  IconMap,
  IconEdit,
  IconInfoCircle,
  IconSearch,
  IconDownload
} from '@tabler/icons-vue'
import { useEditorStore } from '@ui/stores/editor'
import MapPropertiesModal from './modal/MapPropertiesModal.vue'
import MapTreeItem from './MapTreeItem.vue'
import ZContextMenu from './ZContextMenu.vue'
import { ref, computed } from 'vue'
import type { ZMapInfo } from '@engine/types'

const store = useEditorStore()

const isMapModalOpen = ref(false)
const editMapId = ref<number | null>(null)
const currentParentId = ref(0)
const searchQuery = ref('') // Dodano pole szukania (wizualnie)

// Context Menu State
const isContextMenuOpen = ref(false)
const contextItem = ref<ZMapInfo | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })

// Drag State
const isDragOverRoot = ref(false)
let dragCounter = 0

// Root Items
const rootItems = computed(() => {
  return store.mapInfos.filter((m) => m.parentId === 0).sort((a, b) => a.order - b.order)
})

// Handlers
const handleItemContextMenu = (payload: { event: MouseEvent; item: ZMapInfo }): void => {
  contextItem.value = payload.item
  contextMenuPosition.value = { x: payload.event.clientX, y: payload.event.clientY }
  isContextMenuOpen.value = true
}

const openNewMapModal = (parentId: number = 0): void => {
  editMapId.value = null
  currentParentId.value = parentId
  isMapModalOpen.value = true
}

const openEditMapModal = (): void => {
  if (contextItem.value && !contextItem.value.isFolder) {
    editMapId.value = contextItem.value.id
    isMapModalOpen.value = true
    isContextMenuOpen.value = false
  }
}

const handleCreateFolder = (parentId: number = 0): void => {
  const baseName = 'New Folder'
  let name = baseName
  let counter = 1
  while (store.mapInfos.some((m) => m.isFolder && m.name === name)) {
    name = `${baseName} (${counter++})`
  }
  store.createFolder(name, parentId)
  isContextMenuOpen.value = false
}

const handleDelete = (): void => {
  if (!contextItem.value) return
  if (confirm(`Delete "${contextItem.value.name}"?`)) {
    contextItem.value.isFolder
      ? store.deleteFolder(contextItem.value.id)
      : store.deleteMap(contextItem.value.id)
  }
  isContextMenuOpen.value = false
}

const handleRename = (): void => {
  if (contextItem.value) store.renamingId = contextItem.value.id
  isContextMenuOpen.value = false
}

const handleExport = (): void => {
  if (contextItem.value && !contextItem.value.isFolder) {
    store.setActiveMap(contextItem.value.id)
    setTimeout(() => store.exportMapAsJSON(), 100)
    isContextMenuOpen.value = false
  }
}

// Drag & Drop Root Handlers
const onDragOverRoot = (e: DragEvent): void => {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
}
const onDragEnterRoot = (e: DragEvent): void => {
  e.preventDefault()
  dragCounter++
  isDragOverRoot.value = true
}
const onDragLeaveRoot = (e: DragEvent): void => {
  e.preventDefault()
  dragCounter--
  if (dragCounter === 0) isDragOverRoot.value = false
}
const onDropOnRoot = (e: DragEvent): void => {
  e.preventDefault()
  isDragOverRoot.value = false
  dragCounter = 0
  const data = e.dataTransfer?.getData('application/json')
  if (data) store.moveEntry(JSON.parse(data).id, 0)
}
</script>

<template>
  <div
    class="h-full flex flex-col min-h-0 bg-white select-none border-r border-slate-200"
    @dragover="onDragOverRoot"
    @dragenter="onDragEnterRoot"
    @dragleave="onDragLeaveRoot"
    @drop="onDropOnRoot"
  >
    <div class="px-4 pt-4 pb-2 shrink-0 bg-white z-10">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Explorer</h2>
        <div class="flex gap-1">
          <button
            title="New Folder"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            @click="handleCreateFolder(0)"
          >
            <IconFolderPlus :size="16" />
          </button>
          <button
            title="New Map"
            class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            @click="openNewMapModal(0)"
          >
            <IconPlus :size="16" />
          </button>
        </div>
      </div>

      <div class="relative mb-2">
        <IconSearch :size="14" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter maps..."
          class="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
        />
      </div>
    </div>

    <div
      class="flex-1 overflow-y-auto px-2 custom-scrollbar transition-colors duration-300 pb-10"
      :class="{ 'bg-blue-50/30': isDragOverRoot }"
    >
      <MapTreeItem
        v-for="item in rootItems"
        :key="item.id"
        :item="item"
        :depth="0"
        @contextmenu="handleItemContextMenu"
      />

      <div
        v-if="rootItems.length === 0"
        class="flex flex-col items-center justify-center py-12 text-slate-300"
      >
        <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3">
          <IconMap :size="24" stroke-width="1.5" />
        </div>
        <p class="text-[10px] uppercase tracking-widest font-bold">Project Empty</p>
        <button class="mt-2 text-xs text-blue-500 hover:underline" @click="openNewMapModal(0)">
          Create Map
        </button>
      </div>
    </div>

    <ZContextMenu
      :show="isContextMenuOpen"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      @close="isContextMenuOpen = false"
    >
      <div
        v-if="contextItem"
        class="w-48 bg-white border border-slate-200 shadow-xl rounded-lg py-1 overflow-hidden"
      >
        <div class="px-3 py-2 border-b border-slate-100 bg-slate-50/50 mb-1">
          <p class="text-[10px] font-bold text-slate-500 uppercase truncate">
            {{ contextItem.name }}
          </p>
        </div>

        <template v-if="contextItem.isFolder">
          <button class="menu-item" @click="openNewMapModal(contextItem.id)">
            <IconPlus :size="14" /> New Map
          </button>
          <button class="menu-item" @click="handleCreateFolder(contextItem.id)">
            <IconFolderPlus :size="14" /> New Folder
          </button>
          <div class="h-px bg-slate-100 my-1 mx-2"></div>
        </template>

        <button class="menu-item" @click="handleRename"><IconEdit :size="14" /> Rename</button>

        <button v-if="!contextItem.isFolder" class="menu-item" @click="openEditMapModal">
          <IconInfoCircle :size="14" /> Properties
        </button>

        <button v-if="!contextItem.isFolder" class="menu-item" @click="handleExport">
          <IconDownload :size="14" /> Export JSON
        </button>

        <div class="h-px bg-slate-100 my-1 mx-2"></div>

        <button class="menu-item text-red-600 hover:bg-red-50" @click="handleDelete">
          <IconTrash :size="14" /> Delete
        </button>
      </div>
    </ZContextMenu>

    <MapPropertiesModal
      :is-open="isMapModalOpen"
      :edit-mode="!!editMapId"
      :map-id="editMapId"
      :parent-id="currentParentId"
      @close="isMapModalOpen = false"
    />
  </div>
</template>

<style scoped>

.menu-item {
  @apply w-full text-left px-3 py-1.5 text-xs font-medium text-slate-600 flex items-center gap-2 hover:bg-slate-50 hover:text-slate-900 transition-colors;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  @apply bg-slate-300;
}
</style>
