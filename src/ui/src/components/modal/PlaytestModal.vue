<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import {
  IconX,
  IconRefresh,
  IconDeviceGamepad,
  IconMaximize,
  IconMinimize
} from '@tabler/icons-vue'
import { useEngine } from '@ui/composables/useEngine'

const store = useEditorStore()
const canvasContainer = ref<HTMLElement | null>(null)
const isVisible = ref(false)
const isFullscreen = ref(false)

const { engine, initEngine, isLoading } = useEngine(canvasContainer, false)

const open = async (): Promise<void> => {
  isVisible.value = true
  store.isTestMode = true
  await nextTick()
  await initEngine()
}

const close = (): void => {
  isVisible.value = false
  store.isTestMode = false
  engine.value?.destroy()
  engine.value = null
}

const reload = async (): Promise<void> => {
  await initEngine()
}

const toggleFullscreen = (): void => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
      isFullscreen.value = false
    }
  }
}

defineExpose({ open, close })

// Resolution and Scaling
const containerStyle = computed(() => ({
  width: `${store.systemScreenWidth}px`,
  height: `${store.systemScreenHeight}px`
}))

const resolutionLabel = computed(() => `${store.systemScreenWidth}x${store.systemScreenHeight}`)

// Handle Shift + ESC key to close
const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && e.shiftKey && isVisible.value) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (engine.value) {
    engine.value.destroy()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-3000 flex flex-col bg-black/90 backdrop-blur-xl transition-all duration-500 pointer-events-auto"
      >
        <!-- Premium Header -->
        <header
          class="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/5 backdrop-blur-md"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center border border-green-500/20 shadow-lg shadow-green-500/10"
            >
              <IconDeviceGamepad :size="20" stroke-width="2.5" />
            </div>
            <div>
              <h2 class="text-sm font-black uppercase tracking-[0.2em] text-white">
                Playtest Mode
              </h2>
              <p class="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
                Active Resolution: <span class="text-white/60">{{ resolutionLabel }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              @click="reload"
            >
              <IconRefresh :size="14" stroke-width="3" :class="{ 'animate-spin': isLoading }" />
              Reload
            </button>

            <div class="w-px h-6 bg-white/5 mx-2"></div>

            <button
              class="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              @click="toggleFullscreen"
            >
              <component :is="isFullscreen ? IconMinimize : IconMaximize" :size="20" />
            </button>

            <button
              class="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 hover:scale-110 active:scale-90 transition-all ml-2"
              @click="close"
            >
              <IconX :size="20" stroke-width="3" />
            </button>
          </div>
        </header>

        <!-- Viewport Area -->
        <main class="flex-1 flex items-center justify-center overflow-hidden p-8 relative">
          <!-- Letterbox Container -->
          <div
            class="relative bg-black shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden transition-transform duration-300"
            style="image-rendering: pixelated"
            :style="containerStyle"
          >
            <div ref="canvasContainer" class="w-full h-full flex items-center justify-center"></div>

            <!-- Loading Overlay -->
            <Transition name="fade-fast">
              <div
                v-if="isLoading"
                class="absolute inset-0 z-60 flex flex-col items-center justify-center bg-black backdrop-blur-md"
              >
                <div
                  class="w-12 h-12 border-4 border-white/10 border-t-green-500 rounded-full animate-spin mb-4"
                ></div>
                <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white/60"
                  >Initializing Engine</span
                >
              </div>
            </Transition>
          </div>

          <!-- Hint -->
          <div
            class="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-medium text-white/20 uppercase tracking-[0.2em] pointer-events-none"
          >
            Press Shift + ESC to Exit Playtest
          </div>
        </main>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-fast-enter-active {
  transition: opacity 0.1s ease;
}
.fade-fast-leave-active {
  transition: opacity 0.8s ease; /* Long leave to hide potential flashing */
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

:deep(canvas) {
  display: block;
  image-rendering: pixelated;
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
}
</style>
