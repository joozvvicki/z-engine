<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown, IconEraser } from '@tabler/icons-vue'
import { ZCommandCode, type ZEvent, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 212 (Animation), 215 (Balloon), 216 (Erase)
  events: ZEvent[]
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const targetIdx = ref(-1) // -1: This Event, 0: Player, >0: Event ID
const animationId = ref(1)
const balloonId = ref(1)
const wait = ref(true)

const balloons = [
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

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    targetIdx.value = Number(params[0] ?? -1)
    if (props.type === ZCommandCode.ShowAnimation) {
      animationId.value = Number(params[1] || 1)
      wait.value = params[2] !== false
    } else if (props.type === ZCommandCode.ShowBalloonIcon) {
      balloonId.value = Number(params[1] || 1)
      wait.value = params[2] !== false
    }
  }
}

onMounted(initialize)

// Expose data for parent
defineExpose({
  getCommandData: () => {
    let finalParams: unknown[] = []
    if (props.type === ZCommandCode.ShowAnimation) {
      finalParams = [targetIdx.value, animationId.value, wait.value]
    } else if (props.type === ZCommandCode.ShowBalloonIcon) {
      finalParams = [targetIdx.value, balloonId.value, wait.value]
    } else if (props.type === ZCommandCode.EraseEvent) {
      finalParams = []
    }
    return {
      code: props.type,
      parameters: finalParams
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Erase Event -->
    <template v-if="type === ZCommandCode.EraseEvent">
      <div
        class="p-8 rounded-3xl bg-slate-50 border border-slate-200/50 flex flex-col items-center gap-4 text-center"
      >
        <div
          class="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-red-500 border border-slate-100"
        >
          <IconEraser size="32" stroke-width="1.5" />
        </div>
        <div class="space-y-2">
          <span class="text-xs font-black uppercase text-slate-700 tracking-wider"
            >Erase Event</span
          >
          <p class="text-[11px] text-slate-400 leading-relaxed max-w-[240px]">
            Temporarily removes this event from the map. It will reappear when the player re-enters
            the map.
          </p>
        </div>
      </div>
    </template>

    <!-- Animation / Balloon -->
    <template v-else>
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1 tracking-widest"
          >Target Character</label
        >
        <div class="relative">
          <select v-model.number="targetIdx" class="docs-input appearance-none">
            <option :value="-1">This Event</option>
            <option :value="0">Player</option>
            <option disabled>--- Events ---</option>
            <option
              v-for="ev in events.filter((e) => e.name !== 'PlayerStart')"
              :key="ev.id"
              :value="Number(ev.id)"
            >
              ID {{ String(ev.id).padStart(3, '0') }}: {{ ev.name }}
            </option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <!-- Animation Selection -->
      <div v-if="type === ZCommandCode.ShowAnimation" class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1 tracking-widest"
          >Select Animation</label
        >
        <div class="relative">
          <select v-model.number="animationId" class="docs-input appearance-none">
            <option v-for="n in 100" :key="n" :value="n">
              #{{ String(n).padStart(3, '0') }}: Animation {{ n }}
            </option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <!-- Balloon Icon Selection -->
      <div v-else-if="type === ZCommandCode.ShowBalloonIcon" class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1 tracking-widest"
          >Balloon Type</label
        >
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="b in balloons"
            :key="b.val"
            class="px-4 py-3 rounded-2xl border text-[11px] font-bold transition-all text-left flex items-center justify-between group"
            :class="
              balloonId === b.val
                ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
            "
            @click="balloonId = b.val"
          >
            {{ b.label }}
            <div
              v-if="balloonId === b.val"
              class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"
            ></div>
          </button>
        </div>
      </div>

      <!-- Wait for Completion Toggle -->
      <div class="pt-4 border-t border-slate-100">
        <label
          class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-indigo-200 transition-all group"
        >
          <div class="relative inline-flex items-center">
            <input v-model="wait" type="checkbox" class="sr-only peer" />
            <div
              class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
            ></div>
          </div>
          <div class="flex flex-col">
            <span
              class="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none"
              >Wait for Completion</span
            >
            <span class="text-[9px] text-slate-400 mt-1"
              >Pause event execution until effect finishes</span
            >
          </div>
        </label>
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
