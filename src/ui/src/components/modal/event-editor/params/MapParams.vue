<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown } from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 204 (Scroll Map), 202 (Get Location)
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const direction = ref(2) // 2: Down, 4: Left, 6: Right, 8: Up
const distance = ref(1)
const speed = ref(4)

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    if (props.type === ZCommandCode.ScrollMap) {
      direction.value = Number(params[0] ?? 2)
      distance.value = Number(params[1] ?? 1)
      speed.value = Number(params[2] ?? 4)
    }
  }
}

onMounted(initialize)

defineExpose({
  getCommandData: () => {
    let params: unknown[] = []
    if (props.type === ZCommandCode.ScrollMap) {
      params = [direction.value, distance.value, speed.value]
    }
    return {
      code: props.type,
      parameters: params
    }
  }
})

const directionsList = [
  { val: 2, label: 'Down' },
  { val: 4, label: 'Left' },
  { val: 6, label: 'Right' },
  { val: 8, label: 'Up' }
]

const speedsList = [
  { val: 1, label: '1: Slowest' },
  { val: 2, label: '2: Slower' },
  { val: 3, label: '3: Slow' },
  { val: 4, label: '4: Normal' },
  { val: 5, label: '5: Fast' },
  { val: 6, label: '6: Fastest' }
]
</script>

<template>
  <div class="space-y-6">
    <template v-if="type === ZCommandCode.ScrollMap">
      <!-- Direction -->
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Direction</label>
        <div class="relative">
          <select v-model="direction" class="docs-input appearance-none">
            <option v-for="d in directionsList" :key="d.val" :value="d.val">{{ d.label }}</option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <!-- Distance -->
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Distance (Tiles)</label
        >
        <input v-model.number="distance" type="number" min="1" class="docs-input" />
      </div>

      <!-- Speed -->
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Scroll Speed</label
        >
        <div class="relative">
          <select v-model="speed" class="docs-input appearance-none">
            <option v-for="s in speedsList" :key="s.val" :value="s.val">{{ s.label }}</option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>
    </template>

    <template v-else-if="type === ZCommandCode.GetLocationInfo">
      <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <p class="text-xs text-slate-500 font-bold mb-2">Location Information</p>
        <p class="text-[10px] text-slate-400">
          This command allows you to get information about a specific tile or event at a position
          and save it to a variable.
        </p>
        <p class="text-[10px] text-slate-400 mt-2 italic">
          More detailed parameters for this command will be added in a future update.
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300;
}
</style>
