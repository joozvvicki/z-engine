<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { useTilesetAtlas } from '@ui/composables/useTilesetAtlas'
import { useTilesetSelection } from '@ui/composables/useTilesetSelection'
import { ref, watch, onMounted, nextTick } from 'vue'
import { IconSettings, IconX, IconStar } from '@tabler/icons-vue'
import CollisionEditor from './modal/CollisionEditor.vue'

const store = useEditorStore()

const { processedImageUrl, isProcessing, iconMapping, GRID_SIZE, atlasWidth, atlasHeight } =
  useTilesetAtlas()

const { handleMouseDown, handleMouseMove, handleMouseUp, selectionStyle } = useTilesetSelection(
  iconMapping,
  GRID_SIZE
)

// -- Edit Mode State --
const isEditMode = ref(false)
const showCollisionEditor = ref(false)
const editingTile = ref<{ id: string; x: number; y: number; url: string } | null>(null)

// -- Edit Mode Logic --
const openCollisionEditor = (id: string, x: number, y: number): void => {
  editingTile.value = {
    id,
    x,
    y,
    url: processedImageUrl.value // Use the atlas as preview
  }
  showCollisionEditor.value = true
}

const handleTileClick = (e: MouseEvent): void => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()

  const uiX = Math.floor((e.clientX - rect.left) / GRID_SIZE)
  const uiY = Math.floor((e.clientY - rect.top) / GRID_SIZE)

  if (uiX < 0 || uiY < 0) return

  let targetId = store.activeTab
  let targetX = uiX
  let targetY = uiY

  // For Tab A, lookup source in iconMapping
  if (store.activeTab === 'A') {
    const mapping = iconMapping.value.find((m) => m.uiX === uiX && m.uiY === uiY)
    if (!mapping) return
    targetId = mapping.tilesetId
    targetX = mapping.ox
    targetY = mapping.oy
  }

  // Shift + Click -> Open Collision Editor
  if (e.shiftKey) {
    openCollisionEditor(targetId, targetX, targetY)
    return
  }

  // Normal Click -> Toggle Config
  const key = `${targetX}_${targetY}`
  const currentConfig = store.tilesetConfigs[targetId]?.[key] || {
    isSolid: false,
    isHighPriority: false
  }

  // Toggle logic: Passable -> Solid -> High Priority -> Passable
  let nextConfig = { isSolid: false, isHighPriority: false }

  if (!currentConfig.isSolid && !currentConfig.isHighPriority) {
    nextConfig = { isSolid: true, isHighPriority: false }
  } else if (currentConfig.isSolid) {
    nextConfig = { isSolid: false, isHighPriority: true }
  }

  store.updateTileConfig(targetId, targetX, targetY, nextConfig)
}

// Wrapper to dispatch between Select Mode and Edit Mode
const onContainerMouseDown = (e: MouseEvent): void => {
  if (isEditMode.value) {
    handleTileClick(e)
  } else {
    handleMouseDown(e)
  }
}

const onContainerMouseMove = (e: MouseEvent): void => {
  if (!isEditMode.value) {
    handleMouseMove(e)
  }
}

const TABS = ['A', 'B', 'C', 'D', 'Roofs']
const tabRefs = ref<HTMLElement[]>([])
const highlightStyle = ref({
  left: '0px',
  width: '0px'
})

const updateHighlight = (): void => {
  const activeIndex = TABS.indexOf(store.activeTab)
  const el = tabRefs.value[activeIndex]

  if (el) {
    highlightStyle.value = {
      left: `${el.offsetLeft}px`,
      width: `${el.offsetWidth}px`
    }
  }
}

watch(
  () => store.activeTab,
  () => {
    nextTick(updateHighlight)
  },
  { immediate: true }
)

onMounted(() => {
  nextTick(updateHighlight)
  window.addEventListener('resize', updateHighlight)
})
</script>

<template>
  <div
    class="flex relative flex-col h-full border-l border-white/5 select-none rounded-xl overflow-hidden bg-white"
  >
    <!-- Top Bar: Edit Mode Toggle & Instructions -->
    <div
      class="absolute top-2 left-2 right-4 rounded-lg z-20 flex items-center justify-between p-1 px-3 border-b border-white/5 bg-white/50 backdrop-blur-lg"
    >
      <div v-if="isEditMode" class="text-[10px] text-black/50 leading-tight">
        <span class="text-green-400">O</span>-><span class="text-red-400">X</span>-><span
          class="text-yellow-400"
          >★</span
        >
        <br />Shift+Click: Mask
      </div>
      <div v-else class="text-[10px] text-black/50">Select tiles to paint</div>

      <button
        title="Toggle Edit Mode"
        :class="[
          'p-1 rounded-lg transition-colors border cursor-pointer',
          isEditMode
            ? 'bg-black/20 text-black border-black/30'
            : 'hover:bg-white/5 text-black/40 border-transparent hover:text-black'
        ]"
        @click="isEditMode = !isEditMode"
      >
        <IconSettings class="w-4 h-4" />
      </button>
    </div>

    <div class="flex-1 overflow-auto relative scrollbar-thin bg-white">
      <div v-if="isProcessing" class="absolute inset-0 flex items-center justify-center">
        <span class="text-white/20 text-xs animate-pulse">GENERATING ATLAS...</span>
      </div>

      <div
        v-else
        class="relative w-max border border-white/5 cursor-pointer my-10"
        @mousedown="onContainerMouseDown"
        @mousemove="onContainerMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <img
          :src="processedImageUrl"
          class="block pixelated pointer-events-none"
          :class="{ 'opacity-50': isEditMode }"
          draggable="false"
        />

        <div class="absolute inset-0 pointer-events-none opacity-10 grid-48"></div>

        <!-- Selection Rectangle (Only in Select Mode) -->
        <div
          v-if="!isEditMode && selectionStyle"
          :style="selectionStyle"
          class="absolute border-2 border-black z-10 shadow-[0_0_10px_rgba(0,0,0,0.3)] transition-all duration-75"
        >
          <div
            v-if="store.selection?.isAutotile"
            class="absolute top-0 left-0 bg-black text-white text-[7px] px-1 font-bold"
          >
            AUTO
          </div>
        </div>

        <!-- Edit Mode Overlays -->
        <template v-if="isEditMode">
          <template v-if="store.activeTab === 'A'">
            <!-- Tab A: Iterate over iconMapping to draw overlays at correct UI positions -->
            <template v-for="map in iconMapping" :key="`${map.uiX}_${map.uiY}`">
              <div
                v-if="store.tilesetConfigs[map.tilesetId]?.[`${map.ox}_${map.oy}`]?.isSolid"
                class="absolute flex items-center justify-center pointer-events-none"
                :style="{
                  left: `${map.uiX * 48}px`,
                  top: `${map.uiY * 48}px`,
                  width: '48px',
                  height: '48px'
                }"
              >
                <IconX class="text-red-500 w-8 h-8 drop-shadow-md stroke-3" />
              </div>
              <div
                v-if="store.tilesetConfigs[map.tilesetId]?.[`${map.ox}_${map.oy}`]?.isHighPriority"
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
              <!-- Mask Indicator -->
              <div
                v-if="store.tilesetConfigs[map.tilesetId]?.[`${map.ox}_${map.oy}`]?.collisionMask"
                class="absolute bottom-0 right-0 w-2 h-2 bg-purple-500 rounded-full m-1 pointer-events-none"
              ></div>
            </template>
          </template>

          <template v-else>
            <!-- Single Tileset (B-E): Iterate existing configs and show them -->
            <!-- We filter out configs that are outside the current atlas bounds to avoid phantom icons -->
            <template v-for="(config, key) in store.tilesetConfigs[store.activeTab]" :key="key">
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
                  <IconX class="text-red-500 w-8 h-8 drop-shadow-md stroke-3" />
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
                <!-- Mask Indicator -->
                <div
                  v-if="config.collisionMask"
                  class="absolute bottom-0 right-0 w-2 h-2 bg-purple-500 rounded-full m-1 pointer-events-none"
                  :style="{
                    left: `${parseInt(key.split('_')[0]) * 48}px`, // Need left/top for absolute positioning if not nested in div
                    top: `${parseInt(key.split('_')[1]) * 48}px`
                  }"
                ></div>
              </template>
            </template>
          </template>
        </template>
      </div>
    </div>

    <div class="absolute bottom-0 left-0 w-full flex p-2 max-w-[calc(100%-8px)]">
      <div
        class="relative flex gap-2 w-full bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden py-1"
      >
        <div
          class="absolute top-0 bottom-0 bg-black rounded-xl transition-all duration-300 ease-out z-0"
          :style="highlightStyle"
        ></div>
        <button
          v-for="tab in TABS"
          :key="tab"
          ref="tabRefs"
          :class="[
            'relative flex-1 py-1 text-xs font-bold rounded-xl cursor-pointer z-10 transition-colors duration-200',
            store.activeTab === tab ? 'text-white' : 'text-black hover:text-black/50'
          ]"
          @click="store.activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <!-- Modals -->
    <CollisionEditor
      v-if="showCollisionEditor && editingTile"
      :tileset-id="editingTile.id"
      :tile-x="editingTile.x"
      :tile-y="editingTile.y"
      :image-url="editingTile.url"
      @close="showCollisionEditor = false"
    />
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
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
  background: #121212;
  border-radius: 3px;
}
</style>
