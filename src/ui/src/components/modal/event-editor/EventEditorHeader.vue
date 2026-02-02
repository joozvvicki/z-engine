<script setup lang="ts">
import { IconDeviceFloppy, IconTrash } from '@tabler/icons-vue'

const props = defineProps<{
  eventId?: string | null
}>()

const eventName = defineModel<string>('eventName')

const emit = defineEmits(['save', 'remove', 'close'])
</script>

<template>
  <div
    class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10"
  >
    <div class="flex items-center gap-6">
      <div class="flex flex-col">
        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Event ID</span>
        <span class="font-mono text-xs text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">{{
          props.eventId || 'NEW'
        }}</span>
      </div>

      <div class="h-8 w-px bg-slate-200 mx-2"></div>

      <div class="flex flex-col gap-1 w-64">
        <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</label>
        <input
          v-model="eventName"
          type="text"
          placeholder="Event Name"
          class="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300"
        />
      </div>
    </div>

    <div class="flex gap-3">
      <button
        v-if="props.eventId"
        class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase rounded-lg flex items-center gap-2 transition-colors"
        @click="emit('remove')"
      >
        <IconTrash size="16" /> Delete
      </button>
      <button
        class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase rounded-lg transition-colors border border-transparent"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        class="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase rounded-lg flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all active:scale-95"
        @click="emit('save')"
      >
        <IconDeviceFloppy size="18" /> Save Event
      </button>
    </div>
  </div>
</template>
