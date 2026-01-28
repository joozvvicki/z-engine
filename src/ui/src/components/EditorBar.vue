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
  IconScan
} from '@tabler/icons-vue'
import DynamicIcon from './DynamicIcon.vue'
import { computed, onMounted } from 'vue'
import { ZLayer, ZTool } from '@engine/types'

const store = useEditorStore()

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
      case 'Z':
        store.undo()
        break
      case 'Y':
        store.redo()
        break
      case 'D':
        store.exportMapAsJSON()
        break
      case 'ArrowUp': {
        const currentLayerID = store.activeMap?.layers[store.activeLayer] ? store.activeLayer : null
        if (!currentLayerID) return
        const layerKeys = Object.keys(store.activeMap!.layers)
        const currentIndex = layerKeys.indexOf(currentLayerID)
        const nextIndex = (currentIndex + 1) % layerKeys.length
        store.setLayer(layerKeys[nextIndex] as ZLayer)
        e.preventDefault()
        break
      }
      case 'ArrowDown': {
        const currLayerID = store.activeMap?.layers[store.activeLayer] ? store.activeLayer : null
        if (!currLayerID) return
        const lKeys = Object.keys(store.activeMap!.layers)
        const currIndex = lKeys.indexOf(currLayerID)
        const prevIndex = (currIndex - 1 + lKeys.length) % lKeys.length
        store.setLayer(lKeys[prevIndex] as ZLayer)
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
    store.copySelection()
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
  return Object.entries(store.activeMap.layers).sort((a, b) => b[1].index - a[1].index)
})

// Sliding Background Logic
import { ref, watch, nextTick } from 'vue'

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
      top: `${el.offsetTop}px`,
      height: `${el.offsetHeight}px`,
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
  () => [store.activeLayer, sortedLayers.value],
  () => {
    nextTick(updateLayerHighlight)
  },
  { immediate: true, deep: true }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  // Using window event for simplicity as per previous implementation
  window.addEventListener('resize', () => {
    updateToolHighlight()
    updateLayerHighlight()
  })

  nextTick(() => {
    updateToolHighlight()
    updateLayerHighlight()
  })
})
</script>

<template>
  <div class="absolute bottom-6 left-0 z-20 flex flex-col items-center justify-end gap-4 p-2">
    <div
      v-if="store.currentHistory?.stack?.length !== 1"
      class="flex flex-col gap-1 bg-black/10 backdrop-blur-lg rounded-xl border border-white/5"
    >
      <button
        v-for="action in actions"
        :key="action.name"
        class="relative p-1 rounded-lg transition-all duration-200 cursor-pointer group"
        :class="'bg-transparent text-black hover:text-gray-500'"
        @click="action.action"
      >
        <component :is="action.icon" />
        <div
          v-if="['Undo', 'Redo'].includes(action.name)"
          class="text-white text-[0.5rem] absolute -top-1 -right-1 flex items-center justify-center"
        >
          <span
            v-if="action.name === 'Undo' && store.currentHistory!.index !== 0"
            class="w-3 h-3 bg-red-500 rounded-full"
            >{{ store.currentHistory?.index }}</span
          >
          <span
            v-if="
              action.name === 'Redo' &&
              store.currentHistory!.stack!.length - store.currentHistory!.index - 1 !== 0
            "
            class="w-3 h-3 bg-red-500 rounded-full"
            >{{ store.currentHistory!.stack!.length - store.currentHistory!.index - 1 }}</span
          >
        </div>
        <div
          v-if="action.tooltip"
          class="absolute top-1 z-1000 left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700"
        >
          {{ action.tooltip.split(' ')[0] }}
          <div
            class="absolute z-1001 top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700"
          ></div>
        </div>
      </button>
    </div>

    <div
      class="relative flex flex-col gap-1 bg-black/10 backdrop-blur-lg text-white rounded-xl border border-white/5"
    >
      <div
        class="absolute left-0 right-0 bg-black rounded-lg transition-all duration-300 ease-out z-0"
        :style="toolHighlightStyle"
      ></div>
      <button
        v-for="tool in tools"
        :key="tool.tooltip"
        ref="toolRefs"
        class="group relative p-2 rounded-lg transition-all duration-200 cursor-pointer z-10 text-black"
        :class="store.currentTool === tool.tool ? 'text-white' : ''"
        :title="tool.tooltip"
        @click="store.setTool(tool.tool)"
      >
        <component :is="tool.icon" :size="18" />
        <div
          class="absolute top-1 z-1000 left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700"
        >
          {{ tool.tooltip.split(' ')[0] }}
          <div
            class="absolute z-1001 top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700"
          ></div>
        </div>
      </button>
    </div>

    <div
      v-if="sortedLayers.length"
      class="relative flex flex-col gap-1 bg-black/10 backdrop-blur-lg rounded-xl border border-white/5"
    >
      <div
        class="absolute left-0 right-0 bg-black rounded-lg transition-all duration-300 ease-out z-0"
        :style="layerHighlightStyle"
      ></div>
      <button
        v-for="[key, data] in sortedLayers"
        :key="key"
        ref="layerRefs"
        class="relative p-1 rounded-lg transition-all duration-200 text-black cursor-pointer z-10"
        :class="store.activeLayer === key ? 'text-white' : ''"
        @click="store.setLayer(key as ZLayer)"
      >
        <DynamicIcon :icon="data.icon" :tooltip="key.charAt(0).toUpperCase() + key.slice(1)" />
      </button>
    </div>
  </div>
</template>
