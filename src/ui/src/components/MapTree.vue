<script setup lang="ts">
import {
  IconDownload,
  IconPlus,
  IconTrash,
  IconUpload,
  IconFolderPlus,
  IconMap,
  IconEdit,
  IconInfoCircle
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

const isContextMenuOpen = ref(false)
const isDragOverRoot = ref(false)
let dragCounter = 0
const contextItem = ref<ZMapInfo | null>(null)
const contextMenuPosition = ref({ x: 0, y: 0 })

const rootItems = computed(() => {
  return store.mapInfos.filter((m) => m.parentId === 0).sort((a, b) => a.order - b.order)
})

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
  // prompt() is not supported in some environments, using default name for now
  const baseName = 'Nowy Folder'
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

  const confirmMsg = contextItem.value.isFolder
    ? `Czy na pewno chcesz usunąć folder "${contextItem.value.name}"? Zawartość zostanie przeniesiona wyżej.`
    : `Czy na pewno chcesz usunąć mapę "${contextItem.value.name}"?`

  if (confirm(confirmMsg)) {
    if (contextItem.value.isFolder) {
      store.deleteFolder(contextItem.value.id)
    } else {
      store.deleteMap(contextItem.value.id)
    }
  }
  isContextMenuOpen.value = false
}

const handleRename = (): void => {
  if (contextItem.value) {
    store.renamingId = contextItem.value.id
    isContextMenuOpen.value = false
  }
}

const handleExport = (): void => {
  if (contextItem.value && !contextItem.value.isFolder) {
    // We need to ensure the map is loaded or switch to it to export?
    // exportMapAsJSON uses activeMap. Let's switch first then export.
    store.setActiveMap(contextItem.value.id)
    setTimeout(() => {
      store.exportMapAsJSON()
    }, 100)
    isContextMenuOpen.value = false
  }
}

// --- Drag & Drop ---
const onDragOverRoot = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
}

const onDragEnterRoot = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  dragCounter++
  isDragOverRoot.value = true
}

const onDragLeaveRoot = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  dragCounter--
  if (dragCounter === 0) {
    isDragOverRoot.value = false
  }
}

const onDropOnRoot = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  isDragOverRoot.value = false
  dragCounter = 0
  const data = e.dataTransfer?.getData('application/json')
  if (data) {
    const { id } = JSON.parse(data)
    store.moveEntry(id, 0) // Move to root
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col min-h-0 bg-white select-none border-r border-black/5"
    @dragover="onDragOverRoot"
    @dragenter="onDragEnterRoot"
    @dragleave="onDragLeaveRoot"
    @drop="onDropOnRoot"
  >
    <!-- Header -->
    <div
      class="flex gap-2 justify-between items-center px-4 pt-5 pb-3 shrink-0 border-b border-black/3"
    >
      <h2 class="text-[10px] font-black uppercase tracking-[0.2em] text-black/10">Project Maps</h2>

      <div class="flex gap-1">
        <button
          title="Nowa Mapa"
          :disabled="store.isTestMode"
          class="p-1 rounded hover:bg-black/5 text-gray-300 hover:text-black transition-colors disabled:opacity-30"
          @click="openNewMapModal(0)"
        >
          <IconPlus :size="18" />
        </button>
        <button
          title="Nowy Folder"
          :disabled="store.isTestMode"
          class="p-1 rounded hover:bg-black/5 text-gray-400 hover:text-black transition-colors disabled:opacity-30"
          @click="handleCreateFolder(0)"
        >
          <IconFolderPlus :size="18" />
        </button>
        <button
          title="Importuj"
          :disabled="store.isTestMode"
          class="p-1 rounded hover:bg-black/5 text-gray-400 hover:text-black transition-colors disabled:opacity-30"
          @click="store.importMapFromJSON"
        >
          <IconUpload :size="18" />
        </button>
      </div>
    </div>

    <div
      :class="[
        'flex-1 overflow-y-auto px-2 custom-scrollbar transition-colors duration-300',
        isDragOverRoot && 'bg-black/5'
      ]"
    >
      <div class="min-h-full pb-24 pt-2">
        <MapTreeItem
          v-for="item in rootItems"
          :key="item.id"
          :item="item"
          :depth="0"
          @contextmenu="handleItemContextMenu"
        />

        <div
          v-if="rootItems.length === 0"
          class="flex flex-col items-center justify-center py-10 text-gray-300"
        >
          <IconMap :size="48" stroke-width="1" />
          <p class="text-[10px] mt-2 uppercase tracking-widest font-bold">Brak map</p>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <ZContextMenu
      :show="isContextMenuOpen"
      :x="contextMenuPosition.x"
      :y="contextMenuPosition.y"
      @close="isContextMenuOpen = false"
    >
      <template v-if="contextItem">
        <div class="px-3 py-1.5 border-b border-black/5 bg-gray-50/50">
          <p class="text-[9px] font-bold text-gray-400 uppercase truncate">
            {{ contextItem.name }}
          </p>
        </div>

        <!-- Folder specific actions -->
        <template v-if="contextItem.isFolder">
          <button class="menu-item" @click="openNewMapModal(contextItem.id)">
            <IconPlus :size="14" />
            <span>Nowa Mapa</span>
          </button>
          <button class="menu-item" @click="handleCreateFolder(contextItem.id)">
            <IconFolderPlus :size="14" />
            <span>Nowy Folder</span>
          </button>
          <div class="h-px bg-black/5 my-1"></div>
        </template>

        <button class="menu-item" @click="handleRename">
          <IconEdit :size="14" />
          <span>Zmień nazwę</span>
        </button>

        <button v-if="!contextItem.isFolder" class="menu-item" @click="openEditMapModal">
          <IconInfoCircle :size="14" />
          <span>Właściwości</span>
        </button>

        <button v-if="!contextItem.isFolder" class="menu-item" @click="handleExport">
          <IconDownload :size="14" />
          <span>Eksportuj</span>
        </button>

        <button class="menu-item text-red-600 hover:bg-red-50" @click="handleDelete">
          <IconTrash :size="14" />
          <span>Usuń</span>
        </button>
      </template>
    </ZContextMenu>

    <!-- Modals -->
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
  padding: 0.5rem 0.75rem;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
  color: #374151; /* text-gray-700 */
}
.menu-item:hover {
  background-color: rgba(243, 244, 246, 0.8); /* hover:bg-gray-100/80 */
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 2px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
}
</style>
