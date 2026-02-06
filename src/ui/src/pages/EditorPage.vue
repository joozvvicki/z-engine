<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEditorStore } from '@ui/stores/editor'
import { ZLayer } from '@engine/types'
import { IconMap, IconLayoutGrid } from '@tabler/icons-vue' // Dodano ikony

// Components
import EditorBar from '@ui/components/EditorBar.vue'
import GameViewport from '@ui/components/GameViewport.vue'
import MapTree from '@ui/components/MapTree.vue'
import TilesetSelector from '@ui/components/TilesetSelector.vue'
import StatusBar from '@ui/components/StatusBar.vue'
import LayerQuickSwitch from '@ui/components/LayerQuickSwitch.vue'
import BuildGameModal from '@ui/components/BuildGameModal.vue'
import PlaytestModal from '@ui/components/modal/PlaytestModal.vue'

const store = useEditorStore()
const route = useRoute()
const router = useRouter()

// Layout State
const sidebarWidth = ref(438)
const isResizing = ref(false)

// Modals State
const buildModal = ref<InstanceType<typeof BuildGameModal> | null>(null)
const playtestModal = ref<InstanceType<typeof PlaytestModal> | null>(null)

// --- NAVIGATION LOGIC ---
const activeSidebarTab = computed(() => {
  if (route.path.includes('/editor/maps')) return 'maps'
  return 'assets'
})

const switchTab = (tab: 'maps' | 'assets'): void => {
  // Prosta nawigacja - zmienia URL, co triggeruje computed 'activeSidebarTab'
  if (tab === 'maps') router.push('/editor/maps')
  else router.push('/editor')
}

// --- MODAL HANDLERS ---
const handleOpenBuild = (): void => buildModal.value?.open()
const handleTogglePlay = (): void => {
  if (store.isTestMode) {
    playtestModal.value?.close()
  } else {
    playtestModal.value?.open()
  }
}

// --- RESIZING LOGIC ---
const startResizing = (): void => {
  isResizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResizing)
}

const handleMouseMove = (e: MouseEvent): void => {
  if (isResizing.value) {
    sidebarWidth.value = Math.max(240, Math.min(500, e.clientX))
  }
}

const stopResizing = (): void => {
  isResizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResizing)
}

// --- KEYBOARD SHORTCUTS ---
const handleKeyDown = (e: KeyboardEvent): void => {
  if (store.isTestMode) return
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  // Layer Switching (Shift + 1-4)
  if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
    const layerKeys: ZLayer[] = [ZLayer.ground, ZLayer.walls, ZLayer.decoration, ZLayer.highest]
    const num = parseInt(e.key)
    if (num >= 1 && num <= 4) store.setLayer(layerKeys[num - 1])
  }

  // Map Cycling (Alt + Up/Down)
  if (e.altKey && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault()
    const allMaps = store.maps
    if (allMaps.length <= 1) return
    const currentIndex = allMaps.findIndex((m) => m.id === store.activeMapID)
    let nextIndex =
      e.key === 'ArrowUp'
        ? currentIndex <= 0
          ? allMaps.length - 1
          : currentIndex - 1
        : currentIndex >= allMaps.length - 1
          ? 0
          : currentIndex + 1

    if (allMaps[nextIndex]) store.activeMapID = allMaps[nextIndex].id
  }
}

onMounted(() => window.addEventListener('keydown', handleKeyDown))
onUnmounted(() => {
  stopResizing()
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
    <div class="flex flex-1 min-h-0 relative">
      <div
        class="relative flex flex-col bg-slate-50/80 border-r border-slate-200 z-20"
        :style="{ width: sidebarWidth + 'px' }"
      >
        <div class="px-4 pt-4 pb-2 shrink-0">
          <div class="flex p-1 bg-slate-200/60 rounded-xl">
            <button
              class="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all duration-200"
              :class="
                activeSidebarTab === 'maps'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              "
              @click="switchTab('maps')"
            >
              <IconMap :size="14" stroke-width="2.5" />
              <span>Maps</span>
            </button>

            <button
              class="flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-lg transition-all duration-200"
              :class="
                activeSidebarTab === 'assets'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              "
              @click="switchTab('assets')"
            >
              <IconLayoutGrid :size="14" stroke-width="2.5" />
              <span>Tiles</span>
            </button>
          </div>
        </div>

        <aside class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Transition name="fade-slide" mode="out-in">
            <div v-if="activeSidebarTab === 'assets'" class="absolute inset-0 px-2 pb-2">
              <TilesetSelector />
            </div>
            <div v-else-if="activeSidebarTab === 'maps'" class="absolute inset-0">
              <MapTree />
            </div>
          </Transition>
        </aside>

        <div
          class="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize group z-50 flex items-center justify-center hover:bg-blue-500/10 transition-colors"
          @mousedown="startResizing"
        >
          <div
            class="h-8 w-1 bg-slate-300 rounded-full group-hover:bg-blue-500 group-hover:scale-y-125 transition-all"
          ></div>
        </div>
      </div>

      <main class="flex-1 relative flex flex-col bg-slate-100 overflow-hidden shadow-inner">
        <div
          class="absolute inset-0 pointer-events-none opacity-[0.3]"
          style="
            background-image: radial-gradient(#94a3b8 1px, transparent 1px);
            background-size: 20px 20px;
          "
        ></div>

        <div class="flex-1 relative w-full h-full">
          <GameViewport />

          <div
            class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-3 pointer-events-none z-30"
          >
            <div
              class="pointer-events-auto bg-white/80 backdrop-blur-md border border-white/40 p-1.5 rounded-2xl shadow-lg shadow-slate-400/20"
            >
              <LayerQuickSwitch />
            </div>

            <div
              class="pointer-events-auto bg-white/80 backdrop-blur-md border border-white/40 p-1.5 rounded-2xl shadow-lg shadow-slate-400/20"
            >
              <EditorBar @open-build="handleOpenBuild" @toggle-play="handleTogglePlay" />
            </div>
          </div>
        </div>
      </main>
    </div>

    <StatusBar class="z-30 border-t border-slate-200 bg-white" />

    <BuildGameModal ref="buildModal" />
    <PlaytestModal ref="playtestModal" />
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-5px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(5px);
}
</style>
