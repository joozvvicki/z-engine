<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { IconDeviceFloppy, IconX, IconGhost } from '@tabler/icons-vue'

const props = defineProps<{
  x: number
  y: number
  eventId?: string | null
}>()

const emit = defineEmits(['close'])
const store = useEditorStore()

const existingEvent = store.maps
  .find((map) => map.id === store.activeMapID)
  ?.events?.find((e) => e.id === props.eventId)

const eventName = ref(
  existingEvent?.name ||
    `EV${store.maps.find((map) => map.id === store.activeMapID)?.events?.length || 0 + 1}`
)
const eventGraphic = ref(existingEvent?.graphic || store.selection)

const save = (): void => {
  if (props.eventId) {
    store.updateEvent(props.eventId, { name: eventName.value, graphic: eventGraphic.value })
  } else {
    store.addEvent(props.x, props.y, { name: eventName.value, graphic: eventGraphic.value })
  }
  emit('close')
}
</script>

<template>
  <div
    class="absolute inset-0 z-100 flex items-center justify-center bg-white/60 backdrop-blur-xs rounded-xl"
  >
    <div class="bg-white border border-white/10 rounded-lg w-[400px] shadow-2xl overflow-hidden">
      <div class="p-3 border-b border-white/5 flex justify-between items-center">
        <span class="text-[10px] font-bold uppercase tracking-widest text-black"
          >Event Editor
        </span>
        <button @click="emit('close')"><IconX size="16" class="text-black" /></button>
      </div>

      <div class="p-6 space-y-4">
        <div class="space-y-1">
          <label class="text-[10px] uppercase font-bold text-black">Event Name</label>
          <input
            v-model="eventName"
            type="text"
            class="w-full text-black/20 bg-white/20 border border-white/10 rounded p-2 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div class="space-y-1">
          <label class="text-[10px] uppercase font-bold text-black">Graphic</label>
          <div
            class="h-24 bg-black/40 border border-dashed border-white/10 rounded flex items-center justify-center relative overflow-hidden"
          >
            <template v-if="eventGraphic">
              <span class="text-[10px] text-black uppercase font-bold"
                >{{ eventGraphic.tilesetId }} [{{ eventGraphic.x }},{{ eventGraphic.y }}]</span
              >
            </template>
            <IconGhost v-else size="32" class="text-white/5 opacity-20" />
          </div>
          <p class="text-[9px] text-slate-600 italic">
            Current selection from tileset will be used as graphic.
          </p>
        </div>
      </div>

      <div class="p-3 bg-white/5 border-t border-white/5 flex gap-2">
        <button
          class="flex-1 py-2 text-[10px] font-bold uppercase text-slate-400 hover:bg-white/5 transition-colors"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="flex-2 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase flex items-center justify-center gap-2"
          @click="save"
        >
          <IconDeviceFloppy size="14" /> Save Event
        </button>
      </div>
    </div>
  </div>
</template>
