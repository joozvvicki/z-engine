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
import DynamicIcon from './DynamicIcon.vue'
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
  { tool: ZTool.brush, icon: IconPencil, tooltip: 'Pędzel (Ctrl + 1)' },
  { tool: ZTool.select, icon: IconScan, tooltip: 'Zaznacz (Ctrl + S)' },
  { tool: ZTool.bucket, icon: IconBucketDroplet, tooltip: 'Wypełniacz (Ctrl + 2)' },
  { tool: ZTool.rectangle, icon: IconRectangle, tooltip: 'Prostokąt (Ctrl + 3)' },
  { tool: ZTool.circle, icon: IconCircle, tooltip: 'Okrąg (Ctrl + 4)' },
  { tool: ZTool.event, icon: IconBox, tooltip: 'Zdarzenie (Ctrl + 5)' },
  { tool: ZTool.eraser, icon: IconEraser, tooltip: 'Gumka (Ctrl + 6)', isCritical: true }
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
  if (e.ctrlKey || e.metaKey) {
    if (e.shiftKey) {
      switch (e.key) {
        case 'P':
          store.toggleTestMode()
          break
      }
    }

    switch (e.key) {
      case 'z':
      case 'Z':
        if (!store.isTestMode) {
          if (e.shiftKey) {
            store.redo()
          } else {
            store.undo()
          }
        }
        break
      case 'y':
      case 'Y':
        if (!store.isTestMode) store.redo()
        break
      case 'D':
        store.exportMapAsJSON()
        break
      case 'ArrowUp': {
        if (store.isTestMode) break
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
        if (store.isTestMode) break
        const layerKeys = sortedLayers.value.map(([key]) => key as ZLayer)
        if (layerKeys.length === 0) return

        const currentIndex = layerKeys.indexOf(store.activeLayer)
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % layerKeys.length
        store.setLayer(layerKeys[nextIndex])
        e.preventDefault()
        break
      }
      case '1':
        store.setTool(ZTool.brush)
        e.preventDefault()
        break
      case '2':
        store.setTool(ZTool.bucket)
        e.preventDefault()
        break
      case '3':
        store.setTool(ZTool.rectangle)
        e.preventDefault()
        break
      case '4':
        store.setTool(ZTool.circle)
        e.preventDefault()
        break
      case '5':
        store.setTool(ZTool.event)
        e.preventDefault()
        break
      case '6':
        store.setTool(ZTool.eraser)
        e.preventDefault()
        break
      case 's':
      case 'S':
        store.setTool(ZTool.select)
        e.preventDefault()
    }
  } else {
    // Shortcuts without modifiers or with other modifiers
    if (e.key === 'Escape') {
      store.setSelectionCoords(null)
      // Reset selection pattern if it exists (stop stamping)
      if (store.selection && store.selection.pattern) {
        store.setSelection({ ...store.selection, pattern: undefined, w: 1, h: 1 })
      }
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
    if (e.shiftKey) {
      store.copySelection(true) // Copy merged visible layers
    } else {
      store.copySelection(false) // Copy active layer only
    }
    e.preventDefault()
  }

  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
    store.pasteSelection()
    e.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

const sortedLayers = computed(() => {
  if (!store.activeMap) return []
  return Object.entries(store.activeMap.layers)
    .filter(([key]) => key !== ZLayer.events) // Hide Events layer from selection
    .sort((a, b) => b[1].index - a[1].index)
})

// Sliding Background Logic

const toolRefs = ref<HTMLElement[]>([])
const layerRefs = ref<HTMLElement[]>([])

const toolHighlightStyle = ref({
  top: '0px',
  height: '0px',
  backgroundColor: store.currentTool === ZTool.eraser ? 'red !important' : 'black'
})

const layerHighlightStyle = ref({
  top: '0px',
  height: '0px'
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

const updateLayerHighlight = (): void => {
  if (!sortedLayers.value.length) return

  const activeIndex = sortedLayers.value.findIndex(([key]) => key === store.activeLayer)
  const el = layerRefs.value[activeIndex]

  if (el) {
    layerHighlightStyle.value = {
      top: `${el.offsetTop}px`,
      height: `${el.offsetHeight}px`
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
  <div class="absolute bottom-10 left-10 z-20 flex items-center gap-4">
    <!-- Tools -->
    <div
      class="relative flex gap-1 bg-white/80 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl shadow-black/5 border border-black/5"
    >
      <div
        class="absolute top-2 bottom-2 bg-black rounded-xl transition-all duration-300 ease-out z-0"
        :style="toolHighlightStyle"
      ></div>
      <button
        v-for="tool in tools"
        :key="tool.tooltip"
        ref="toolRefs"
        class="group relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer z-10 text-black disabled:opacity-30 disabled:cursor-not-allowed"
        :class="store.currentTool === tool.tool ? 'text-white' : 'hover:bg-black/5'"
        :disabled="store.isTestMode"
        @click="store.setTool(tool.tool)"
      >
        <component :is="tool.icon" :size="20" stroke-width="2.5" />

        <!-- Tooltip -->
        <div
          class="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-xl"
        >
          {{ tool.tooltip.split(' ')[0] }}
        </div>
      </button>
    </div>

    <!-- Actions (Undo/Redo) -->
    <div
      v-if="store.undoCount > 0 || store.redoCount > 0"
      class="flex gap-1 bg-white/80 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl shadow-black/5 border border-black/5"
    >
      <button
        v-for="action in actions"
        :key="action.name"
        class="relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer group disabled:opacity-30 disabled:cursor-not-allowed text-black hover:bg-black/5"
        :disabled="store.isTestMode"
        @click="action.action"
      >
        <component :is="action.icon" :size="20" stroke-width="2.5" />
        <div
          v-if="['Undo', 'Redo'].includes(action.name)"
          class="text-white text-[8px] font-black absolute -top-1 -right-1 flex items-center justify-center ring-2 ring-white"
        >
          <span
            v-if="action.name === 'Undo' && store.undoCount > 0"
            class="w-4 h-4 bg-black rounded-full flex items-center justify-center"
            >{{ store.undoCount }}</span
          >
          <span
            v-if="action.name === 'Redo' && store.redoCount > 0"
            class="w-4 h-4 bg-black rounded-full flex items-center justify-center"
            >{{ store.redoCount }}</span
          >
        </div>
      </button>
    </div>

    <!-- Play/Build -->
    <div
      class="flex gap-1 bg-white/80 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl shadow-black/5 border border-black/5"
    >
      <button
        class="relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer group text-blue-600 hover:bg-black/5"
        @click="buildGame"
      >
        <IconPackage :size="20" stroke-width="2.5" />
      </button>

      <button
        class="relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer group"
        :class="store.isTestMode ? 'text-red-500' : 'text-green-600 hover:bg-black/5'"
        @click="togglePlay"
      >
        <IconPlayerStop v-if="store.isTestMode" :size="20" stroke-width="2.5" />
        <IconPlayerPlay v-else :size="20" stroke-width="2.5" />
      </button>
    </div>
  </div>
  <BuildGameModal ref="buildModal" />
  <PlaytestModal ref="playtestModal" />
</template>
