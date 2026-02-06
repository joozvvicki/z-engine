<script setup lang="ts">
import { IconMusic, IconVolume, IconPhoto, IconFile, IconPlayerPlay } from '@tabler/icons-vue'

const props = defineProps<{
  files: string[]
  basePath: string
  selectedFile?: string
}>()

const emit = defineEmits<{
  (e: 'select', file: string): void
}>()

const isAudio = (file: string): boolean => {
  const ext = file.split('.').pop()?.toLowerCase() || ''
  return ['mp3', 'ogg', 'wav', 'm4a'].includes(ext)
}

const isImage = (file: string): boolean => {
  const ext = file.split('.').pop()?.toLowerCase() || ''
  return ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)
}

const getUrl = (file: string): string => {
  if (!props.basePath) return ''
  return props.basePath + file
}

const handleImageError = (e: Event): void => {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const parent = img.parentElement
  if (parent) {
    parent.classList.add('bg-slate-100', 'flex', 'items-center', 'justify-center')
    parent.innerHTML = '<span class="text-xs text-slate-400 font-bold">Error</span>'
  }
}
</script>

<template>
  <div class="overflow-y-auto custom-scrollbar h-full pr-2">
    <div
      class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-4 pb-10"
    >
      <div
        v-for="file in files"
        :key="file"
        class="group cursor-pointer flex flex-col bg-white rounded-xl border transition-all duration-200 relative overflow-hidden"
        :class="[
          selectedFile === file
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg z-10'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-1'
        ]"
        @click="emit('select', file)"
      >
        <div
          class="aspect-square w-full bg-slate-50 border-b border-slate-100 overflow-hidden relative checkerboard"
        >
          <img
            v-if="isImage(file)"
            :src="getUrl(file)"
            class="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110 pixelated"
            loading="lazy"
            :alt="file"
            @error="handleImageError"
          />

          <div
            v-else-if="isAudio(file)"
            class="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-slate-50 to-slate-100"
          >
            <div
              class="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all mb-2"
            >
              <component
                :is="basePath.includes('bgm') ? IconMusic : IconVolume"
                size="24"
                stroke-width="2"
              />
            </div>

            <div class="flex items-end gap-0.5 h-4">
              <div
                class="w-1 bg-slate-300 rounded-full animate-wave"
                style="animation-delay: 0ms"
              ></div>
              <div
                class="w-1 bg-slate-300 rounded-full animate-wave"
                style="animation-delay: 100ms"
              ></div>
              <div
                class="w-1 bg-slate-300 rounded-full animate-wave"
                style="animation-delay: 200ms"
              ></div>
              <div
                class="w-1 bg-slate-300 rounded-full animate-wave"
                style="animation-delay: 150ms"
              ></div>
              <div
                class="w-1 bg-slate-300 rounded-full animate-wave"
                style="animation-delay: 50ms"
              ></div>
            </div>
          </div>

          <div v-else class="w-full h-full flex items-center justify-center">
            <IconFile size="32" class="text-slate-300" stroke-width="1.5" />
          </div>

          <div
            class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <div
              class="bg-white/90 backdrop-blur rounded-full p-2 shadow-sm transform scale-50 group-hover:scale-100 transition-transform"
            >
              <IconPlayerPlay v-if="isAudio(file)" size="16" class="text-slate-900 ml-0.5" />
              <IconPhoto v-else size="16" class="text-slate-900" />
            </div>
          </div>
        </div>

        <div class="p-3">
          <div class="flex items-start justify-between gap-2">
            <span
              class="text-xs font-bold text-slate-700 truncate w-full group-hover:text-blue-600 transition-colors"
              :title="file"
            >
              {{ file.split('.')[0] }}
            </span>
          </div>
          <div class="flex items-center justify-between mt-1">
            <span
              class="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded"
            >
              {{ file.split('.').pop() }}
            </span>
            <span class="text-[9px] text-slate-300 font-mono"> -- KB </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}

/* Checkerboard pattern for transparent images */
.checkerboard {
  background-color: #f8fafc;
  background-image:
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

@keyframes wave {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 12px;
  }
}
.animate-wave {
  animation: wave 1s ease-in-out infinite paused;
}
.group:hover .animate-wave {
  animation-play-state: running;
}
</style>
