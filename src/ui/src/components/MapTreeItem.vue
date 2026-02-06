<script setup lang="ts">
import {
  IconChevronRight,
  IconChevronDown,
  IconFolderFilled,
  IconFolderOpen,
  IconMap,
  IconDots
} from '@tabler/icons-vue'
import type { ZMapInfo } from '@engine/types'
import { computed, ref, nextTick, watch } from 'vue'
import { useEditorStore } from '@ui/stores/editor'

const props = defineProps<{ item: ZMapInfo; depth: number }>()
const store = useEditorStore()

const isDragTarget = ref(false)
const dropPosition = ref<'before' | 'after' | 'inside' | null>(null)
let dragCounter = 0
const isRenaming = ref(false)
const renamingName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const children = computed(() =>
  store.mapInfos.filter((m) => m.parentId === props.item.id).sort((a, b) => a.order - b.order)
)
const mapData = computed(() => store.maps.find((m) => m.id === props.item.id))

const handleClick = (): void => {
  if (props.item.isFolder) store.toggleFolderExpanded(props.item.id)
  else if (!store.isTestMode) store.setActiveMap(props.item.id)
}

const emit = defineEmits(['contextmenu'])
const onContextMenu = (e: MouseEvent): void => emit('contextmenu', { event: e, item: props.item })

// --- Drag & Drop ---
const onDragStart = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.dataTransfer?.setData('application/json', JSON.stringify({ id: props.item.id }))
  e.dataTransfer!.effectAllowed = 'move'
}

const onDragOver = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top

  // Logic for refined drop zones
  if (props.item.isFolder) {
    // Folders have 3 zones: Top(25%), Middle(50%), Bottom(25%)
    if (y < rect.height * 0.25) dropPosition.value = 'before'
    else if (y > rect.height * 0.75) dropPosition.value = 'after'
    else dropPosition.value = 'inside'
  } else {
    // Maps only have before/after
    dropPosition.value = y < rect.height / 2 ? 'before' : 'after'
  }
}

const onDragEnter = (e: DragEvent): void => {
  if (!store.isTestMode) {
    e.preventDefault()
    dragCounter++
    isDragTarget.value = true
  }
}
const onDragLeave = (e: DragEvent): void => {
  if (!store.isTestMode) {
    e.preventDefault()
    dragCounter--
    if (dragCounter === 0) {
      isDragTarget.value = false
      dropPosition.value = null
    }
  }
}

const onDrop = (e: DragEvent): void => {
  if (store.isTestMode) return
  e.preventDefault()
  e.stopPropagation()
  const pos = dropPosition.value
  isDragTarget.value = false
  dropPosition.value = null
  dragCounter = 0

  const data = e.dataTransfer?.getData('application/json')
  if (data) {
    const { id } = JSON.parse(data)
    if (id === props.item.id) return
    if (props.item.isFolder && store.isDescendant(props.item.id, id)) return

    if (pos === 'inside') store.moveEntry(id, props.item.id, undefined, 'inside')
    else if (pos === 'before' || pos === 'after')
      store.moveEntry(id, props.item.parentId, props.item.id, pos)
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
  if (finalName && finalName !== props.item.name) store.renameEntry(props.item.id, finalName)
  cancelRename()
}
const cancelRename = (): void => {
  isRenaming.value = false
  if (store.renamingId === props.item.id) store.renamingId = null
}

watch(
  () => store.renamingId,
  (newId) => {
    if (newId === props.item.id && !isRenaming.value) startRenaming()
    else if (newId !== props.item.id && isRenaming.value) saveRename()
  }
)

// Animation hooks
const beforeEnter = (el: Element): void => {
  ;(el as HTMLElement).style.height = '0'
  ;(el as HTMLElement).style.opacity = '0'
}
const enter = (el: Element): void => {
  ;(el as HTMLElement).style.height = (el as HTMLElement).scrollHeight + 'px'
  ;(el as HTMLElement).style.opacity = '1'
}
const afterEnter = (el: Element): void => {
  ;(el as HTMLElement).style.height = ''
}
const leave = (el: Element): void => {
  const h = el as HTMLElement
  h.style.height = h.scrollHeight + 'px'
  void h.offsetHeight
  h.style.height = '0'
  h.style.opacity = '0'
}
const afterLeave = (el: Element): void => {
  ;(el as HTMLElement).style.height = ''
}
</script>

<template>
  <div class="flex flex-col">
    <div
      class="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150 group select-none border-l-[3px]"
      :class="[
        store.isTestMode ? 'opacity-50 cursor-not-allowed border-transparent' : 'cursor-pointer',
        // ACTIVE STATE
        !item.isFolder && item.id === store.activeMapID
          ? 'bg-blue-50 text-blue-700 border-blue-500 font-medium'
          : 'border-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900',
        // DRAG TARGET (Inside Folder)
        isDragTarget && dropPosition === 'inside'
          ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset'
          : ''
      ]"
      :style="{ marginLeft: depth * 16 + 'px' }"
      :draggable="!store.isTestMode"
      @click="handleClick"
      @contextmenu.prevent="onContextMenu"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragenter="onDragEnter"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <div
        v-if="isDragTarget && dropPosition === 'before'"
        class="absolute -top-[2px] left-0 right-0 h-[2px] bg-blue-500 z-50 shadow-[0_0_4px_rgba(59,130,246,0.8)]"
      >
        <div class="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-blue-500"></div>
      </div>

      <div class="flex items-center justify-center w-4 h-4 shrink-0 text-slate-400">
        <component
          :is="item.expanded ? IconChevronDown : IconChevronRight"
          v-if="item.isFolder"
          size="12"
          class="hover:text-slate-600"
          @click.stop="store.toggleFolderExpanded(item.id)"
        />
      </div>

      <component
        :is="item.isFolder ? (item.expanded ? IconFolderOpen : IconFolderFilled) : IconMap"
        :size="16"
        class="shrink-0 transition-colors"
        :class="[
          item.isFolder
            ? 'text-amber-400'
            : item.id === store.activeMapID
              ? 'text-blue-500'
              : 'text-slate-400 group-hover:text-slate-500'
        ]"
      />

      <input
        v-if="isRenaming"
        ref="nameInput"
        v-model="renamingName"
        class="flex-1 bg-white border border-blue-400 rounded px-1.5 py-0 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 min-w-0"
        @click.stop
        @keydown.enter.stop="saveRename"
        @keydown.esc.stop="cancelRename"
        @blur="saveRename"
      />
      <span
        v-else
        class="text-xs truncate flex-1 leading-none pt-0.5"
        @dblclick.stop="startRenaming"
      >
        {{ item.name }}
      </span>

      <div class="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <span v-if="!item.isFolder && mapData" class="text-[9px] font-mono text-slate-300 mr-1">
          {{ mapData.width }}x{{ mapData.height }}
        </span>
        <button
          class="p-0.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
          @click.stop="onContextMenu"
        >
          <IconDots :size="14" />
        </button>
      </div>

      <div
        v-if="isDragTarget && dropPosition === 'after'"
        class="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-blue-500 z-50 shadow-[0_0_4px_rgba(59,130,246,0.8)]"
      >
        <div class="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-blue-500"></div>
      </div>
    </div>

    <Transition
      name="expand"
      @before-enter="beforeEnter"
      @enter="enter"
      @after-enter="afterEnter"
      @leave="leave"
      @after-leave="afterLeave"
    >
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
.expand-enter-active,
.expand-leave-active {
  transition:
    height 0.2s cubic-bezier(0.25, 0.8, 0.5, 1),
    opacity 0.2s ease;
}
</style>
