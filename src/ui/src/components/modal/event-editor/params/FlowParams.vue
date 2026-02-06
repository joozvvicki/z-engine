<script setup lang="ts">
import { IconArrowDown } from '@tabler/icons-vue'

defineProps<{
  type: number // 201 (Wait) or 111 (Conditional)
  switches: string[]
  variables: string[]
}>()

const waitFrames = defineModel<number>('waitFrames')
const branchType = defineModel<number>('branchType') // 0: Switch, 1: Variable
const switchId = defineModel<string>('switchId')
const switchVal = defineModel<number>('switchVal')
const varId = defineModel<string>('varId')
const varVal = defineModel<number>('varVal')
</script>

<template>
  <div class="space-y-6">
    <!-- Wait -->
    <template v-if="type === 201">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Wait Duration (Frames)</label
        >
        <div class="flex items-center gap-4">
          <input v-model.number="waitFrames" type="number" class="docs-input w-32" />
          <span class="text-[10px] text-slate-400 font-bold uppercase"
            >≈ {{ ((waitFrames || 0) / 60).toFixed(2) }} Seconds</span
          >
        </div>
      </div>
    </template>

    <!-- Conditional Branch -->
    <template v-else-if="type === 111">
      <div class="segmented-control">
        <button
          v-for="bt in [
            { val: 0, label: 'Switch' },
            { val: 1, label: 'Variable' }
          ]"
          :key="bt.val"
          :class="{ active: branchType === bt.val }"
          @click="branchType = bt.val"
        >
          {{ bt.label }}
        </button>
      </div>

      <!-- Switch Condition -->
      <div v-if="branchType === 0" class="space-y-5 px-1 pt-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >System Switch</label
          >
          <div class="relative">
            <select v-model="switchId" class="docs-input appearance-none">
              <option v-for="(sw, idx) in switches" :key="idx" :value="String(idx + 1)">
                #{{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(Untitled)' }}
              </option>
            </select>
            <IconArrowDown
              size="14"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Required State</label
          >
          <div class="segmented-control">
            <button
              v-for="s in [
                { val: 1, label: 'ON' },
                { val: 0, label: 'OFF' }
              ]"
              :key="s.val"
              :class="{ active: switchVal === s.val }"
              @click="switchVal = s.val"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Variable Condition -->
      <div v-else-if="branchType === 1" class="space-y-5 px-1 pt-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >System Variable</label
          >
          <div class="relative">
            <select v-model="varId" class="docs-input appearance-none">
              <option v-for="(v, idx) in variables" :key="idx" :value="String(idx + 1)">
                #{{ String(idx + 1).padStart(3, '0') }}: {{ v || '(Untitled)' }}
              </option>
            </select>
            <IconArrowDown
              size="14"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Required Value (=)</label
          >
          <input v-model.number="varVal" type="number" class="docs-input" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300;
}
.segmented-control {
  @apply flex p-1 bg-slate-100 rounded-xl gap-1;
}
.segmented-control button {
  @apply flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all border border-transparent flex items-center justify-center gap-2;
}
.segmented-control button.active {
  @apply bg-white text-slate-800 shadow-sm border-slate-200/50;
}
.segmented-control button:hover:not(.active) {
  @apply text-slate-600;
}
</style>
