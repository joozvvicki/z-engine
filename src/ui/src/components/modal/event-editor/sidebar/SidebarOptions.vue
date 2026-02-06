<script setup lang="ts">
import { IconBolt } from '@tabler/icons-vue'
import type { ZEventPage } from '@engine/types'

const page = defineModel<ZEventPage>('page', { required: true })
</script>

<template>
  <div class="space-y-4">
    <h3
      class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
    >
      Options
    </h3>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="(label, key) in {
          walkAnim: 'Walk Anim',
          stepAnim: 'Step Anim',
          directionFix: 'Dir Fix',
          through: 'Through'
        } as const"
        :key="key"
        class="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[10px] font-bold transition-all uppercase tracking-wide"
        :class="
          page.options[key]
            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
        "
        @click="page.options[key] = !page.options[key]"
      >
        <div
          class="w-4 h-4 rounded-md border flex items-center justify-center transition-colors"
          :class="
            page.options[key] ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
          "
        >
          <IconBolt v-if="page.options[key]" size="10" class="text-white" />
        </div>
        {{ label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";
</style>
