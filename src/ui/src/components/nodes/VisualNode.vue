<script setup lang="ts">
import { computed } from 'vue'
import {
  IconBolt,
  IconArrowMerge,
  IconMessage,
  IconVariable,
  IconX,
  IconMathFunction,
  IconSettings
} from '@tabler/icons-vue'
import type { ZNode } from '@engine/types'
import NodeSocket from './NodeSocket.vue'
import {
  NODE_WIDTH,
  NODE_HEADER_HEIGHT,
  NODE_PADDING,
  SOCKET_ROW_HEIGHT
} from '@ui/stores/nodeScript'

const props = defineProps<{
  node: ZNode
  scale: number
}>()

const emit = defineEmits<{
  (e: 'drag-start', e2: MouseEvent): void
  (e: 'delete'): void
  (e: 'socket-drag-start', socketId: string, pos: { x: number; y: number }): void
  (e: 'socket-drag-over', socketId: string): void
  (e: 'socket-drop', socketId: string): void
}>()

const borderClass = computed(() => {
  switch (props.node.type) {
    case 'event':
      return 'border-t-purple-500'
    case 'condition':
      return 'border-t-blue-500'
    case 'action':
      return 'border-t-emerald-500'
    case 'variable':
      return 'border-t-amber-500'
    case 'math':
      return 'border-t-pink-500'
    case 'logic':
      return 'border-t-indigo-500'
    default:
      return 'border-t-slate-500'
  }
})

const headerClass = computed(() => {
  switch (props.node.type) {
    case 'event':
      return 'bg-purple-50 text-purple-700'
    case 'condition':
      return 'bg-blue-50 text-blue-700'
    case 'action':
      return 'bg-emerald-50 text-emerald-700'
    case 'variable':
      return 'bg-amber-50 text-amber-700'
    case 'math':
      return 'bg-pink-50 text-pink-700'
    case 'logic':
      return 'bg-indigo-50 text-indigo-700'
    default:
      return 'bg-slate-50 text-slate-700'
  }
})

const iconClass = computed(() => {
  switch (props.node.type) {
    case 'event':
      return 'text-purple-600'
    case 'condition':
      return 'text-blue-600'
    case 'action':
      return 'text-emerald-600'
    case 'variable':
      return 'text-amber-600'
    case 'math':
      return 'text-pink-600'
    case 'logic':
      return 'text-indigo-600'
    default:
      return 'text-slate-600'
  }
})

const getIcon = computed(() => {
  switch (props.node.type) {
    case 'event':
      return IconBolt
    case 'condition':
      return IconArrowMerge
    case 'action':
      return IconMessage
    case 'variable':
      return IconVariable
    case 'math':
      return IconMathFunction
    case 'logic':
      return IconSettings
    default:
      return IconSettings
  }
})

const socketContainerStyle = {
  top: NODE_HEADER_HEIGHT + NODE_PADDING + 'px'
}
</script>

<template>
  <div
    class="absolute bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-200 border-t-[3px] select-none group hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-[shadow,transform,border-color] duration-200"
    :class="borderClass"
    :style="{
      left: node.x + 'px',
      top: node.y + 'px',
      width: NODE_WIDTH + 'px',
      minHeight: NODE_HEADER_HEIGHT + 'px'
    }"
    @mousedown="(e) => emit('drag-start', e)"
  >
    <!-- Header -->
    <div
      class="px-3.5 rounded-t-[14px] flex items-center justify-between border-b border-white/40"
      :class="headerClass"
      :style="{ height: NODE_HEADER_HEIGHT + 'px' }"
    >
      <div class="flex items-center gap-2.5">
        <component :is="getIcon" :size="13" :class="iconClass" stroke-width="2.5" />
        <span class="text-[10px] font-black uppercase tracking-wider">{{ node.title }}</span>
      </div>
      <button
        class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 hover:bg-red-50 rounded"
        @click.stop="emit('delete')"
      >
        <IconX :size="12" />
      </button>
    </div>

    <!-- Inputs (Absolute) -->
    <div
      v-if="node.inputs.length > 0"
      class="absolute left-0 w-full pointer-events-none"
      :style="socketContainerStyle"
    >
      <div
        v-for="input in node.inputs"
        :key="input.id"
        class="flex items-center"
        :style="{ height: SOCKET_ROW_HEIGHT + 'px' }"
      >
        <NodeSocket
          class="pointer-events-auto"
          :node-id="node.id"
          :socket="input"
          :is-input="true"
          @drag-over="emit('socket-drag-over', input.id)"
          @drop="emit('socket-drop', input.id)"
        />
      </div>
    </div>

    <!-- Outputs (Absolute) -->
    <div
      v-if="node.outputs.length > 0"
      class="absolute left-0 w-full pointer-events-none"
      :style="socketContainerStyle"
    >
      <div
        v-for="output in node.outputs"
        :key="output.id"
        class="flex items-center justify-end"
        :style="{ height: SOCKET_ROW_HEIGHT + 'px' }"
      >
        <NodeSocket
          class="pointer-events-auto"
          :node-id="node.id"
          :socket="output"
          :is-input="false"
          @drag-start="(pos) => emit('socket-drag-start', output.id, pos)"
        />
      </div>
    </div>

    <!-- Content (Normal flow with padding) -->
    <div class="px-8 pb-6" :style="{ paddingTop: NODE_PADDING + 6 + 'px' }">
      <slot name="content"></slot>
    </div>
  </div>
</template>
