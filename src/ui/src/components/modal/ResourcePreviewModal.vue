<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  IconX,
  IconMusic,
  IconVolume,
  IconPlayerPlay,
  IconPlayerPause,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconTrash
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

// Audio Logic
const audio = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const duration = ref(0)
const currentTime = ref(0)

const togglePlay = (): void => {
  if (!audio.value) return
  if (isPlaying.value) {
    audio.value.pause()
  } else {
    audio.value.play()
  }
}

const onTimeUpdate = (): void => {
  if (audio.value) {
    currentTime.value = audio.value.currentTime
  }
}

const onLoadedMetadata = (): void => {
  if (audio.value) {
    duration.value = audio.value.duration
  }
}

const seek = (e: Event): void => {
  const target = e.target as HTMLInputElement
  if (audio.value) {
    audio.value.currentTime = parseFloat(target.value)
  }
}

const formatTime = (time: number): string => {
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Navigation
const currentIndex = computed(() => props.allFiles.indexOf(props.file))
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.allFiles.length - 1)

const prev = (): void => {
  if (hasPrev.value) {
    emit('navigate', props.allFiles[currentIndex.value - 1])
  }
}

const next = (): void => {
  if (hasNext.value) {
    emit('navigate', props.allFiles[currentIndex.value + 1])
  }
}

const handleDownload = (): void => {
  window.open(url.value, '_blank')
}

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
  if (e.key === ' ') {
    if (isAudio.value) {
      e.preventDefault()
      togglePlay()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (audio.value) {
    audio.value.pause()
    audio.value.src = ''
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-12"
    @click.self="emit('close')"
  >
    <!-- Close Button -->
    <button
      class="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90"
      @click="emit('close')"
    >
      <IconX size="24" />
    </button>

    <!-- Content Container -->
    <div class="relative w-full max-w-5xl h-full flex flex-col gap-6">
      <!-- Media Area -->
      <div class="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        <!-- Image Preview -->
        <div
          v-if="isImage"
          class="flex-1 flex items-center justify-center overflow-auto p-12 bg-slate-50 relative group"
        >
          <img
            :src="url"
            class="max-w-full max-h-full object-contain pixelated shadow-xl transition-transform duration-300"
            alt="Preview"
          />

          <!-- Bottom Info Overlay -->
          <div
            class="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/80 backdrop-blur shadow-lg rounded-2xl border border-slate-100 flex items-center gap-4 text-xs font-bold text-slate-900 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span>{{ file }}</span>
            <div class="w-1 h-1 rounded-full bg-slate-200"></div>
            <span class="text-slate-400">Image Asset</span>
          </div>
        </div>

        <!-- Audio Preview -->
        <div
          v-else-if="isAudio"
          class="flex-1 flex flex-col items-center justify-center bg-slate-50 p-24"
        >
          <div
            class="relative w-64 h-64 bg-white rounded-[48px] shadow-2xl flex items-center justify-center mb-12 border border-slate-100 group"
          >
            <div
              class="absolute inset-0 bg-slate-900/5 rounded-[48px] scale-95 group-hover:scale-100 transition-transform"
            ></div>
            <component
              :is="baseUrl.includes('bgm') ? IconMusic : IconVolume"
              size="80"
              stroke-width="1"
              class="text-slate-900 relative z-10"
            />

            <!-- Visualization Dots (Static for now) -->
            <div class="absolute -bottom-4 flex gap-1 items-end h-8">
              <div
                v-for="i in 12"
                :key="i"
                class="w-1 bg-slate-200 rounded-full"
                :class="isPlaying ? 'animate-pulse' : ''"
                :style="{ height: `${10 + Math.random() * 20}px`, animationDelay: `${i * 100}ms` }"
              ></div>
            </div>
          </div>

          <div class="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
            <div class="flex flex-col items-center mb-6">
              <h3 class="text-lg font-black text-slate-900 truncate w-full text-center">
                {{ file }}
              </h3>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1"
                >Audio Track</span
              >
            </div>

            <audio
              ref="audio"
              :src="url"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onLoadedMetadata"
              @play="isPlaying = true"
              @pause="isPlaying = false"
              @ended="isPlaying = false"
            ></audio>

            <!-- Progress Bar -->
            <div class="w-full mb-6">
              <input
                type="range"
                class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                min="0"
                :max="duration"
                step="0.01"
                :value="currentTime"
                @input="seek"
              />
              <div
                class="flex justify-between mt-3 text-[10px] font-bold text-slate-400 tabular-nums tracking-widest"
              >
                <span>{{ formatTime(currentTime) }}</span>
                <span>{{ formatTime(duration) }}</span>
              </div>
            </div>

            <!-- Controls -->
            <div class="flex items-center justify-center">
              <button
                class="w-16 h-16 flex items-center justify-center bg-slate-900 text-white rounded-full hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                @click="togglePlay"
              >
                <component :is="isPlaying ? IconPlayerPause : IconPlayerPlay" size="28" />
              </button>
            </div>
          </div>
        </div>

        <!-- Navigation Arrows -->
        <button
          v-if="hasPrev"
          class="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/50 hover:bg-white text-slate-900 rounded-full shadow-xl shadow-black/5 transition-all active:scale-90"
          @click="prev"
        >
          <IconChevronLeft size="24" stroke-width="2.5" />
        </button>
        <button
          v-if="hasNext"
          class="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-white/50 hover:bg-white text-slate-900 rounded-full shadow-xl shadow-black/5 transition-all active:scale-90"
          @click="next"
        >
          <IconChevronRight size="24" stroke-width="2.5" />
        </button>
      </div>

      <!-- Actions Bar -->
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-3">
          <button
            class="h-12 px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center gap-2 text-xs font-bold transition-all active:scale-95"
            @click="handleDownload"
          >
            <IconDownload size="18" />
            Download
          </button>
        </div>

        <button
          class="h-12 px-6 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all active:scale-95"
          @click="emit('delete', file)"
        >
          <IconTrash size="18" />
          Delete Asset
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #0f172a;
  cursor: pointer;
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

input[type='range']::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #0f172a;
  cursor: pointer;
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
