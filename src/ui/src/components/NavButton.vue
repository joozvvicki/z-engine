<script lang="ts" setup>
import { type Icon } from '@tabler/icons-vue'

defineProps<{
  icon: Icon
  tooltip?: string
}>()
</script>

<template>
  <div class="group relative z-[1000] flex items-center">
    <button
      class="rounded-md focus:bg-white/10 hover:bg-white/10 duration-300 hover:cursor-pointer px-2 py-2 text-slate-600 hover:text-slate-300"
    >
      <component :is="icon" :size="20" stroke-width="1.5" />
    </button>

    <div
      v-if="tooltip"
      class="absolute z-[1000] left-full ml-5 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-slate-700 z-50"
    >
      {{ tooltip }}
      <div
        class="absolute z-[1001] top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-slate-700"
      ></div>
    </div>
  </div>
</template>
