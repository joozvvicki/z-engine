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
  return props.basePath + file
}
</script>

<template>
  <div
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

    <!-- Empty State -->
    <div
      v-if="files.length === 0"
      class="col-span-full flex flex-col items-center justify-center py-32 text-slate-300"
    >
      <div
        class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-dashed border-slate-200"
      >
        <IconFile size="32" stroke-width="1" class="opacity-40" />
      </div>
      <p class="text-sm font-bold text-slate-400 uppercase tracking-widest">No assets found</p>
      <p class="text-xs text-slate-300 mt-2">Ready to expand? Click "Import Asset" above.</p>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
</style>
