<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { useTilesetAtlas } from '@ui/composables/useTilesetAtlas'
import { ref, watch, nextTick } from 'vue'
import CollisionEditor from './modal/CollisionEditor.vue'

// Icons needed for overlays
import { IconX, IconStar } from '@tabler/icons-vue'

const store = useEditorStore()
const { processedImageUrl, isProcessing, iconMapping, GRID_SIZE } = useTilesetAtlas()

// Collision Editor State
const showCollisionEditor = ref(false)
const editingTile = ref<{ id: string; x: number; y: number; url: string } | null>(null)

const openCollisionEditor = (id: string, x: number, y: number) => {
  editingTile.value = {
    id,
    x,
    y,
    url: processedImageUrl.value // This might be full atlas URL, works for preview
  }
  showCollisionEditor.value = true
}

const handleTileClick = (e: MouseEvent) => {
  // Calculate grid coordinates
  const rect = (e.target as HTMLElement).closest('.relative')?.getBoundingClientRect()
  if (!rect) return

  const uiX = Math.floor((e.clientX - rect.left) / GRID_SIZE)
  const uiY = Math.floor((e.clientY - rect.top) / GRID_SIZE)

  if (uiX < 0 || uiY < 0) return

  let targetId = store.activeTab
  let targetX = uiX
  let targetY = uiY

  // For Tab A, we must lookup the source in iconMapping
  if (store.activeTab === 'A') {
    const mapping = iconMapping.value.find((m) => m.uiX === uiX && m.uiY === uiY)
    if (!mapping) return // Clicked empty space in atlas?
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
  // Else (if HighPriority) -> go back to Passable (false, false)

  store.updateTileConfig(targetId, targetX, targetY, nextConfig)
}

// Reuse Tabs Logic
const TABS = ['A', 'B', 'C', 'D', 'Roofs']
const tabRefs = ref<HTMLElement[]>([])
const highlightStyle = ref({ left: '0px', width: '0px' })

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
</script>

<template>
  <div
    class="flex relative flex-col h-full border-l border-white/5 select-none rounded-xl overflow-hidden bg-gray-900"
  >
    <!-- Toolbar / Instructions -->
    <div class="p-2 text-xs text-white/50 text-center border-b border-white/5">
      Click tiles to toggle: <span class="text-green-400">O (Pass)</span> ->
      <span class="text-red-400">X (Block)</span> -> <span class="text-yellow-400">★ (Above)</span>
      <br /><span class="text-xs opacity-50">Shift+Click for Pixel Mask</span>
    </div>

    <div class="flex-1 overflow-auto relative scrollbar-thin bg-white/5">
      <div v-if="isProcessing" class="absolute inset-0 flex items-center justify-center">
        <span class="text-white/20 text-xs animate-pulse">LOADING...</span>
      </div>

      <div
        v-else
        class="relative w-max border border-white/5 cursor-pointer"
        @mousedown="handleTileClick"
      >
        <!-- Background Image -->
        <img
          :src="processedImageUrl"
          class="block pixelated pointer-events-none opacity-50"
          draggable="false"
        />

        <!-- Grid Overlay -->
        <div class="absolute inset-0 pointer-events-none opacity-20 grid-48"></div>

        <!-- Overlays for Config -->
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
          <template v-for="(config, key) in store.tilesetConfigs[store.activeTab]" :key="key">
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
            ></div>
          </template>
        </template>
      </div>
    </div>

    <!-- Tab Bar (Copied from TilesetSelector) -->
    <div class="absolute bottom-0 left-0 w-full flex p-2 max-w-[calc(100%-8px)]">
      <div
        class="relative flex gap-2 w-full bg-white/20 backdrop-blur-lg rounded-xl overflow-hidden py-1"
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
            store.activeTab === tab ? 'text-white' : 'text-black/50 hover:text-black/80'
          ]"
          @click="store.activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </div>

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
    linear-gradient(to right, #fff 1px, transparent 1px),
    linear-gradient(to bottom, #fff 1px, transparent 1px);
  background-size: 48px 48px;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 3px;
}
</style>
