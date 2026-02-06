<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { useTilesetAtlas } from '@ui/composables/useTilesetAtlas'
import { useTilesetSelection } from '@ui/composables/useTilesetSelection'
import {
  IconX,
  IconStar,
  IconCircle,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconPointer,
  IconGridDots,
  IconEdit
} from '@tabler/icons-vue'
import TileSettingsModal from './modal/TileSettingsModal.vue'

const store = useEditorStore()

const { processedImageUrl, isProcessing, iconMapping, GRID_SIZE, atlasWidth, atlasHeight } =
  useTilesetAtlas()

const {
  handleMouseDown: selectMouseDown,
  handleMouseMove: selectMouseMove,
  handleMouseUp: selectMouseUp,
  selectionStyle
} = useTilesetSelection(iconMapping, GRID_SIZE)

// -- Edit Mode State --
const isEditMode = ref(false)
const showTileSettings = ref(false)
const editingTile = ref<{ x: number; y: number; url: string } | null>(null)

type ConfigTool = 'select' | 'solid' | 'star' | 'passable'
const activeConfigTool = ref<ConfigTool>('select')
const isPainting = ref(false)

// -- Edit Mode Logic --
const openTileSettings = (url: string, x: number, y: number): void => {
  editingTile.value = { x, y, url }
  showTileSettings.value = true
}

const getTileInfoAtCoords = (
  e: MouseEvent
): { targetUrl: string; targetX: number; targetY: number; uiX: number; uiY: number } | null => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const uiX = Math.floor((e.clientX - rect.left) / GRID_SIZE)
  const uiY = Math.floor((e.clientY - rect.top) / GRID_SIZE)

  if (uiX < 0 || uiY < 0) return null

  let targetUrl = ''
  let targetX = uiX
  let targetY = uiY

  if (store.activeTab === 'A') {
    const mapping = iconMapping.value.find((m) => m.uiX === uiX && m.uiY === uiY)
    if (!mapping) return null
    targetUrl = mapping.url
    targetX = mapping.ox
    targetY = mapping.oy
  } else {
    const currentTs = store.tilesets.find((t) => t.id === store.activeTab)
    if (!currentTs) return null
    targetUrl = currentTs.url
  }

  return { targetUrl, targetX, targetY, uiX, uiY }
}

const applyConfig = (url: string, x: number, y: number): void => {
  if (activeConfigTool.value === 'solid') {
    store.updateTileConfig(url, x, y, { isSolid: true, isHighPriority: false })
  } else if (activeConfigTool.value === 'star') {
    store.updateTileConfig(url, x, y, { isSolid: false, isHighPriority: true })
  } else if (activeConfigTool.value === 'passable') {
    store.updateTileConfig(url, x, y, { isSolid: false, isHighPriority: false })
  }
}

const onContainerMouseDown = (e: MouseEvent): void => {
  if (!isEditMode.value) {
    selectMouseDown(e)
    return
  }

  const info = getTileInfoAtCoords(e)
  if (!info) return

  if (activeConfigTool.value === 'select') {
    openTileSettings(info.targetUrl, info.targetX, info.targetY)
  } else {
    isPainting.value = true
    applyConfig(info.targetUrl, info.targetX, info.targetY)
  }
}

const onContainerMouseMove = (e: MouseEvent): void => {
  if (!isEditMode.value) {
    selectMouseMove(e)
    return
  }

  if (isPainting.value) {
    const info = getTileInfoAtCoords(e)
    if (info) {
      applyConfig(info.targetUrl, info.targetX, info.targetY)
    }
  }
}

const handleMouseUpGlobal = (): void => {
  isPainting.value = false
  selectMouseUp()
}

const handleKeydown = (e: KeyboardEvent): void => {
  if (store.isTestMode) return
  if (!isEditMode.value) return

  if (e.key === '1') activeConfigTool.value = 'select'
  if (e.key === '2') activeConfigTool.value = 'solid'
  if (e.key === '3') activeConfigTool.value = 'star'
  if (e.key === '4') activeConfigTool.value = 'passable'
}

onMounted(() => {
  window.addEventListener('mouseup', handleMouseUpGlobal)
  window.addEventListener('keydown', handleKeydown)
  nextTick(updateHighlight)
  window.addEventListener('resize', updateHighlight)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', handleMouseUpGlobal)
  window.removeEventListener('keydown', handleKeydown)
})

const TABS = computed(() => {
  return ['A', 'B', 'C', 'D', 'Roofs']
})

const tabRefs = ref<HTMLElement[]>([])
const highlightStyle = ref({ left: '0px', width: '0px' })

const updateHighlight = (): void => {
  const activeIndex = TABS.value.indexOf(store.activeTab)
  const el = tabRefs.value[activeIndex]
  if (el) {
    highlightStyle.value = {
      left: `${el.offsetLeft}px`,
      width: `${el.offsetWidth}px`
    }
  }
}

watch(
  [() => store.activeTab, TABS],
  () => {
    nextTick(updateHighlight)
  },
  { immediate: true }
)

const configTools = [
  {
    id: 'select',
    icon: IconPointer,
    label: 'Properties (1)',
    color: 'text-blue-500',
    bg: 'bg-blue-50'
  },
  { id: 'solid', icon: IconX, label: 'Solid (2)', color: 'text-red-500', bg: 'bg-red-50' },
  {
    id: 'star',
    icon: IconStar,
    label: 'High Priority (3)',
    color: 'text-amber-500',
    bg: 'bg-amber-50'
  },
  {
    id: 'passable',
    icon: IconCircle,
    label: 'Passable (4)',
    color: 'text-emerald-500',
    bg: 'bg-emerald-50'
  }
]
</script>

<template>
  <div class="flex relative flex-col h-full select-none overflow-hidden bg-white">
    <div
      class="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white z-20"
    >
      <div class="flex items-center gap-2 text-slate-400">
        <IconGridDots :size="16" />
        <h2 class="text-xs font-black uppercase tracking-widest">Tileset</h2>
      </div>

      <button
        title="Toggle Collision Editor"
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
        :class="
          isEditMode
            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-900'
        "
        @click="isEditMode = !isEditMode"
      >
        <IconEdit :size="14" />
        <span>{{ isEditMode ? 'Done' : 'Edit' }}</span>
      </button>
    </div>

    <div
      class="overflow-hidden transition-all duration-300 ease-in-out border-b border-slate-100 bg-slate-50/50"
      :class="isEditMode ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'"
    >
      <div class="p-2 flex gap-2 justify-center">
        <button
          v-for="tool in configTools"
          :key="tool.id"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider border"
          :class="
            activeConfigTool === tool.id
              ? 'bg-white border-slate-200 shadow-sm text-slate-900 ring-1 ring-slate-200'
              : 'border-transparent text-slate-400 hover:bg-white hover:text-slate-600'
          "
          @click="activeConfigTool = tool.id as any"
        >
          <component
            :is="tool.icon"
            :size="14"
            stroke-width="3"
            :class="activeConfigTool === tool.id ? tool.color : 'text-slate-400'"
          />
          {{ tool.label.split(' ')[0] }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-auto relative custom-scrollbar bg-slate-100/50">
      <div
        v-if="isProcessing"
        class="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/80 backdrop-blur-sm"
      >
        <div
          class="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-2"
        ></div>
        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest"
          >Processing Atlas...</span
        >
      </div>

      <div
        v-else
        class="relative w-max m-4 bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200"
        @mousedown="onContainerMouseDown"
        @mousemove="onContainerMouseMove"
      >
        <div class="absolute inset-0 checkerboard opacity-50 pointer-events-none"></div>

        <img
          :src="processedImageUrl"
          class="block pixelated relative z-0 transition-opacity duration-300"
          :class="isEditMode ? 'opacity-60' : 'opacity-100'"
          draggable="false"
        />

        <div class="absolute inset-0 pointer-events-none grid-48 z-10 opacity-10"></div>

        <div
          v-if="!isEditMode && selectionStyle"
          :style="selectionStyle"
          class="absolute border-[3px] border-blue-500 z-20 shadow-[0_0_15px_rgba(59,130,246,0.5)] pointer-events-none transition-all duration-75"
        ></div>

        <template v-if="isEditMode">
          <template v-if="store.activeTab === 'A'">
            <div v-for="map in iconMapping" :key="`${map.uiX}_${map.uiY}`">
              <div
                v-if="store.getTileConfig(map.url, map.ox, map.oy)"
                class="absolute z-20 pointer-events-none flex items-center justify-center"
                :style="{
                  left: `${map.uiX * 48}px`,
                  top: `${map.uiY * 48}px`,
                  width: '48px',
                  height: '48px'
                }"
              >
                <IconX
                  v-if="store.getTileConfig(map.url, map.ox, map.oy)?.isSolid"
                  class="text-red-500 w-8 h-8 drop-shadow-md stroke-[3]"
                />
                <IconStar
                  v-if="store.getTileConfig(map.url, map.ox, map.oy)?.isHighPriority"
                  class="text-amber-400 w-8 h-8 drop-shadow-md fill-current"
                />

                <IconArrowUp
                  v-if="(store.getTileConfig(map.url, map.ox, map.oy)?.dirBlock ?? 0) & 1"
                  class="absolute top-0 left-1/2 -translate-x-1/2 text-red-600 w-4 h-4 drop-shadow-sm"
                />
                <IconArrowRight
                  v-if="(store.getTileConfig(map.url, map.ox, map.oy)?.dirBlock ?? 0) & 2"
                  class="absolute right-0 top-1/2 -translate-y-1/2 text-red-600 w-4 h-4 drop-shadow-sm"
                />
                <IconArrowDown
                  v-if="(store.getTileConfig(map.url, map.ox, map.oy)?.dirBlock ?? 0) & 4"
                  class="absolute bottom-0 left-1/2 -translate-x-1/2 text-red-600 w-4 h-4 drop-shadow-sm"
                />
                <IconArrowLeft
                  v-if="(store.getTileConfig(map.url, map.ox, map.oy)?.dirBlock ?? 0) & 8"
                  class="absolute left-0 top-1/2 -translate-y-1/2 text-red-600 w-4 h-4 drop-shadow-sm"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <template v-if="store.tilesets.find((t) => t.id === store.activeTab)">
              <div
                v-for="(config, key) in store.getTileConfigMap(
                  store.tilesets.find((t) => t.id === store.activeTab)!.url
                ) || {}"
                :key="key"
              >
                <div
                  v-if="
                    parseInt(key.split('_')[0]) * 48 < atlasWidth &&
                    parseInt(key.split('_')[1]) * 48 < atlasHeight
                  "
                  class="absolute z-20 pointer-events-none flex items-center justify-center"
                  :style="{
                    left: `${parseInt(key.split('_')[0]) * 48}px`,
                    top: `${parseInt(key.split('_')[1]) * 48}px`,
                    width: '48px',
                    height: '48px'
                  }"
                >
                  <IconX
                    v-if="config.isSolid"
                    class="text-red-500 w-8 h-8 drop-shadow-md stroke-[3]"
                  />
                  <IconStar
                    v-if="config.isHighPriority"
                    class="text-amber-400 w-8 h-8 drop-shadow-md fill-current"
                  />

                  <IconArrowUp
                    v-if="(config.dirBlock ?? 0) & 1"
                    class="absolute top-0 left-1/2 -translate-x-1/2 text-red-600 w-4 h-4 drop-shadow-sm"
                  />
                  <IconArrowRight
                    v-if="(config.dirBlock ?? 0) & 2"
                    class="absolute right-0 top-1/2 -translate-y-1/2 text-red-600 w-4 h-4 drop-shadow-sm"
                  />
                  <IconArrowDown
                    v-if="(config.dirBlock ?? 0) & 4"
                    class="absolute bottom-0 left-1/2 -translate-x-1/2 text-red-600 w-4 h-4 drop-shadow-sm"
                  />
                  <IconArrowLeft
                    v-if="(config.dirBlock ?? 0) & 8"
                    class="absolute left-0 top-1/2 -translate-y-1/2 text-red-600 w-4 h-4 drop-shadow-sm"
                  />
                </div>
              </div>
            </template>
          </template>
        </template>
      </div>
    </div>

    <div class="p-3 bg-white border-t border-slate-200 z-20">
      <div class="relative flex bg-slate-100 p-1 rounded-xl">
        <div
          class="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm border border-slate-100 transition-all duration-300 ease-out z-0"
          :style="highlightStyle"
        ></div>
        <button
          v-for="tab in TABS"
          :key="tab"
          ref="tabRefs"
          class="relative flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg cursor-pointer z-10 transition-colors duration-200 text-center"
          :class="
            store.activeTab === tab ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
          "
          @click="store.activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <TileSettingsModal
      v-if="showTileSettings && editingTile"
      :tileset-url="editingTile.url"
      :tile-x="editingTile.x"
      :tile-y="editingTile.y"
      :image-url="editingTile.url"
      @close="showTileSettings = false"
    />
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}

/* Custom Grid using gradients */
.grid-48 {
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
  background-size: 48px 48px;
}

/* Checkerboard for transparency */
.checkerboard {
  background-image:
    linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
    linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
    linear-gradient(-45deg, transparent 75%, #f1f5f9 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
