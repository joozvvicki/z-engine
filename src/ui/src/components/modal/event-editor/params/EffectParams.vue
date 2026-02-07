<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown } from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand, type ZEvent } from '@engine/types'

const props = defineProps<{
  type: number // 212 (Animation), 215 (Balloon)
  events: ZEvent[]
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const targetId = ref(-1) // -1: This Event, 0: Player, >0: Event ID
const animationId = ref(1)
const balloonId = ref(1)
const wait = ref(true)

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    targetId.value = Number(params[0] ?? -1)
    if (props.type === ZCommandCode.ShowAnimation) {
      animationId.value = Number(params[1] ?? 1)
      wait.value = params[2] !== false
    } else {
      balloonId.value = Number(params[1] ?? 1)
      wait.value = params[2] !== false
    }
  }
}

onMounted(initialize)

defineExpose({
  getCommandData: () => {
    const params = [
      targetId.value,
      props.type === ZCommandCode.ShowAnimation ? animationId.value : balloonId.value,
      wait.value
    ]
    return {
      code: props.type,
      parameters: params
    }
  }
})

const balloonTypes = [
  { val: 1, label: 'Exclamation' },
  { val: 2, label: 'Question' },
  { val: 3, label: 'Music Note' },
  { val: 4, label: 'Heart' },
  { val: 5, label: 'Anger' },
  { val: 6, label: 'Sweat' },
  { val: 7, label: 'Cobweb' },
  { val: 8, label: 'Silence' },
  { val: 9, label: 'Light Bulb' },
  { val: 10, label: 'Zzz' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Target Selection -->
    <div class="space-y-3">
      <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
        >Target Character</label
      >
      <div class="relative">
        <select v-model="targetId" class="docs-input appearance-none">
          <option :value="0">Player</option>
          <option :value="-1">This Event</option>
          <option v-for="e in events" :key="e.id" :value="e.id">
            Event: {{ e.name }} (ID: {{ e.id }})
          </option>
        </select>
        <IconArrowDown
          size="14"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </div>

    <!-- Animation Selection -->
    <template v-if="type === ZCommandCode.ShowAnimation">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Animation</label>
        <div class="relative">
          <select v-model="animationId" class="docs-input appearance-none">
            <option v-for="i in 20" :key="i" :value="i">Animation #{{ i }}</option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>
    </template>

    <!-- Balloon Selection -->
    <template v-else-if="type === ZCommandCode.ShowBalloonIcon">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Balloon Type</label
        >
        <div class="relative">
          <select v-model="balloonId" class="docs-input appearance-none">
            <option v-for="b in balloonTypes" :key="b.val" :value="b.val">{{ b.label }}</option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>
    </template>

    <!-- Options -->
    <div class="flex items-center gap-2 px-1 pt-2">
      <input
        v-model="wait"
        type="checkbox"
        class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span
        class="text-[10px] font-bold uppercase text-slate-500 cursor-pointer select-none"
        @click="wait = !wait"
        >Wait for Completion</span
      >
    </div>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300;
}
</style>
