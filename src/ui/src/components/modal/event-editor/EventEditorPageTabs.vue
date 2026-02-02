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
    class="w-16 bg-white border-r border-slate-100 flex flex-col items-center py-4 gap-4 shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10"
  >
    <!-- Scrollable Page List -->
    <div class="flex-1 w-full overflow-y-auto px-2 scrollbar-none flex flex-col gap-2">
      <button
        v-for="(page, idx) in props.pages"
        :key="page.id"
        class="w-full aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative shrink-0 group"
        :class="
          activePageIndex === idx
            ? 'bg-slate-900 text-white shadow-md scale-100'
            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900'
        "
        @click="activePageIndex = idx"
      >
        {{ idx + 1 }}
        <div
          v-if="activePageIndex === idx"
          class="absolute -right-[9px] top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 rounded-[1px]"
        ></div>
      </button>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-col items-center gap-2 pt-4 border-t border-slate-100 w-full px-2 mt-auto shrink-0"
    >
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-white border border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-900 transition-all shadow-sm"
        title="Add Page"
        @click="emit('add-page')"
      >
        <IconPlus size="18" />
      </button>
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-white border border-slate-200 hover:border-slate-400 text-slate-500 hover:text-slate-900 transition-all shadow-sm"
        title="Copy Page"
        @click="emit('copy-page')"
      >
        <IconCopy size="18" />
      </button>
      <button
        class="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="Delete Page"
        :disabled="props.pages.length <= 1"
        @click="emit('remove-page', activePageIndex)"
      >
        <IconTrash size="18" />
      </button>
    </div>
  </div>
</template>
