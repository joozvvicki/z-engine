<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown, IconTrash } from '@tabler/icons-vue'
import { ZCommandCode, type ZEvent, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 101 or 102
  events: ZEvent[]
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const text = ref('')
const style = ref(0) // 0: Window, 1: Bubble
const target = ref(0) // 0: This Event, -1: Player, >0: Event ID
const choices = ref<string[]>(['Yes', 'No'])

const initialize = (): void => {
  if (
    props.initialCommand &&
    (props.initialCommand.code === ZCommandCode.ShowMessage ||
      props.initialCommand.code === ZCommandCode.ShowChoices)
  ) {
    const params = props.initialCommand.parameters
    if (props.initialCommand.code === ZCommandCode.ShowMessage) {
      text.value = String(params[0] || '')
      style.value = Number(params[1] || 0)
      target.value = Number(params[2] ?? 0)
    } else {
      choices.value = JSON.parse(JSON.stringify(params[0] || ['Yes', 'No']))
      style.value = Number(params[1] || 0)
      target.value = Number(params[2] ?? 0)
    }
  }
}

onMounted(initialize)

const addChoice = (): void => {
  if (choices.value.length < 6) {
    choices.value.push('New Choice')
  }
}

const removeChoice = (index: number): void => {
  if (choices.value.length > 1) {
    choices.value.splice(index, 1)
  }
}

// Expose data for parent
defineExpose({
  getCommandData: () => {
    let finalParams: unknown[] = []
    if (props.type === ZCommandCode.ShowMessage) {
      finalParams = [text.value, style.value, target.value]
    } else if (props.type === ZCommandCode.ShowChoices) {
      finalParams = [[...choices.value], style.value, target.value]
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
    <!-- Show Message -->
    <template v-if="type === 101">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Message Text</label
        >
        <textarea
          v-model="text"
          rows="4"
          class="docs-input min-h-[100px] resize-none"
          placeholder="Enter message text..."
        ></textarea>
      </div>

      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Window Style</label
        >
        <div class="segmented-control">
          <button
            v-for="s in [
              { val: 0, label: 'Standard' },
              { val: 1, label: 'Bubble' }
            ]"
            :key="s.val"
            :class="{ active: style === s.val }"
            @click="style = s.val"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div v-if="style === 1" class="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Target</label>
        <div class="relative">
          <select v-model.number="target" class="docs-input appearance-none">
            <option :value="0">This Event</option>
            <option :value="-1">Player</option>
            <option disabled>--- Events ---</option>
            <option
              v-for="ev in events.filter((e) => e.name !== 'PlayerStart')"
              :key="ev.id"
              :value="Number(ev.id)"
            >
              ID {{ ev.id }}: {{ ev.name }}
            </option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>
    </template>

    <!-- Show Choices -->
    <template v-else-if="type === 102">
      <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Choice List</label>
      <div class="space-y-3">
        <div
          v-for="(_, idx) in choices"
          :key="idx"
          class="flex items-center gap-3 group animate-in slide-in-from-left-2 fade-in"
        >
          <div
            class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-black"
          >
            {{ idx + 1 }}
          </div>
          <input
            v-if="choices"
            v-model="choices[idx]"
            type="text"
            class="docs-input py-2.5"
            placeholder="Choice text..."
          />
          <button
            v-if="choices && choices.length > 1"
            class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            @click="removeChoice(idx)"
          >
            <IconTrash size="16" />
          </button>
        </div>
        <button
          v-if="choices && choices.length < 6"
          class="w-full py-3 border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
          @click="addChoice"
        >
          <div class="w-4 h-4 rounded bg-current flex items-center justify-center text-white">
            <IconArrowDown size="10" />
          </div>
          Add Another Choice
        </button>
      </div>

      <div class="space-y-3 pt-4 border-t border-slate-100">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Window Style</label
        >
        <div class="segmented-control">
          <button
            v-for="s in [
              { val: 0, label: 'Standard' },
              { val: 1, label: 'Bubble' }
            ]"
            :key="s.val"
            :class="{ active: style === s.val }"
            @click="style = s.val"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div v-if="style === 1" class="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Target</label>
        <div class="relative">
          <select v-model.number="target" class="docs-input appearance-none">
            <option :value="0">This Event</option>
            <option :value="-1">Player</option>
            <option disabled>--- Events ---</option>
            <option
              v-for="ev in events.filter((e) => e.name !== 'PlayerStart')"
              :key="ev.id"
              :value="Number(ev.id)"
            >
              ID {{ ev.id }}: {{ ev.name }}
            </option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
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
