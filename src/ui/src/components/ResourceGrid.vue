<script setup lang="ts">
const props = defineProps<{
  files: string[]
  basePath: string
  selectedFile?: string
}>()

const emit = defineEmits<{
  (e: 'select', file: string): void
}>()

const getUrl = (file: string): string => {
  // Use protocol that ProjectService uses
  // but we can just use a simple resolver here or rely on prop
  return props.basePath + file
}
</script>

<template>
  <div
    class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4 overflow-y-auto"
  >
    <div
      v-for="file in files"
      :key="file"
      class="group cursor-pointer flex flex-col items-center bg-gray-50 rounded-xl border-2 transition-all p-3 hover:bg-black/5 hover:border-black/10"
      :class="[
        selectedFile === file
          ? 'border-black/20 bg-black/5 ring-2 ring-black/10'
          : 'border-transparent'
      ]"
      @click="emit('select', file)"
    >
      <div
        class="aspect-square w-full flex items-center justify-center bg-white rounded-lg overflow-hidden border border-gray-100 mb-3 shadow-sm group-hover:shadow-md transition-shadow"
      >
        <img :src="getUrl(file)" class="max-w-full max-h-full object-contain" :alt="file" />
      </div>
      <span
        class="text-xs font-medium text-gray-600 truncate w-full text-center px-1"
        :title="file"
      >
        {{ file }}
      </span>
    </div>

    <!-- Empty State -->
    <div
      v-if="files.length === 0"
      class="col-span-full flex flex-col items-center justify-center py-20 text-gray-400"
    >
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <p>No assets found in this category.</p>
    </div>
  </div>
</template>
