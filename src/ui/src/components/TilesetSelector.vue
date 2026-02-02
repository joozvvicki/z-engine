<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { useTilesetAtlas } from '@ui/composables/useTilesetAtlas'
import { useTilesetSelection } from '@ui/composables/useTilesetSelection'
import {
  IconSettings,
  IconX,
  IconStar,
  IconCircle,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconPointer
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
const highlightStyle = ref({
  left: '0px',
  width: '0px'
})

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
  { id: 'select', icon: IconPointer, label: 'Select (1)', color: 'text-blue-500' },
  { id: 'solid', icon: IconX, label: 'Solid (2)', color: 'text-red-500' },
  { id: 'star', icon: IconStar, label: 'Star (3)', color: 'text-yellow-500' },
  { id: 'passable', icon: IconCircle, label: 'Passable (4)', color: 'text-green-500' }
]
</script>

<template>
  <div
    :class="[
      'flex relative flex-col h-full select-none overflow-hidden bg-white',
      store.isTestMode && 'pointer-events-none opacity-50'
    ]"
  >
    <!-- Top Bar: Workspace controls -->
    <div class="p-4 border-b border-black/5 flex items-center justify-between bg-black/2">
      <h2 class="text-xs font-black uppercase tracking-widest text-black/40">Tileset</h2>

      <button
        title="Toggle Edit Mode"
        :class="[
          'p-2 rounded-xl transition-all cursor-pointer border',
          isEditMode
            ? 'bg-black text-white border-black shadow-lg shadow-black/20'
            : 'hover:bg-black/5 text-black/40 border-transparent'
        ]"
        @click="isEditMode = !isEditMode"
      >
        <IconSettings :size="18" stroke-width="2.5" />
      </button>
    </div>

    <!-- Edit Mode Toolbar -->
    <Transition name="fade">
      <div v-if="isEditMode" class="p-2 border-b border-black/5 bg-white flex gap-1 shadow-sm z-10">
        <button
          v-for="tool in configTools"
          :key="tool.id"
          :class="[
            'flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all cursor-pointer group',
            activeConfigTool === tool.id
              ? 'bg-black text-white shadow-md'
              : 'hover:bg-black/5 text-black/40'
          ]"
          :title="tool.label"
          @click="activeConfigTool = tool.id as any"
        >
          <component
            :is="tool.icon"
            :size="16"
            stroke-width="3"
            :class="activeConfigTool === tool.id ? 'text-white' : tool.color"
          />
          <span class="text-[8px] font-black uppercase tracking-tighter">{{ tool.id }}</span>
        </button>
      </div>
    </Transition>

    <div class="flex-1 overflow-auto relative scrollbar-thin bg-[#fafbfc]">
      <div v-if="isProcessing" class="absolute inset-0 flex items-center justify-center">
        <span class="text-black/10 text-xs font-black animate-pulse uppercase tracking-[0.2em]"
          >GENERATING ATLAS...</span
        >
      </div>

      <div
        v-else
        class="relative w-max border border-black/5 cursor-pointer bg-white shadow-2xl"
        @mousedown="onContainerMouseDown"
        @mousemove="onContainerMouseMove"
      >
        <img
          :src="processedImageUrl"
          class="block pixelated pointer-events-none"
          :class="{ 'opacity-80': isEditMode }"
          draggable="false"
        />

        <div class="absolute inset-0 pointer-events-none opacity-5 grid-48"></div>

        <!-- Selection Rectangle (Only in Select Mode) -->
        <div
          v-if="!isEditMode && selectionStyle"
          :style="selectionStyle"
          class="absolute border-4 border-black z-10 shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-all duration-75"
        ></div>

        <!-- Edit Mode Overlays -->
        <template v-if="isEditMode">
          <template v-if="store.activeTab === 'A'">
            <template v-for="map in iconMapping" :key="`${map.uiX}_${map.uiY}`">
              <template v-if="store.getTileConfig(map.url, map.ox, map.oy)">
                <div
                  v-if="store.getTileConfig(map.url, map.ox, map.oy)?.isSolid"
                  class="absolute flex items-center justify-center pointer-events-none"
                  :style="{
                    left: `${map.uiX * 48}px`,
                    top: `${map.uiY * 48}px`,
                    width: '48px',
                    height: '48px'
                  }"
                >
                  <IconX class="text-red-500 w-8 h-8 drop-shadow-md stroke-thick" />
                </div>
                <div
                  v-if="store.getTileConfig(map.url, map.ox, map.oy)?.isHighPriority"
                  class="absolute flex items-center justify-center pointer-events-none"
                  :style="{
                    left: `${map.uiX * 48}px`,
                    top: `${map.uiY * 48}px`,
                    width: '48px',
                    height: '48px'
                  }"
                >
                  <IconStar class="text-yellow-400 w-8 h-8 drop-shadow-md fill-current" />
                </div>

                <!-- Directional Indicators -->
                <div
                  class="absolute inset-0 pointer-events-none"
                  :style="{
                    left: `${map.uiX * 48}px`,
                    top: `${map.uiY * 48}px`,
                    width: '48px',
                    height: '48px'
                  }"
                >
                  <IconArrowUp
                    v-if="(store.getTileConfig(map.url, map.ox, map.oy)?.dirBlock ?? 0) & 1"
                    class="absolute top-1 left-1/2 -translate-x-1/2 text-red-500 w-3 h-3"
                  />
                  <IconArrowRight
                    v-if="(store.getTileConfig(map.url, map.ox, map.oy)?.dirBlock ?? 0) & 2"
                    class="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 w-3 h-3"
                  />
                  <IconArrowDown
                    v-if="(store.getTileConfig(map.url, map.ox, map.oy)?.dirBlock ?? 0) & 4"
                    class="absolute bottom-1 left-1/2 -translate-x-1/2 text-red-500 w-3 h-3"
                  />
                  <IconArrowLeft
                    v-if="(store.getTileConfig(map.url, map.ox, map.oy)?.dirBlock ?? 0) & 8"
                    class="absolute left-1 top-1/2 -translate-y-1/2 text-red-500 w-3 h-3"
                  />
                </div>
              </template>
            </template>
          </template>

          <template v-else>
            <template v-if="store.tilesets.find((t) => t.id === store.activeTab)">
              <template
                v-for="(config, key) in store.getTileConfigMap(
                  store.tilesets.find((t) => t.id === store.activeTab)!.url
                ) || {}"
                :key="key"
              >
                <template
                  v-if="
                    parseInt(key.split('_')[0]) * 48 < atlasWidth &&
                    parseInt(key.split('_')[1]) * 48 < atlasHeight
                  "
                >
                  <div
                    v-if="config.isSolid"
                    class="absolute flex items-center justify-center pointer-events-none"
                    :style="{
                      left: `${parseInt(key.split('_')[0]) * 48}px`,
                      top: `${parseInt(key.split('_')[1]) * 48}px`,
                      width: '48px',
                      height: '48px'
                    }"
                  >
                    <IconX class="text-red-500 w-8 h-8 drop-shadow-md stroke-thick" />
                  </div>
                  <div
                    v-if="config.isHighPriority"
                    class="absolute flex items-center justify-center pointer-events-none"
                    :style="{
                      left: `${parseInt(key.split('_')[0]) * 48}px`,
                      top: `${parseInt(key.split('_')[1]) * 48}px`,
                      width: '48px',
                      height: '48px'
                    }"
                  >
                    <IconStar class="text-yellow-400 w-8 h-8 drop-shadow-md fill-current" />
                  </div>

                  <!-- Directional Indicators -->
                  <div
                    class="absolute pointer-events-none"
                    :style="{
                      left: `${parseInt(key.split('_')[0]) * 48}px`,
                      top: `${parseInt(key.split('_')[1]) * 48}px`,
                      width: '48px',
                      height: '48px'
                    }"
                  >
                    <IconArrowUp
                      v-if="(config.dirBlock ?? 0) & 1"
                      class="absolute top-1 left-1/2 -translate-x-1/2 text-red-500 w-3 h-3"
                    />
                    <IconArrowRight
                      v-if="(config.dirBlock ?? 0) & 2"
                      class="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 w-3 h-3"
                    />
                    <IconArrowDown
                      v-if="(config.dirBlock ?? 0) & 4"
                      class="absolute bottom-1 left-1/2 -translate-x-1/2 text-red-500 w-3 h-3"
                    />
                    <IconArrowLeft
                      v-if="(config.dirBlock ?? 0) & 8"
                      class="absolute left-1 top-1/2 -translate-y-1/2 text-red-500 w-3 h-3"
                    />
                  </div>
                </template>
              </template>
            </template>
          </template>
        </template>
      </div>
    </div>

    <div class="p-4 bg-white border-t border-black/5">
      <div class="relative flex gap-1 bg-black/3 p-1 rounded-2xl overflow-hidden">
        <div
          class="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm transition-all duration-300 ease-out z-0"
          :style="highlightStyle"
        ></div>
        <button
          v-for="tab in TABS"
          :key="tab"
          ref="tabRefs"
          :class="[
            'relative flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer z-10 transition-colors duration-200',
            store.activeTab === tab ? 'text-black' : 'text-black/30 hover:text-black/50'
          ]"
          @click="store.activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <!-- Modals -->
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
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.pixelated {
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: pixelated;
  image-rendering: optimize-speed;
}
.grid-48 {
  background-image:
    linear-gradient(to right, #000 1px, transparent 1px),
    linear-gradient(to bottom, #000 1px, transparent 1px);
  background-size: 48px 48px;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.1);
}
.stroke-thick {
  stroke-width: 4px;
}
</style>
