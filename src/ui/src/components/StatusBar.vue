<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { ProjectService } from '@ui/services/ProjectService'
import { ZLayer } from '@engine/types'
import {
  IconMapPin,
  IconMaximize,
  IconFolder,
  IconCrosshair,
  IconLayersIntersect,
  IconChevronUp,
  IconFocus2,
  IconAlignLeft,
  IconCheck
} from '@tabler/icons-vue'

const store = useEditorStore()

const currentMapName = computed(() => store.activeMap?.name || 'No Map')
const currentMapId = computed(() => store.activeMapID || '-')
const projectPath = computed(() => ProjectService.currentPath || 'None')
const activeLayerName = computed(() => store.activeLayer)

const currentZoom = computed(() => {
  const state = store.mapViewportStates[store.activeMapID as number]
  return state ? Math.round(state.scale * 100) : 100
})

// Cursor coordinates
const coords = computed(() => ({ x: store.cursorX, y: store.cursorY }))

// Refs
const mapMenuRef = ref<HTMLElement | null>(null)
const layerMenuRef = ref<HTMLElement | null>(null)
const zoomMenuRef = ref<HTMLElement | null>(null)

// Toggles
const isMapMenuOpen = ref(false)
const isLayerMenuOpen = ref(false)
const isZoomMenuOpen = ref(false)

const closeAllMenus = () => {
  isMapMenuOpen.value = false
  isLayerMenuOpen.value = false
  isZoomMenuOpen.value = false
}

const toggleMapMenu = () => {
  const wasOpen = isMapMenuOpen.value
  closeAllMenus()
  isMapMenuOpen.value = !wasOpen
}
const toggleLayerMenu = () => {
  const wasOpen = isLayerMenuOpen.value
  closeAllMenus()
  isLayerMenuOpen.value = !wasOpen
}
const toggleZoomMenu = () => {
  const wasOpen = isZoomMenuOpen.value
  closeAllMenus()
  isZoomMenuOpen.value = !wasOpen
}

// Actions
const selectMap = (id: number) => {
  store.activeMapID = id
  closeAllMenus()
}
const selectLayer = (layer: ZLayer) => {
  store.activeLayer = layer
  closeAllMenus()
}
const selectZoom = (z: number) => {
  if (store.activeMapID !== null) {
    const currentState = store.mapViewportStates[store.activeMapID]
    store.mapViewportStates[store.activeMapID] = {
      scale: z,
      pan: currentState?.pan || { x: 0, y: 0 }
    }
  }
  closeAllMenus()
}
const toggleMapAlignment = () => {
  store.mapAlignment = store.mapAlignment === 'center' ? 'top-left' : 'center'
}

// Click Outside
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as Node
  if (mapMenuRef.value && !mapMenuRef.value.contains(target)) isMapMenuOpen.value = false
  if (layerMenuRef.value && !layerMenuRef.value.contains(target)) isLayerMenuOpen.value = false
  if (zoomMenuRef.value && !zoomMenuRef.value.contains(target)) isZoomMenuOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))

// Options
const layers = Object.values(ZLayer)
const zoomOptions = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
</script>

<template>
  <div
    class="h-9 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[10px] font-bold tracking-tight text-slate-500 z-50 relative select-none"
  >
    <div class="flex items-center gap-2 h-full">
      <div class="flex items-center gap-2 px-2 h-full border-r border-slate-100 min-w-[80px]">
        <IconCrosshair :size="14" class="text-slate-300" />
        <span class="font-mono text-slate-700">{{ coords.x }}, {{ coords.y }}</span>
      </div>

      <div ref="mapMenuRef" class="relative h-full flex items-center">
        <button
          class="flex items-center gap-2 h-full px-3 hover:bg-slate-50 rounded transition-colors group text-slate-600 hover:text-slate-900"
          :class="{ 'bg-slate-50 text-slate-900': isMapMenuOpen }"
          @click="toggleMapMenu"
        >
          <IconMapPin
            :size="14"
            class="text-slate-400 group-hover:text-blue-500 transition-colors"
          />
          <div class="flex flex-col items-start leading-none gap-0.5">
            <span>{{ currentMapName }}</span>
            <span class="text-[8px] text-slate-400 font-mono">ID:{{ currentMapId }}</span>
          </div>
          <IconChevronUp
            :size="10"
            class="ml-1 text-slate-300 transition-transform duration-200"
            :class="{ 'rotate-180': isMapMenuOpen }"
          />
        </button>

        <Transition name="slide-up">
          <div v-if="isMapMenuOpen" class="menu-popup w-56">
            <div class="menu-header">Quick Jump</div>
            <div class="max-h-64 overflow-y-auto custom-scrollbar p-1">
              <button
                v-for="map in store.maps"
                :key="map.id"
                class="menu-item"
                :class="{ active: store.activeMapID === map.id }"
                @click="selectMap(map.id)"
              >
                <span class="truncate flex-1">{{ map.name }}</span>
                <span class="font-mono text-slate-300 text-[9px]">#{{ map.id }}</span>
                <IconCheck
                  v-if="store.activeMapID === map.id"
                  :size="12"
                  class="text-blue-500 ml-2"
                />
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <div class="w-px h-4 bg-slate-200 mx-1"></div>

      <div ref="layerMenuRef" class="relative h-full flex items-center">
        <button
          class="flex items-center gap-2 h-full px-3 hover:bg-slate-50 rounded transition-colors group text-slate-600 hover:text-slate-900"
          :class="{ 'bg-slate-50 text-slate-900': isLayerMenuOpen }"
          @click="toggleLayerMenu"
        >
          <IconLayersIntersect
            :size="14"
            class="text-slate-400 group-hover:text-blue-500 transition-colors"
          />
          <span class="uppercase tracking-widest">{{ activeLayerName }}</span>
          <IconChevronUp
            :size="10"
            class="ml-1 text-slate-300 transition-transform duration-200"
            :class="{ 'rotate-180': isLayerMenuOpen }"
          />
        </button>

        <Transition name="slide-up">
          <div v-if="isLayerMenuOpen" class="menu-popup w-40">
            <div class="menu-header">Active Layer</div>
            <div class="p-1">
              <button
                v-for="layer in layers"
                :key="layer"
                class="menu-item capitalize"
                :class="{ active: store.activeLayer === layer }"
                @click="selectLayer(layer)"
              >
                {{ layer }}
                <IconCheck
                  v-if="store.activeLayer === layer"
                  :size="12"
                  class="text-blue-500 ml-auto"
                />
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <div ref="zoomMenuRef" class="relative h-full flex items-center">
        <button
          class="flex items-center gap-2 h-full px-3 hover:bg-slate-50 rounded transition-colors group text-slate-600 hover:text-slate-900"
          :class="{ 'bg-slate-50 text-slate-900': isZoomMenuOpen }"
          @click="toggleZoomMenu"
        >
          <IconMaximize
            :size="14"
            class="text-slate-400 group-hover:text-blue-500 transition-colors"
          />
          <span class="font-mono">{{ currentZoom }}%</span>
        </button>

        <Transition name="slide-up">
          <div v-if="isZoomMenuOpen" class="menu-popup w-32 left-0">
            <div class="menu-header">Zoom Level</div>
            <div class="p-1">
              <button
                v-for="z in zoomOptions"
                :key="z"
                class="menu-item font-mono"
                :class="{ active: currentZoom === Math.round(z * 100) }"
                @click="selectZoom(z)"
              >
                {{ Math.round(z * 100) }}%
                <IconCheck
                  v-if="currentZoom === Math.round(z * 100)"
                  :size="12"
                  class="text-blue-500 ml-auto"
                />
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <button
        class="flex items-center gap-2 h-full px-3 hover:bg-slate-50 rounded transition-colors group text-slate-400 hover:text-slate-900 ml-2"
        title="Toggle Map Alignment (Center / Top-Left)"
        @click="toggleMapAlignment"
      >
        <component :is="store.mapAlignment === 'center' ? IconFocus2 : IconAlignLeft" :size="14" />
      </button>
    </div>

    <div class="flex items-center gap-4 max-w-[40%]">
      <div class="flex items-center gap-2 text-slate-400 group cursor-default" title="Project Path">
        <IconFolder :size="14" class="group-hover:text-slate-600 transition-colors" />
        <span class="truncate font-mono text-[9px] direction-rtl">{{ projectPath }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss';

.menu-popup {
  @apply absolute bottom-full mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col z-50;
  /* Ensure it doesn't get cut off */
  left: 0;
}

.menu-header {
  @apply px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/50;
}

.menu-item {
  @apply w-full text-left px-3 py-1.5 flex items-center text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors cursor-pointer;
}

.menu-item.active {
  @apply text-blue-600 bg-blue-50;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
</style>
