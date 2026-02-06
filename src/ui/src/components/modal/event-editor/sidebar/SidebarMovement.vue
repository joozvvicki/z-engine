<script setup lang="ts">
import { IconChevronDown } from '@tabler/icons-vue'
import type { ZEventPage } from '@engine/types'

const page = defineModel<ZEventPage>('page', { required: true })

const emit = defineEmits(['edit-move-route'])
</script>

<template>
  <div class="space-y-4">
    <h3
      class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
    >
      Autonomous Movement
    </h3>

    <div class="space-y-3">
      <div class="space-y-1.5">
        <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1">Type</span>
        <div class="relative">
          <select
            v-model="page.moveType"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none"
          >
            <option value="fixed">Fixed</option>
            <option value="random">Random</option>
            <option value="approach">Approach</option>
            <option value="custom">Custom</option>
          </select>
          <IconChevronDown
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size="14"
          />
        </div>
      </div>

      <div
        v-if="page.moveType === 'custom'"
        class="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div class="space-y-2">
          <label
            class="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <div class="relative inline-flex items-center">
              <input v-model="page.moveRouteRepeat" type="checkbox" class="sr-only peer" />
              <div
                class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"
              ></div>
            </div>
            <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
              >Repeat Route</span
            >
          </label>

          <label
            class="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors"
          >
            <div class="relative inline-flex items-center">
              <input v-model="page.moveRouteSkip" type="checkbox" class="sr-only peer" />
              <div
                class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"
              ></div>
            </div>
            <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
              >Skip If Blocked</span
            >
          </label>
        </div>

        <button
          class="w-full px-3 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wide rounded-xl border border-indigo-200 shadow-sm transition-all active:scale-95"
          @click="emit('edit-move-route')"
        >
          Edit Route... ({{ page.moveRoute.length }})
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1.5">
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1"
            >Speed</span
          >
          <div class="relative">
            <select
              v-model.number="page.moveSpeed"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
            >
              <option :value="1">1: x8 Slow</option>
              <option :value="2">2: x4 Slow</option>
              <option :value="3">3: x2 Slow</option>
              <option :value="4">4: Normal</option>
              <option :value="5">5: x2 Fast</option>
              <option :value="6">6: x4 Fast</option>
            </select>
            <IconChevronDown
              class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size="12"
            />
          </div>
        </div>
        <div class="space-y-1.5">
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1"
            >Freq</span
          >
          <div class="relative">
            <select
              v-model.number="page.moveFrequency"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
            >
              <option :value="1">1: Lowest</option>
              <option :value="2">2: Low</option>
              <option :value="3">3: Normal</option>
              <option :value="4">4: High</option>
              <option :value="5">5: Highest</option>
            </select>
            <IconChevronDown
              class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size="12"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";
</style>
