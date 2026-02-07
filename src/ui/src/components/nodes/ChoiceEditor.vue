<script setup lang="ts">
import { IconTrash, IconPlus, IconChevronUp, IconChevronDown } from '@tabler/icons-vue'
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const newChoice = ref('')

const addChoice = (): void => {
  if (!newChoice.value.trim()) return
  const choices = [...props.modelValue, newChoice.value.trim()]
  emit('update:modelValue', choices)
  newChoice.value = ''
}

const removeChoice = (index: number): void => {
  const choices = [...props.modelValue]
  choices.splice(index, 1)
  emit('update:modelValue', choices)
}

const moveChoice = (index: number, direction: 'up' | 'down'): void => {
  const choices = [...props.modelValue]
  if (direction === 'up' && index > 0) {
    ;[choices[index], choices[index - 1]] = [choices[index - 1], choices[index]]
  } else if (direction === 'down' && index < choices.length - 1) {
    ;[choices[index], choices[index + 1]] = [choices[index + 1], choices[index]]
  }
  emit('update:modelValue', choices)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- List of Choices -->
    <div class="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 select-none">
      <div
        v-for="(choice, idx) in modelValue"
        :key="idx"
        class="group flex items-center gap-2 p-1.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-slate-300 transition-all"
      >
        <div class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="p-0.5 text-slate-300 hover:text-indigo-500 disabled:opacity-20"
            :disabled="idx === 0"
            @click="moveChoice(idx, 'up')"
          >
            <IconChevronUp size="10" stroke-width="3" />
          </button>
          <button
            class="p-0.5 text-slate-300 hover:text-indigo-500 disabled:opacity-20"
            :disabled="idx === modelValue.length - 1"
            @click="moveChoice(idx, 'down')"
          >
            <IconChevronDown size="10" stroke-width="3" />
          </button>
        </div>

        <input
          :value="choice"
          type="text"
          class="flex-1 bg-transparent text-[10px] text-slate-800 font-bold outline-none border-none p-0 focus:ring-0"
          @input="
            (e: Event) => {
              const target = e.target as HTMLInputElement
              const updated = [...modelValue]
              updated[idx] = target.value
              emit('update:modelValue', updated)
            }
          "
        />

        <button
          class="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
          @click="removeChoice(idx)"
        >
          <IconTrash size="11" />
        </button>
      </div>

      <div
        v-if="modelValue.length === 0"
        class="py-4 text-center border-2 border-dashed border-slate-50 rounded-lg"
      >
        <span class="text-[9px] font-black uppercase text-slate-300 tracking-wider"
          >No choices added</span
        >
      </div>
    </div>

    <!-- Quick Add -->
    <div class="flex gap-1.5">
      <input
        v-model="newChoice"
        type="text"
        placeholder="New choice..."
        class="flex-1 bg-slate-50 text-[10px] text-slate-900 border border-slate-100 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400 transition-all"
        @keyup.enter="addChoice"
      />
      <button
        class="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors"
        @click="addChoice"
      >
        <IconPlus size="12" stroke-width="3" />
      </button>
    </div>
  </div>
</template>
