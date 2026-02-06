<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import {
  IconPencil,
  IconEraser,
  IconBucketDroplet,
  IconRectangle,
  IconCircle,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBox,
  IconScan,
  IconPlayerPlay,
  IconPlayerStop,
  IconPackage // Added IconPackage
} from '@tabler/icons-vue'
import BuildGameModal from './BuildGameModal.vue'
import PlaytestModal from './modal/PlaytestModal.vue'
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { ZLayer, ZTool } from '@engine/types'

const store = useEditorStore()

const buildModal = ref<InstanceType<typeof BuildGameModal> | null>(null)
const playtestModal = ref<InstanceType<typeof PlaytestModal> | null>(null)

const buildGame = (): void => {
  buildModal.value?.open()
}

const togglePlay = async (event?: MouseEvent): Promise<void> => {
  if (store.isTestMode) {
    playtestModal.value?.close()
  } else {
    playtestModal.value?.open()
  }

  // Blur focus to prevent keyboard trap
  if (event?.currentTarget instanceof HTMLElement) {
    event.currentTarget.blur()
  }
}

const tools = [
  { tool: ZTool.brush, icon: IconPencil, tooltip: 'Pędzel (1)' },
  { tool: ZTool.select, icon: IconScan, tooltip: 'Zaznacz (S)' },
  { tool: ZTool.bucket, icon: IconBucketDroplet, tooltip: 'Wypełniacz (2)' },
  { tool: ZTool.rectangle, icon: IconRectangle, tooltip: 'Prostokąt (3)' },
  { tool: ZTool.circle, icon: IconCircle, tooltip: 'Okrąg (4)' },
  { tool: ZTool.event, icon: IconBox, tooltip: 'Zdarzenie (5)' },
  { tool: ZTool.eraser, icon: IconEraser, tooltip: 'Gumka (6)', isCritical: true }
]

const actions = [
  {
    name: 'Undo',
    icon: IconArrowBackUp,
    shortcut: 'Ctrl + Z',
    action: () => store.undo(),
    tooltip: 'Cofnij (Ctrl + Z)'
  },
  {
    name: 'Redo',
    icon: IconArrowForwardUp,
    shortcut: 'Ctrl + Y',
    action: () => store.redo(),
    tooltip: 'Ponów (Ctrl + Y)'
  }
]

const handleKeydown = (e: KeyboardEvent): void => {
  if (store.isEventEditorOpen) return

  if (e.ctrlKey || e.metaKey) {
    if (e.shiftKey) {
      switch (e.key) {
        case 'P':
          store.toggleTestMode()
          return
      }
    }

    if (store.isTestMode) return

    switch (e.key) {
      case 'z':
      case 'Z':
        if (e.shiftKey) {
          store.redo()
        } else {
          store.undo()
        }
        break
      case 'y':
      case 'Y':
        store.redo()
        break
      case 'D':
        store.exportMapAsJSON()
        break
      case 'ArrowUp': {
        const layerKeys = sortedLayers.value.map(([key]) => key as ZLayer)
        if (layerKeys.length === 0) return

        const currentIndex = layerKeys.indexOf(store.activeLayer)
        // If current layer isn't in visible list (like 'events'), start from first visible
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex - 1 + layerKeys.length) % layerKeys.length
        store.setLayer(layerKeys[nextIndex])
        e.preventDefault()
        break
      }
      case 'ArrowDown': {
        const layerKeys = sortedLayers.value.map(([key]) => key as ZLayer)
        if (layerKeys.length === 0) return

        const currentIndex = layerKeys.indexOf(store.activeLayer)
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % layerKeys.length
        store.setLayer(layerKeys[nextIndex])
        e.preventDefault()
        break
      }
      case 'V':
        store.pasteSelection()
        e.preventDefault()
        break
    }
  } else {
    if (store.isTestMode) return
    // Shortcuts without modifiers (Tools)
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      switch (e.key) {
        case '1':
          store.setTool(ZTool.brush)
          break
        case '2':
        case 's':
        case 'S':
          store.setTool(ZTool.select)
          break
        case '3':
          store.setTool(ZTool.bucket)
          break
        case '4':
          store.setTool(ZTool.rectangle)
          break
        case '5':
          store.setTool(ZTool.circle)
          break
        case '6':
          store.setTool(ZTool.event)
          break
        case '7':
          store.setTool(ZTool.eraser)
          break

        case 'Escape':
          store.setSelectionCoords(null)
          // Reset selection pattern if it exists (stop stamping)
          if (store.selection && store.selection.pattern) {
            store.setSelection({ ...store.selection, pattern: undefined, w: 1, h: 1 })
          }
          break
      }
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
    if (store.isTestMode) return
    if (e.shiftKey) {
      store.copySelection(true) // Copy merged visible layers
    } else {
      store.copySelection(false) // Copy active layer only
    }
    e.preventDefault()
  }

  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
    if (store.isTestMode) return
    store.pasteSelection()
    e.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

const sortedLayers = computed(() => {
  if (!store.activeMap) return []
  return Object.entries(store.activeMap.layers).sort((a, b) => b[1].index - a[1].index)
})

// Sliding Background Logic

const toolRefs = ref<HTMLElement[]>([])

const toolHighlightStyle = ref({
  left: '0px',
  width: '0px',
  backgroundColor: store.currentTool === ZTool.eraser ? 'red !important' : 'black'
})

const updateToolHighlight = (): void => {
  const activeIndex = tools.findIndex((t) => t.tool === store.currentTool)
  const el = toolRefs.value[activeIndex]

  if (el) {
    toolHighlightStyle.value = {
      left: `${el.offsetLeft}px`,
      width: `${el.offsetWidth}px`,
      backgroundColor: store.currentTool === ZTool.eraser ? 'red !important' : 'black'
    }
  }
}

watch(
  () => store.currentTool,
  () => {
    nextTick(updateToolHighlight)
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  window.addEventListener('resize', () => {
    updateToolHighlight()
  })

  nextTick(() => {
    updateToolHighlight()
  })
})
</script>

<template>
  <div class="flex items-center gap-1 pointer-events-auto h-9">
    <div class="relative flex gap-1 bg-transparent p-0">
      <div
        class="absolute top-0 bottom-0 bg-slate-900 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] z-0"
        :style="toolHighlightStyle"
      ></div>

      <button
        v-for="tool in tools"
        :key="tool.tooltip"
        ref="toolRefs"
        class="group relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer z-10 disabled:opacity-30 disabled:cursor-not-allowed"
        :class="
          store.currentTool === tool.tool
            ? 'text-white'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/5'
        "
        :disabled="store.isTestMode"
        @click="store.setTool(tool.tool)"
      >
        <component :is="tool.icon" :size="18" stroke-width="2" />

        <div
          class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl z-50"
        >
          {{ tool.tooltip.split(' ')[0] }}
          <div
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"
          ></div>
        </div>
      </button>
    </div>

    <div class="w-px h-5 bg-slate-200 mx-2"></div>

    <div class="flex gap-1">
      <button
        v-for="action in actions"
        :key="action.name"
        class="relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer group disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-900 hover:bg-slate-900/5"
        :disabled="store.isTestMode"
        @click="action.action"
      >
        <component :is="action.icon" :size="18" stroke-width="2" />

        <div
          v-if="
            (action.name === 'Undo' && store.undoCount > 0) ||
            (action.name === 'Redo' && store.redoCount > 0)
          "
          class="absolute top-0.5 right-0.5 w-3 h-3 bg-slate-900 text-white text-[7px] font-bold flex items-center justify-center rounded-full ring-1 ring-white"
        >
          {{ action.name === 'Undo' ? store.undoCount : store.redoCount }}
        </div>
      </button>
    </div>

    <div class="w-px h-5 bg-slate-200 mx-2"></div>

    <div class="flex gap-1">
      <button
        class="relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer group text-blue-600 hover:bg-blue-50"
        title="Build Game"
        @click="buildGame"
      >
        <IconPackage :size="18" stroke-width="2" />
      </button>

      <button
        class="relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer group"
        :class="
          store.isTestMode
            ? 'text-white bg-red-500 shadow-md shadow-red-500/30'
            : 'text-emerald-600 hover:bg-emerald-50'
        "
        title="Playtest"
        @click="togglePlay"
      >
        <IconPlayerStop v-if="store.isTestMode" :size="18" stroke-width="2" class="fill-current" />
        <IconPlayerPlay v-else :size="18" stroke-width="2" class="fill-current" />
      </button>
    </div>

    <BuildGameModal ref="buildModal" />
    <PlaytestModal ref="playtestModal" />
  </div>
</template>
