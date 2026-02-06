<script setup lang="ts">
import { IconPlus, IconCopy, IconTrash } from '@tabler/icons-vue'
import type { ZEventPage } from '@engine/types'

const props = defineProps<{
  pages: ZEventPage[]
}>()

const activePageIndex = defineModel<number>('activePageIndex', { default: 0 })

const emit = defineEmits(['add-page', 'copy-page', 'remove-page'])
</script>

<template>
  <div
    class="w-20 bg-white border-r border-slate-100 flex flex-col items-center py-6 gap-3 shrink-0 z-10"
  >
    <!-- Scrollable Page List -->
    <div class="flex-1 w-full overflow-y-auto px-3 scrollbar-none flex flex-col gap-3 min-h-0">
      <button
        v-for="(page, idx) in props.pages"
        :key="page.id"
        class="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-black transition-all relative shrink-0 group duration-300"
        :class="
          activePageIndex === idx
            ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-x-1 z-10'
            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 hover:scale-105'
        "
        @click="activePageIndex = idx"
      >
        <span class="relative z-10">{{ idx + 1 }}</span>

        <!-- Active Indicator -->
        <div
          v-if="activePageIndex === idx"
          class="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-full"
        ></div>
      </button>

      <!-- Add New Page Button (Inline) -->
      <button
        class="w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all shrink-0 group mb-2"
        title="Add New Page"
        @click="emit('add-page')"
      >
        <IconPlus
          size="20"
          stroke-width="2.5"
          class="transition-transform group-hover:rotate-90 group-hover:scale-110"
        />
      </button>
    </div>

    <!-- Bottom Actions -->
    <div
      class="flex flex-col items-center gap-3 pt-6 border-t border-slate-100 w-full px-3 mt-auto shrink-0 bg-white"
    >
      <div class="flex flex-col gap-2 w-full">
        <button
          class="w-14 h-14 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10 transition-all group"
          title="Copy Page"
          @click="emit('copy-page')"
        >
          <IconCopy
            size="20"
            stroke-width="2"
            class="group-hover:-translate-y-0.5 transition-transform"
          />
        </button>

        <button
          class="w-14 h-14 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-400 disabled:hover:border-slate-200"
          title="Delete Page"
          :disabled="props.pages.length <= 1"
          @click="emit('remove-page', activePageIndex)"
        >
          <IconTrash size="20" stroke-width="2" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-none::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-none {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
