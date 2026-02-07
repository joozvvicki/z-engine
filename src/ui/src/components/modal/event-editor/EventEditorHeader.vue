<script setup lang="ts">
import {
  IconDeviceFloppy,
  IconTrash,
  IconSettings,
  IconCode,
  IconHierarchy2
} from '@tabler/icons-vue'

const props = defineProps<{
  eventId?: string | null
  mode: 'code' | 'visual'
}>()

const eventName = defineModel<string>('eventName')

const emit = defineEmits(['save', 'remove', 'close', 'update:mode'])
</script>

<template>
  <div
    class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20 shrink-0"
  >
    <div class="flex items-center gap-5">
      <!-- Icon Box -->
      <div
        class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm"
      >
        <IconSettings size="24" stroke-width="2" />
      </div>

      <!-- Title Area -->
      <div class="flex flex-col">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="text-[10px] font-black uppercase text-indigo-500 tracking-widest">
            Event Editor
          </span>
          <span
            v-if="props.eventId"
            class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200"
          >
            ID: {{ props.eventId }}
          </span>
          <span
            v-else
            class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"
          >
            NEW
          </span>
        </div>
        <input
          v-model="eventName"
          type="text"
          placeholder="Unnamed Event"
          class="text-2xl font-black text-slate-800 tracking-tight bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-300 w-96 leading-none"
        />
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <!-- Mode Toggle -->
      <div class="flex bg-slate-50 border border-slate-200 p-1 rounded-xl mr-4">
        <button
          class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all"
          :class="
            mode === 'code'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          "
          @click="emit('update:mode', 'code')"
        >
          <IconCode size="14" />
          Code
        </button>
        <button
          class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all"
          :class="
            mode === 'visual'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-600'
          "
          @click="emit('update:mode', 'visual')"
        >
          <IconHierarchy2 size="14" />
          Visual
        </button>
      </div>

      <button
        v-if="props.eventId"
        class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 group"
        title="Delete Event"
        @click="emit('remove')"
      >
        <IconTrash size="18" stroke-width="2" />
      </button>

      <div class="w-px h-6 bg-slate-100 mx-1"></div>

      <button
        class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all uppercase tracking-wide"
        @click="emit('close')"
      >
        Cancel
      </button>

      <button
        class="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wide rounded-xl flex items-center gap-2 shadow-lg shadow-slate-900/10 transition-all active:scale-95 active:shadow-none hover:-translate-y-0.5"
        @click="emit('save')"
      >
        <IconDeviceFloppy size="16" />
        <span>Save Changes</span>
      </button>
    </div>
  </div>
</template>
