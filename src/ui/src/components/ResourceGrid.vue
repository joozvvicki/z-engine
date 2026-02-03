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
    parent.classList.add('bg-slate-100')
    const placeholder = document.createElement('div')
    placeholder.className = 'flex flex-col items-center justify-center text-slate-300'
    placeholder.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-photo"><path d="M15 8h.01"></path><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z"></path><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"></path><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"></path></svg>'
    parent.appendChild(placeholder)
  }
}
</script>

<template>
  <div class="overflow-y-auto scrollbar-thin h-full">
    <div
      v-if="files.length > 0"
      class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4 py-8"
    >
      <div
        v-for="file in files"
        :key="file"
        class="group cursor-pointer flex flex-col items-center bg-white rounded-2xl border border-slate-100 transition-all p-3 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1"
        :class="[
          selectedFile === file
            ? 'border-slate-900 ring-2 ring-slate-900/5 bg-slate-50'
            : 'border-slate-100'
        ]"
        @click="emit('select', file)"
      >
        <div
          class="aspect-square w-full flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden border border-slate-50 mb-3 group-hover:bg-white transition-colors relative"
        >
          <!-- Image Preview -->
          <img
            v-if="isImage(file)"
            :src="getUrl(file)"
            class="max-w-full max-h-full object-contain pixelated"
            :alt="file"
            @error="handleImageError"
          />

          <!-- Audio Icon -->
          <div
            v-else-if="isAudio(file)"
            class="flex flex-col items-center gap-2 text-slate-300 group-hover:text-slate-900 transition-colors"
          >
            <component
              :is="basePath.includes('bgm') ? IconMusic : IconVolume"
              size="32"
              stroke-width="1.5"
            />
            <div class="w-8 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-slate-900 w-0 group-hover:w-full transition-all duration-1000"
              ></div>
            </div>
          </div>

          <!-- Generic File Icon -->
          <IconFile v-else size="32" class="text-slate-200" stroke-width="1.5" />

          <!-- Overlay Action -->
          <div
            class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
          >
            <div
              class="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-900 scale-75 group-hover:scale-100 transition-transform"
            >
              <IconPhoto v-if="isImage(file)" size="14" />
              <IconPlayerPlay v-else-if="isAudio(file)" size="14" />
            </div>
          </div>
        </div>
        <span
          class="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate w-full text-center px-1 group-hover:text-slate-900 transition-colors"
          :title="file"
        >
          {{ file.split('.')[0] }}
        </span>
        <span class="text-[9px] font-medium text-slate-300 uppercase tracking-widest mt-0.5">
          {{ file.split('.').pop() }}
        </span>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="files.length === 0"
      class="h-full flex flex-col items-center justify-center py-20 text-slate-300"
    >
      <div
        class="w-24 h-24 bg-white/50 rounded-[32px] flex items-center justify-center mb-8 border border-dashed border-slate-200 shadow-sm"
      >
        <IconFile size="40" stroke-width="1" class="opacity-40 text-slate-400" />
      </div>
      <h3 class="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
        No Assets Found
      </h3>
      <p class="text-xs text-slate-400 font-medium text-center max-w-[200px] leading-relaxed">
        This folder is empty. Click "Import Asset" above to get started.
      </p>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
</style>
