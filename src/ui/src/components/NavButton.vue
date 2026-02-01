<script lang="ts" setup>
import { type Icon } from '@tabler/icons-vue'

defineProps<{
  icon: Icon
  path?: string
  tooltip?: string
}>()
</script>

<template>
  <div class="group relative flex items-center z-5000">
    <button
      class="rounded-xl transition-all duration-300 hover:cursor-pointer p-2.5"
      :aria-label="tooltip"
      :class="
        path && $route.path.startsWith(path) && path !== '/'
          ? 'bg-black text-white shadow-xl shadow-black/20'
          : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
      "
      @click="path && $router.push({ path })"
    >
      <component :is="icon" :size="20" stroke-width="1.8" />
    </button>

    <div
      v-if="tooltip"
      class="absolute left-full ml-5 px-2 py-1 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-white/5"
    >
      {{ tooltip }}
      <div
        class="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black rotate-45 border-l border-b border-white/5"
      ></div>
    </div>
  </div>
</template>
