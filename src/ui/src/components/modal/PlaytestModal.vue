<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import {
  IconX,
  IconRefresh,
  IconDeviceGamepad,
  IconMaximize,
  IconMinimize,
  IconKeyboard
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

const containerStyle = computed(() => ({
  width: `${store.systemScreenWidth}px`,
  height: `${store.systemScreenHeight}px`
}))

const resolutionLabel = computed(() => `${store.systemScreenWidth}x${store.systemScreenHeight}`)

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
  if (engine.value) engine.value.destroy()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="playtest">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-[3000] flex flex-col bg-slate-950 transition-all duration-500 pointer-events-auto overflow-hidden"
      >
        <div class="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[160px]"
          />
          <div
            class="absolute inset-0 opacity-[0.03]"
            style="
              background-image: radial-gradient(#fff 1px, transparent 0);
              background-size: 40px 40px;
            "
          />
        </div>

        <header
          class="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-2xl relative z-10"
        >
          <div class="flex items-center gap-5">
            <div
              class="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20"
            >
              <IconDeviceGamepad :size="22" stroke-width="2" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-black uppercase tracking-tighter text-white">
                  InvArts Engine <span class="text-indigo-400">Playtest</span>
                </h2>
                <span
                  class="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black text-indigo-400 uppercase tracking-widest"
                  >Live</span
                >
              </div>
              <p class="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mt-1">
                Resolution: <span class="text-white/60 font-mono">{{ resolutionLabel }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center bg-white/5 p-1 rounded-2xl border border-white/5">
              <button
                class="px-5 py-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
                @click="reload"
              >
                <IconRefresh :size="14" stroke-width="3" :class="{ 'animate-spin': isLoading }" />
                Restart Scene
              </button>

              <div class="w-px h-4 bg-white/10 mx-1"></div>

              <button
                class="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                @click="toggleFullscreen"
                v-tooltip="'Toggle Fullscreen'"
              >
                <component :is="isFullscreen ? IconMinimize : IconMaximize" :size="18" />
              </button>
            </div>

            <button
              class="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-rose-500 text-white/40 hover:text-white border border-white/10 rounded-2xl transition-all duration-300 group"
              @click="close"
            >
              <IconX
                :size="20"
                stroke-width="3"
                class="group-hover:rotate-90 transition-transform"
              />
            </button>
          </div>
        </header>

        <main class="flex-1 flex items-center justify-center p-12 relative z-10">
          <div
            class="relative bg-black rounded-lg shadow-[0_48px_100px_-24px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden transition-transform duration-500"
            style="image-rendering: pixelated"
            :style="containerStyle"
          >
            <div ref="canvasContainer" class="w-full h-full flex items-center justify-center"></div>

            <Transition name="fade-fast">
              <div
                v-if="isLoading"
                class="absolute inset-0 z-60 flex flex-col items-center justify-center bg-slate-950"
              >
                <div class="relative w-16 h-16 mb-6">
                  <div class="absolute inset-0 rounded-full border-4 border-indigo-500/10"></div>
                  <div
                    class="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"
                  ></div>
                </div>
                <span
                  class="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 animate-pulse"
                  >Booting Engine...</span
                >
              </div>
            </Transition>
          </div>

          <div
            class="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl pointer-events-none"
          >
            <IconKeyboard size="14" class="text-white/20" />
            <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Press <span class="text-white/70">Shift + ESC</span> to Return to Editor
            </span>
          </div>
        </main>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.playtest-enter-active,
.playtest-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.playtest-enter-from {
  opacity: 0;
  transform: scale(1.05);
  filter: blur(20px);
}

.playtest-leave-to {
  opacity: 0;
  transform: scale(0.95);
  filter: blur(20px);
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.4s ease;
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
