<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import {
  IconX,
  IconMusic,
  IconVolume,
  IconPlayerPlay,
  IconPlayerPause,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconTrash,
  IconFileInfo
} from '@tabler/icons-vue'

const props = defineProps<{
  file: string
  folder: string
  baseUrl: string
  allFiles: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'navigate', file: string): void
  (e: 'delete', file: string): void
}>()

const url = computed(() => props.baseUrl + props.file)
const isAudio = computed(() => {
  const ext = props.file.split('.').pop()?.toLowerCase() || ''
  return ['mp3', 'ogg', 'wav', 'm4a'].includes(ext)
})
const isImage = computed(() => {
  const ext = props.file.split('.').pop()?.toLowerCase() || ''
  return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)
})

// --- AUDIO LOGIC ---
const audio = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const duration = ref(0)
const currentTime = ref(0)

const togglePlay = (): void => {
  if (!audio.value) return
  isPlaying.value ? audio.value.pause() : audio.value.play()
}

const onTimeUpdate = () => {
  if (audio.value) currentTime.value = audio.value.currentTime
}
const onLoadedMetadata = () => {
  if (audio.value) duration.value = audio.value.duration
}
const onEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
}

const seek = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (audio.value) {
    audio.value.currentTime = parseFloat(target.value)
    currentTime.value = parseFloat(target.value)
  }
}

const formatTime = (time: number): string => {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Reset audio state when file changes
watch(
  () => props.file,
  () => {
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  }
)

// --- NAVIGATION ---
const currentIndex = computed(() => props.allFiles.indexOf(props.file))
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.allFiles.length - 1)

const prev = (): void => {
  if (hasPrev.value) emit('navigate', props.allFiles[currentIndex.value - 1])
}
const next = (): void => {
  if (hasNext.value) emit('navigate', props.allFiles[currentIndex.value + 1])
}

const handleDownload = (): void => {
  window.open(url.value, '_blank')
}

// --- KEYBOARD ---
const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
  if (e.key === ' ' && isAudio.value) {
    e.preventDefault()
    togglePlay()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-fade-in"
      @click.self="emit('close')"
    >
      <div
        class="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-50 pointer-events-none"
      >
        <div class="flex flex-col pointer-events-auto">
          <h2 class="text-white font-bold text-lg tracking-tight">{{ file }}</h2>
          <div class="flex items-center gap-2 text-slate-400 text-xs font-mono mt-0.5">
            <span class="uppercase">{{ folder.split('/').pop() }}</span>
            <span>•</span>
            <span class="uppercase">{{ file.split('.').pop() }}</span>
          </div>
        </div>

        <button
          class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all pointer-events-auto active:scale-95"
          @click="emit('close')"
        >
          <IconX size="20" />
        </button>
      </div>

      <div class="relative w-full h-full flex items-center justify-center p-12 md:p-20">
        <button
          v-if="hasPrev"
          class="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all active:scale-90 z-40"
          @click="prev"
        >
          <IconChevronLeft size="24" />
        </button>

        <button
          v-if="hasNext"
          class="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all active:scale-90 z-40"
          @click="next"
        >
          <IconChevronRight size="24" />
        </button>

        <div
          class="relative max-w-5xl max-h-full w-auto h-auto rounded-3xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 bg-slate-900 flex flex-col transition-all duration-300"
          @click.stop
        >
          <div v-if="isImage" class="relative group">
            <div class="absolute inset-0 checkerboard opacity-10"></div>

            <img
              :src="url"
              class="relative max-w-full max-h-[80vh] object-contain pixelated z-10"
              :alt="file"
            />

            <div
              class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              Image Preview
            </div>
          </div>

          <div v-else-if="isAudio" class="w-[500px] bg-slate-900 p-10 flex flex-col items-center">
            <div
              class="w-48 h-48 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-inner border border-white/5 flex items-center justify-center mb-10 relative group overflow-hidden"
            >
              <div
                class="absolute inset-0 bg-gradient-to-t from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
              ></div>
              <component
                :is="baseUrl.includes('bgm') ? IconMusic : IconVolume"
                size="64"
                class="text-slate-600 group-hover:text-blue-400 transition-colors relative z-10"
                stroke-width="1.5"
              />

              <div
                class="absolute bottom-0 left-0 right-0 h-full flex items-end justify-center gap-1 p-8 opacity-30"
              >
                <div
                  v-for="i in 8"
                  :key="i"
                  class="w-2 bg-blue-500 rounded-t-sm transition-all duration-300"
                  :class="isPlaying ? 'animate-bounce-custom' : 'h-2'"
                  :style="{ animationDelay: `${i * 0.1}s`, height: isPlaying ? '30%' : '4px' }"
                ></div>
              </div>
            </div>

            <audio
              ref="audio"
              :src="url"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onLoadedMetadata"
              @ended="onEnded"
            ></audio>

            <h3 class="text-xl font-bold text-white mb-1 truncate max-w-full">{{ file }}</h3>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8">
              Audio Asset
            </p>

            <div class="w-full mb-2 group">
              <input
                type="range"
                class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                min="0"
                :max="duration || 0"
                step="0.01"
                :value="currentTime"
                @input="seek"
              />
              <div
                class="flex justify-between mt-2 text-[10px] font-mono text-slate-500 font-medium"
              >
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(duration) }}</span>
              </div>
            </div>

            <div class="flex items-center gap-6 mt-4">
              <button
                class="w-16 h-16 rounded-full bg-white text-slate-900 hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-white/10"
                @click="togglePlay"
              >
                <component
                  :is="isPlaying ? IconPlayerPause : IconPlayerPlay"
                  size="28"
                  fill="currentColor"
                  class="ml-0.5"
                />
              </button>
            </div>
          </div>

          <div v-else class="p-20 text-center">
            <IconFileInfo size="64" class="text-slate-700 mx-auto mb-4" />
            <p class="text-slate-400 font-bold">Preview not available</p>
          </div>
        </div>
      </div>

      <div
        class="absolute bottom-0 left-0 right-0 h-20 px-8 border-t border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center justify-center gap-4 z-50"
      >
        <button
          class="h-10 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all border border-white/5"
          @click="handleDownload"
        >
          <IconDownload size="16" />
          Download
        </button>

        <div class="w-px h-8 bg-white/10 mx-2"></div>

        <button
          class="h-10 px-6 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-2 transition-all border border-red-500/20"
          @click="emit('delete', file)"
        >
          <IconTrash size="16" />
          Delete Asset
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.pixelated {
  image-rendering: pixelated;
}

.checkerboard {
  background-image:
    linear-gradient(45deg, #1e293b 25%, transparent 25%),
    linear-gradient(-45deg, #1e293b 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #1e293b 75%),
    linear-gradient(-45deg, transparent 75%, #1e293b 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
}

@keyframes bounce-custom {
  0%,
  100% {
    height: 10%;
  }
  50% {
    height: 60%;
  }
}

.animate-bounce-custom {
  animation: bounce-custom 1s infinite ease-in-out;
}

/* Range Input Styling */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  margin-top: -2px; /* Adjust centering if needed */
}
</style>
