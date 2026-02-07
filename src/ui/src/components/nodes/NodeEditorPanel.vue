<script setup lang="ts">
import type { ZNodeValueSchema } from '@engine/types'
import { useEditorStore } from '@ui/stores/editor'
import { computed } from 'vue'

const editorStore = useEditorStore()

defineProps<{
  schema: ZNodeValueSchema
  modelValue: unknown
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void
}>()

// Helper to get switch/variable name
const getSwitchName = (id: number): string => {
  const name = editorStore.systemSwitches[id - 1]
  return name
    ? `#${String(id).padStart(3, '0')} - ${name}`
    : `#${String(id).padStart(3, '0')} - (Unnamed)`
}

const getVariableName = (id: number): string => {
  const name = editorStore.systemVariables[id - 1]
  return name
    ? `#${String(id).padStart(3, '0')} - ${name}`
    : `#${String(id).padStart(3, '0')} - (Unnamed)`
}

// Create lists for switches/variables
const switchOptions = computed(() => {
  return Array.from({ length: Math.max(50, editorStore.systemSwitches.length) }, (_, i) => ({
    id: i + 1,
    name: getSwitchName(i + 1)
  }))
})

const variableOptions = computed(() => {
  return Array.from({ length: Math.max(50, editorStore.systemVariables.length) }, (_, i) => ({
    id: i + 1,
    name: getVariableName(i + 1)
  }))
})
</script>

<template>
  <div class="space-y-1.5">
    <label
      class="text-[9px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1"
    >
      {{ schema.label }}
      <span v-if="schema.required" class="text-red-400">*</span>
    </label>

    <!-- String Input -->
    <input
      v-if="schema.type === 'string'"
      :value="modelValue"
      type="text"
      class="w-full bg-slate-50 text-[11px] text-slate-800 outline-none border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all font-medium"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <!-- Number Input -->
    <input
      v-else-if="schema.type === 'number'"
      :value="modelValue"
      type="number"
      :min="schema.min"
      :max="schema.max"
      class="w-full bg-slate-50 text-[11px] text-slate-800 outline-none border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all font-bold"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />

    <!-- Boolean Toggle -->
    <label
      v-else-if="schema.type === 'boolean'"
      class="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors"
    >
      <input
        :checked="!!modelValue"
        type="checkbox"
        class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span class="text-xs font-bold" :class="modelValue ? 'text-emerald-600' : 'text-slate-400'">
        {{ modelValue ? 'ON' : 'OFF' }}
      </span>
    </label>

    <!-- Select Dropdown -->
    <select
      v-else-if="schema.type === 'select' && schema.options"
      :value="modelValue"
      class="w-full bg-slate-50 text-[11px] text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 font-bold cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all appearance-none"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="opt in schema.options" :key="String(opt.value)" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <!-- Switch Selector -->
    <select
      v-else-if="schema.type === 'switch'"
      :value="modelValue"
      class="w-full bg-slate-50 text-[11px] text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 font-bold cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all"
      @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
    >
      <option :value="0">None</option>
      <option v-for="opt in switchOptions" :key="opt.id" :value="opt.id">
        {{ opt.name }}
      </option>
    </select>

    <!-- Variable Selector -->
    <select
      v-else-if="schema.type === 'variable'"
      :value="modelValue"
      class="w-full bg-slate-50 text-[11px] text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 font-bold cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all"
      @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
    >
      <option :value="0">None</option>
      <option v-for="opt in variableOptions" :key="opt.id" :value="opt.id">
        {{ opt.name }}
      </option>
    </select>

    <!-- Audio File Input -->
    <input
      v-else-if="schema.type === 'audio'"
      :value="modelValue"
      type="text"
      placeholder="audio/bgm01.ogg"
      class="w-full bg-slate-50 text-[11px] text-slate-800 outline-none border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 font-medium"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <!-- Graphic Input -->
    <input
      v-else-if="schema.type === 'graphic'"
      :value="modelValue"
      type="text"
      placeholder="faces/actor1"
      class="w-full bg-slate-50 text-[11px] text-slate-800 outline-none border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 font-medium"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <!-- Event Selector -->
    <input
      v-else-if="schema.type === 'event'"
      :value="modelValue"
      type="text"
      placeholder="Event ID"
      class="w-full bg-slate-50 text-[11px] text-slate-800 outline-none border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 font-medium"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <!-- Map Selector -->
    <input
      v-else-if="schema.type === 'map'"
      :value="modelValue"
      type="number"
      placeholder="Map ID"
      min="1"
      class="w-full bg-slate-50 text-[11px] text-slate-800 outline-none border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 font-bold"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />

    <!-- Actor Selector -->
    <input
      v-else-if="schema.type === 'actor'"
      :value="modelValue"
      type="number"
      placeholder="Actor ID"
      min="1"
      class="w-full bg-slate-50 text-[11px] text-slate-800 outline-none border border-slate-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 font-bold"
      @input="emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />

    <!-- Color Input -->
    <div v-else-if="schema.type === 'color'" class="flex gap-2">
      <input
        :value="modelValue"
        type="color"
        class="w-10 h-8 rounded border border-slate-200 cursor-pointer"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <input
        :value="modelValue"
        type="text"
        class="flex-1 bg-slate-50 text-[11px] text-slate-800 outline-none border border-slate-200 rounded-lg px-3 py-1.5 focus:border-indigo-500 font-mono"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Position Input -->
    <div v-else-if="schema.type === 'position'" class="grid grid-cols-2 gap-2">
      <input
        :value="(modelValue as any)?.x ?? 0"
        type="number"
        placeholder="X"
        class="bg-slate-50 text-[11px] text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 font-bold"
        @input="
          emit('update:modelValue', {
            ...((modelValue as any) || {}),
            x: Number(($event.target as HTMLInputElement).value)
          })
        "
      />
      <input
        :value="(modelValue as any)?.y ?? 0"
        type="number"
        placeholder="Y"
        class="bg-slate-50 text-[11px] text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 font-bold"
        @input="
          emit('update:modelValue', {
            ...((modelValue as any) || {}),
            y: Number(($event.target as HTMLInputElement).value)
          })
        "
      />
    </div>

    <!-- Fallback for unknown types -->
    <div
      v-else
      class="text-xs text-slate-400 italic bg-slate-50 rounded-lg px-3 py-2 border border-slate-200"
    >
      Editor for "{{ schema.type }}" not yet implemented
    </div>
  </div>
</template>
