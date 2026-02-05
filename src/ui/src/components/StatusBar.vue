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
  IconAlignLeft
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

// Cursor coordinates from store
const coords = computed(() => ({ x: store.cursorX, y: store.cursorY }))

// MenuRefs for click outside logic
const mapMenuRef = ref<HTMLElement | null>(null)
const layerMenuRef = ref<HTMLElement | null>(null)
const zoomMenuRef = ref<HTMLElement | null>(null)

// Map Jump Logic
const isMapMenuOpen = ref(false)
const toggleMapMenu = (): void => {
  isMapMenuOpen.value = !isMapMenuOpen.value
  isLayerMenuOpen.value = false
}
const selectMap = (id: number): void => {
  store.activeMapID = id
  isMapMenuOpen.value = false
}

// Layer Switch Logic
const isLayerMenuOpen = ref(false)
const layers = Object.values(ZLayer)
const toggleLayerMenu = (): void => {
  isLayerMenuOpen.value = !isLayerMenuOpen.value
  isMapMenuOpen.value = false
  isZoomMenuOpen.value = false
}
const selectLayer = (layer: ZLayer): void => {
  store.activeLayer = layer
  isLayerMenuOpen.value = false
}

// Zoom Menu Logic
const isZoomMenuOpen = ref(false)
const zoomOptions = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
const toggleZoomMenu = (): void => {
  isZoomMenuOpen.value = !isZoomMenuOpen.value
  isMapMenuOpen.value = false
  isLayerMenuOpen.value = false
}
const selectZoom = (z: number): void => {
  if (store.activeMapID !== null) {
    const currentState = store.mapViewportStates[store.activeMapID]
    store.mapViewportStates[store.activeMapID] = {
      scale: z,
      pan: currentState?.pan || { x: 0, y: 0 }
    }
  }
  isZoomMenuOpen.value = false
}

const toggleMapAlignment = (): void => {
  store.mapAlignment = store.mapAlignment === 'center' ? 'top-left' : 'center'
}

const handleClickOutside = (e: MouseEvent): void => {
  const target = e.target as Node
  if (mapMenuRef.value && !mapMenuRef.value.contains(target)) {
    isMapMenuOpen.value = false
  }
  if (layerMenuRef.value && !layerMenuRef.value.contains(target)) {
    isLayerMenuOpen.value = false
  }
  if (zoomMenuRef.value && !zoomMenuRef.value.contains(target)) {
    isZoomMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div
    class="h-8 bg-white border-t border-black/5 px-4 flex items-center justify-between text-[10px] font-bold tracking-tight text-black/40 z-50 relative"
  >
    <div class="flex items-center gap-6 h-full">
      <!-- Coordinates -->
      <div class="flex items-center gap-2 group cursor-default">
        <IconCrosshair :size="12" class="text-black/20 group-hover:text-black transition-colors" />
        <span class="font-mono text-black/60">{{ coords.x }}, {{ coords.y }}</span>
      </div>

      <!-- Map Info (Quick Jump) -->
      <div ref="mapMenuRef" class="relative h-full flex items-center">
        <button
          class="flex items-center gap-2 group cursor-pointer h-full px-2 -mx-2 hover:bg-black/3 transition-colors"
          @click="toggleMapMenu"
        >
          <IconMapPin
            :size="12"
            :class="[isMapMenuOpen ? 'text-black' : 'text-black/20 group-hover:text-black']"
            class="transition-colors"
          />
          <span
            :class="[isMapMenuOpen ? 'text-black' : 'text-black/60']"
            class="flex items-center gap-1"
          >
            {{ currentMapName }}
            <span class="opacity-30">#{{ currentMapId }}</span>
            <IconChevronUp
              :size="10"
              class="transition-transform duration-200"
              :class="{ 'rotate-180': isMapMenuOpen }"
            />
          </span>
        </button>

        <!-- Quick Jump Menu -->
        <Transition name="slide-up">
          <div
            v-if="isMapMenuOpen"
            class="absolute bottom-full left-0 mb-2 w-48 bg-white border border-black/5 rounded-xl shadow-2xl py-2 overflow-hidden flex flex-col"
          >
            <div
              class="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-black/20 border-b border-black/5 mb-1"
            >
              Quick Jump
            </div>
            <div class="max-h-48 overflow-y-auto">
              <button
                v-for="map in store.maps"
                :key="map.id"
                class="w-full text-left px-3 py-2 hover:bg-black/5 flex items-center justify-between group transition-colors cursor-pointer"
                :class="{ 'bg-black/2': store.activeMapID === map.id }"
                @click="selectMap(map.id)"
              >
                <span
                  class="text-[10px] font-bold truncate transition-colors"
                  :class="[
                    store.activeMapID === map.id
                      ? 'text-black'
                      : 'text-black/60 group-hover:text-black'
                  ]"
                >
                  {{ map.name }}
                </span>
                <span class="text-[8px] opacity-20 font-mono tracking-tighter">#{{ map.id }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Active Layer Indicator (Layer Switcher) -->
      <div ref="layerMenuRef" class="relative h-full flex items-center">
        <button
          class="flex items-center gap-2 group cursor-pointer h-full px-2 -mx-2 hover:bg-black/3 transition-colors"
          @click="toggleLayerMenu"
        >
          <IconLayersIntersect
            :size="12"
            :class="[isLayerMenuOpen ? 'text-black' : 'text-black/20 group-hover:text-black']"
            class="transition-colors"
          />
          <span
            :class="[isLayerMenuOpen ? 'text-black' : 'text-black/60']"
            class="flex items-center gap-1 uppercase tracking-tighter"
          >
            {{ activeLayerName }}
            <IconChevronUp
              :size="10"
              class="transition-transform duration-200"
              :class="{ 'rotate-180': isLayerMenuOpen }"
            />
          </span>
        </button>

        <!-- Layer Selection Menu -->
        <Transition name="slide-up">
          <div
            v-if="isLayerMenuOpen"
            class="absolute bottom-full left-0 mb-2 w-40 bg-white border border-black/5 rounded-xl shadow-2xl py-2 overflow-hidden flex flex-col"
          >
            <div
              class="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-black/20 border-b border-black/5 mb-1"
            >
              Select Layer
            </div>
            <div class="max-h-48 overflow-y-auto">
              <button
                v-for="layer in layers"
                :key="layer"
                class="w-full text-left px-3 py-2 hover:bg-black/5 flex items-center justify-between group transition-colors cursor-pointer"
                :class="{ 'bg-black/2': store.activeLayer === layer }"
                @click="selectLayer(layer)"
              >
                <span
                  class="text-[10px] font-bold truncate uppercase tracking-tighter transition-colors"
                  :class="[
                    store.activeLayer === layer
                      ? 'text-black'
                      : 'text-black/60 group-hover:text-black'
                  ]"
                >
                  {{ layer }}
                </span>
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Zoom Dropdown -->
      <div ref="zoomMenuRef" class="relative h-full flex items-center border-l border-black/5 pl-6">
        <button
          class="flex items-center gap-2 group cursor-pointer h-full px-2 -mx-2 hover:bg-black/3 transition-colors"
          @click="toggleZoomMenu"
        >
          <IconMaximize
            :size="12"
            :class="[isZoomMenuOpen ? 'text-black' : 'text-black/20 group-hover:text-black']"
            class="transition-colors"
          />
          <span
            :class="[isZoomMenuOpen ? 'text-black' : 'text-black/60']"
            class="flex items-center gap-1 font-mono"
          >
            {{ currentZoom }}%
            <IconChevronUp
              :size="10"
              class="transition-transform duration-200"
              :class="{ 'rotate-180': isZoomMenuOpen }"
            />
          </span>
        </button>

        <!-- Zoom Selection Menu -->
        <Transition name="slide-up">
          <div
            v-if="isZoomMenuOpen"
            class="absolute bottom-full left-0 mb-2 w-32 bg-white border border-black/5 rounded-xl shadow-2xl py-2 overflow-hidden flex flex-col"
          >
            <div
              class="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-black/20 border-b border-black/5 mb-1"
            >
              Zoom Level
            </div>
            <div class="max-h-48 overflow-y-auto">
              <button
                v-for="z in zoomOptions"
                :key="z"
                class="w-full text-left px-3 py-2 hover:bg-black/5 flex items-center justify-between group transition-colors cursor-pointer"
                :class="{ 'bg-black/2': currentZoom === Math.round(z * 100) }"
                @click="selectZoom(z)"
              >
                <span
                  class="text-[10px] font-bold font-mono transition-colors"
                  :class="[
                    currentZoom === Math.round(z * 100)
                      ? 'text-black'
                      : 'text-black/60 group-hover:text-black'
                  ]"
                >
                  {{ Math.round(z * 100) }}%
                </span>
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Alignment Toggle -->
      <div class="flex items-center gap-2 group cursor-default border-l border-black/5 pl-6">
        <button
          class="flex items-center gap-2 group cursor-pointer h-full px-2 -mx-2 hover:bg-black/3 transition-colors"
          title="Map Alignment"
          @click="toggleMapAlignment"
        >
          <component
            :is="store.mapAlignment === 'center' ? IconFocus2 : IconAlignLeft"
            :size="12"
            class="text-black/60 group-hover:text-black transition-colors"
          />
          <span class="text-black/60 uppercase tracking-tighter">{{ store.mapAlignment }}</span>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2 max-w-[40%] group cursor-default">
      <IconFolder :size="12" class="text-black/20 group-hover:text-black transition-colors" />
      <span class="truncate opacity-60 font-mono group-hover:opacity-100 transition-opacity">{{
        projectPath
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
