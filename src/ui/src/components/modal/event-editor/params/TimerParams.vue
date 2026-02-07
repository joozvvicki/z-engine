<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const operation = ref(0) // 0: Start, 1: Stop
const seconds = ref(0)

const initialize = (): void => {
  if (props.initialCommand && props.initialCommand.code === ZCommandCode.ControlTimer) {
    const params = props.initialCommand.parameters
    operation.value = Number(params[0] || 0)
    seconds.value = Number(params[1] || 0)
  }
}

onMounted(initialize)

// Expose data for parent
defineExpose({
  getCommandData: () => {
    return {
      code: ZCommandCode.ControlTimer,
      parameters: [operation.value, seconds.value]
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-3">
      <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Operation</label>
      <div class="segmented-control">
        <button
          v-for="op in [
            { val: 0, label: 'Start' },
            { val: 1, label: 'Stop' }
          ]"
          :key="op.val"
          :class="{ active: operation === op.val }"
          @click="operation = op.val"
        >
          {{ op.label }}
        </button>
      </div>
    </div>

    <div v-if="operation === 0" class="space-y-3 animate-in fade-in slide-in-from-top-1">
      <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
        >Time (Seconds)</label
      >
      <div class="flex items-center gap-4">
        <input v-model.number="seconds" type="number" min="0" class="docs-input w-32" />
        <span class="text-[10px] text-slate-400 font-bold uppercase">
          ≈ {{ Math.floor(seconds / 60) }}m {{ seconds % 60 }}s
        </span>
      </div>
    </div>
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
