<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import EditorBar from '@ui/components/EditorBar.vue'
import GameViewport from '@ui/components/GameViewport.vue'
import MapTree from '@ui/components/MapTree.vue'
import TilesetSelector from '@ui/components/TilesetSelector.vue'
import LayerPanel from '@ui/components/LayerPanel.vue'
import StatusBar from '@ui/components/StatusBar.vue'
import { IconPackage, IconMap, IconLayersIntersect } from '@tabler/icons-vue'

const sidebarWidth = ref(400)
const isResizing = ref(false)
const activeSidebarTab = ref<'assets' | 'maps' | 'layers'>('assets')

const startResizing = (): void => {
  isResizing.value = true
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResizing)
}

const handleMouseMove = (e: MouseEvent): void => {
  if (isResizing.value) {
    sidebarWidth.value = Math.max(300, Math.min(600, e.clientX))
  }
}

const stopResizing = (): void => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResizing)
}

onUnmounted(() => {
  stopResizing()
})

const tabs = [
  { id: 'assets', icon: IconPackage, label: 'Assets' },
  { id: 'maps', icon: IconMap, label: 'Maps' },
  { id: 'layers', icon: IconLayersIntersect, label: 'Layers' }
]
</script>

<template>
  <div class="flex flex-col h-screen w-full bg-[#f8f9fa] text-black font-sans overflow-hidden">
    <div class="flex flex-1 min-h-0 relative">
      <!-- Resizable Sidebar -->
      <aside
        class="relative flex flex-col bg-white border-r border-black/5 shadow-[20px_0_40px_rgba(0,0,0,0.02)] z-10"
        :style="{ width: sidebarWidth + 'px' }"
      >
        <!-- Sidebar Navigation -->
        <div class="flex border-b border-black/5 p-1 bg-black/[0.02]">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all cursor-pointer group"
            :class="
              activeSidebarTab === tab.id
                ? 'bg-white shadow-sm'
                : 'hover:bg-black/[0.03] opacity-40 hover:opacity-100'
            "
            @click="activeSidebarTab = tab.id as any"
          >
            <component
              :is="tab.icon"
              :size="20"
              :stroke-width="activeSidebarTab === tab.id ? 2.5 : 2"
            />
            <span class="text-[9px] font-black uppercase tracking-widest">{{ tab.label }}</span>
          </button>
        </div>

        <!-- Sidebar Content -->
        <div class="flex-1 overflow-hidden relative">
          <Transition name="fade-slide" mode="out-in">
            <div v-if="activeSidebarTab === 'assets'" class="absolute inset-0">
              <TilesetSelector />
            </div>
            <div v-else-if="activeSidebarTab === 'maps'" class="absolute inset-0">
              <MapTree />
            </div>
            <div v-else-if="activeSidebarTab === 'layers'" class="absolute inset-0">
              <LayerPanel />
            </div>
          </Transition>
        </div>

        <!-- Resize Handle -->
        <div
          class="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/10 active:bg-black/20 transition-colors z-20"
          @mousedown="startResizing"
        ></div>
      </aside>

      <!-- Main Editor Viewport -->
      <main class="flex-1 relative flex flex-col bg-[#f0f1f3]">
        <div class="flex-1 relative overflow-hidden">
          <GameViewport />
          <EditorBar />
        </div>
      </main>
    </div>

    <!-- Status Bar -->
    <StatusBar />
  </div>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
