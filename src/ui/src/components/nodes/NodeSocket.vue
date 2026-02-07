<script setup lang="ts">
import { computed } from 'vue'
import type { ZNodeSocket } from '@engine/types'

const props = defineProps<{
  nodeId: string
  socket: ZNodeSocket
  isInput: boolean
}>()

const emit = defineEmits<{
  (e: 'drag-start', pos: { x: number; y: number }): void
  (e: 'drag-over', pos: { x: number; y: number }): void
  (e: 'drop'): void
}>()

const socketClass = computed(() => {
  const base =
    'w-3.5 h-3.5 border bg-white hover:border-indigo-500 hover:ring-4 hover:ring-indigo-500/20 transition-all cursor-crosshair flex items-center justify-center shadow-sm absolute z-30 top-1/2 -translate-y-1/2'
  if (props.socket.type === 'execution') {
    return `${base} rotate-45 border-slate-300`
  }
  return `${base} rounded-full border-blue-300`
})

const handleMouseDown = (e: MouseEvent): void => {
  if (props.isInput) return
  e.stopPropagation()
  emit('drag-start', { x: e.clientX, y: e.clientY })
}

const handleMouseEnter = (): void => {
  if (props.isInput) {
    emit('drag-over', { x: 0, y: 0 })
  }
}

const handleMouseUp = (): void => {
  if (props.isInput) {
    emit('drop')
  }
}
</script>

<template>
  <div
    class="relative h-full flex items-center gap-2"
    :class="isInput ? 'flex-row pl-4' : 'flex-row-reverse pr-4'"
  >
    <!-- Socket Diamond/Circle (Centered on Edge) -->
    <div
      :class="socketClass"
      :style="{
        left: isInput ? '-7px' : 'auto',
        right: isInput ? 'auto' : '-7px'
      }"
      @mousedown="handleMouseDown"
      @mouseenter="handleMouseEnter"
      @mouseup="handleMouseUp"
    >
      <div
        v-if="socket.type === 'execution'"
        class="w-1.5 h-1.5 bg-slate-300 rounded-full group-hover:bg-indigo-500 transition-colors"
      ></div>
      <div
        v-else
        class="w-1.5 h-1.5 bg-blue-300 rounded-full group-hover:bg-indigo-500 transition-colors"
      ></div>
    </div>

    <!-- Label -->
    <span
      class="text-[9px] text-slate-400 uppercase font-black tracking-widest select-none transition-colors group-hover:text-slate-600"
    >
      {{ socket.label }}
    </span>
  </div>
</template>
