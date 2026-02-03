<script setup lang="ts">
import {
  IconChevronRight,
  IconChevronDown,
  IconFolder,
  IconFolderOpen,
  IconMap,
  IconDotsVertical
} from '@tabler/icons-vue'
import type { ZMapInfo } from '@engine/types'
import { computed, ref, nextTick, watch } from 'vue'
import { useEditorStore } from '@ui/stores/editor'

const props = defineProps<{
  item: ZMapInfo
  depth: number
}>()

const store = useEditorStore()
const isDragTarget = ref(false)
let dragCounter = 0
const isRenaming = ref(false)
const renamingName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const children = computed(() => {
  return store.mapInfos
    .filter((m) => m.parentId === props.item.id)
    .sort((a, b) => a.order - b.order)
})

const mapData = computed(() => {
  return store.maps.find((m) => m.id === props.item.id)
})

// function removed as it was unused and contained duplicate logic

const handleClick = (): void => {
  if (props.item.isFolder) {
    store.toggleFolderExpanded(props.item.id)
  } else {
    if (!store.isTestMode) {
      store.setActiveMap(props.item.id)
    }
  }
}

const emit = defineEmits(['contextmenu'])

const onContextMenu = (e: MouseEvent): void => {
  emit('contextmenu', { event: e, item: props.item })
}

// --- Drag & Drop ---
const onDragStart = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.dataTransfer?.setData('application/json', JSON.stringify({ id: props.item.id }))
  e.dataTransfer!.effectAllowed = 'move'
}

const onDragOver = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault() // Allow drop on both folders and maps
  e.dataTransfer!.dropEffect = 'move'
}

const onDragEnter = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  dragCounter++
  isDragTarget.value = true
}

const onDragLeave = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  dragCounter--
  if (dragCounter === 0) {
    isDragTarget.value = false
  }
}

const onDrop = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  e.stopPropagation()
  isDragTarget.value = false
  dragCounter = 0
  const data = e.dataTransfer?.getData('application/json')
  if (data) {
    const { id } = JSON.parse(data)
    if (id === props.item.id) return

    // If dropping on a folder, move inside.
    // If dropping on a map, move to the same level (parent) as that map.
    const targetParentId = props.item.isFolder ? props.item.id : props.item.parentId

    // Safety check: don't move a folder into itself or its own children
    if (
      props.item.isFolder &&
      typeof store.isDescendant === 'function' &&
      store.isDescendant(props.item.id, id)
    ) {
      console.warn('Cannot move a folder into its own descendant')
      return
    }

    store.moveEntry(id, targetParentId)
  }
}

// --- Renaming ---
const startRenaming = (): void => {
  if (store.isTestMode) return
  renamingName.value = props.item.name
  isRenaming.value = true
  store.renamingId = props.item.id
  nextTick(() => {
    nameInput.value?.focus()
    nameInput.value?.select()
  })
}

const saveRename = (): void => {
  if (!isRenaming.value) return
  const finalName = renamingName.value.trim()
  if (finalName && finalName !== props.item.name) {
    store.renameEntry(props.item.id, finalName)
  }
  cancelRename()
}

const cancelRename = (): void => {
  isRenaming.value = false
  if (store.renamingId === props.item.id) {
    store.renamingId = null
  }
}

// Listen for global renaming trigger
watch(
  () => store.renamingId,
  (newId) => {
    if (newId === props.item.id && !isRenaming.value) {
      startRenaming()
    } else if (newId !== props.item.id && isRenaming.value) {
      saveRename()
    }
  }
)
// --- Animation Hooks ---
const beforeEnter = (el: Element): void => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0'
  htmlEl.style.opacity = '0'
}

const enter = (el: Element): void => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.opacity = '1'
}

const leave = (el: Element): void => {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0'
  htmlEl.style.opacity = '0'
}
</script>

<template>
  <div class="flex flex-col">
    <div
      :class="[
        'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 group relative mb-1 select-none',
        store.isTestMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        !item.isFolder && item.id === store.activeMapID
          ? 'bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] scale-[1.02] z-10'
          : !store.isTestMode && 'hover:bg-gray-100/50 text-gray-700 hover:text-black',
        isDragTarget && (item.isFolder ? 'bg-black/5 ring-2 ring-black/10' : 'bg-transparent')
      ]"
      :style="{ paddingLeft: depth * 12 + 12 + 'px' }"
      :draggable="!store.isTestMode"
      @click="handleClick"
      @contextmenu.prevent="onContextMenu"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <!-- Chevron for Folders -->
        <component
          :is="item.expanded ? IconChevronDown : IconChevronRight"
          v-if="item.isFolder"
          :size="14"
          class="shrink-0 text-gray-400"
        />
        <div v-else class="w-[14px] shrink-0"></div>

        <!-- Icon -->
        <component
          :is="item.isFolder ? (item.expanded ? IconFolderOpen : IconFolder) : IconMap"
          :size="16"
          :class="[
            'shrink-0',
            item.isFolder
              ? item.expanded
                ? 'text-black'
                : 'text-gray-400'
              : item.id === store.activeMapID
                ? 'text-white'
                : 'text-gray-400'
          ]"
        />

        <input
          v-if="isRenaming"
          ref="nameInput"
          v-model="renamingName"
          class="flex-1 bg-white text-black text-xs px-1 py-0.5 rounded border border-black/20 outline-none min-w-0"
          @click.stop
          @keydown.enter.stop="saveRename"
          @keydown.esc.stop="cancelRename"
          @blur="saveRename"
        />
        <span v-else class="text-xs truncate font-medium flex-1" @dblclick.stop="startRenaming">
          {{ item.name }}
        </span>
      </div>

      <!-- Map Stats / Menu Trigger -->
      <div
        class="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <template v-if="!item.isFolder && mapData">
          <span
            :class="[
              'text-[0.6rem] font-mono',
              item.id === store.activeMapID ? 'text-white/60' : 'text-gray-400'
            ]"
          >
            {{ mapData.width }}x{{ mapData.height }}
          </span>
        </template>
        <button
          class="p-0.5 rounded hover:bg-black/10 transition-colors"
          @click.stop="onContextMenu"
        >
          <IconDotsVertical :size="14" />
        </button>
      </div>

      <!-- Drop Insertion Indicator (precise placement for maps) -->
      <div
        v-if="isDragTarget && !item.isFolder"
        class="absolute -bottom-1 left-8 right-2 h-[3px] bg-black rounded-full z-20 pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.3)] animate-pulse"
      ></div>
    </div>

    <!-- Recursive Children with Transition -->
    <Transition name="expand" @before-enter="beforeEnter" @enter="enter" @leave="leave">
      <div v-if="item.isFolder && item.expanded" class="overflow-hidden">
        <MapTreeItem
          v-for="child in children"
          :key="child.id"
          :item="child"
          :depth="depth + 1"
          @contextmenu="(payload) => emit('contextmenu', payload)"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.group:hover .opacity-0 {
  opacity: 1;
}

/* Expansion Transition */
.expand-enter-active,
.expand-leave-active {
  transition:
    height 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.2s ease;
}
</style>
