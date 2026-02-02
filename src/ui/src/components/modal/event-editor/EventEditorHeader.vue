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
    class="px-6 py-2 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm"
  >
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
        <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">ID</span>
        <span
          class="font-mono text-[10px] text-slate-600 font-bold px-1.5 py-0.5 rounded bg-white shadow-sm"
          >{{ props.eventId || 'NEW' }}</span
        >
      </div>

      <div class="h-4 w-px bg-slate-200"></div>

      <div class="flex items-center gap-3">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Name</label>
        <input
          v-model="eventName"
          type="text"
          placeholder="Event Name"
          class="w-48 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 outline-none transition-all placeholder:text-slate-300"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <button
        v-if="props.eventId"
        class="px-3 py-1.5 hover:bg-red-50 text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-tight rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
        @click="emit('remove')"
      >
        <IconTrash size="14" /> Delete
      </button>
      <div class="w-px h-4 bg-slate-100 self-center mx-1"></div>
      <button
        class="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all border border-slate-200 active:scale-95"
        @click="emit('close')"
      >
        Cancel
      </button>
      <button
        class="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-tight rounded-lg flex items-center gap-2 shadow-md shadow-slate-900/10 transition-all active:scale-95 active:shadow-none"
        @click="emit('save')"
      >
        <IconDeviceFloppy size="14" /> Save Event
      </button>
    </div>
  </div>
</template>
