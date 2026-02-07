<script setup lang="ts">
import { computed } from 'vue'
import type { ZConnection, ZNode } from '@engine/types'
import {
  NODE_WIDTH,
  NODE_HEADER_HEIGHT,
  NODE_PADDING,
  SOCKET_ROW_HEIGHT,
  NODE_BORDER_TOP,
  NODE_BORDER_SIDE
} from '@ui/stores/nodeScript'

const props = defineProps<{
  connection: ZConnection
  fromNode: ZNode
  toNode: ZNode
  scale: number
}>()

const emit = defineEmits<{
  (e: 'delete'): void
}>()

const path = computed(() => {
  // Find socket positions
  const fromSocket = props.fromNode.outputs.find((s) => s.id === props.connection.fromSocket)
  const toSocket = props.toNode.inputs.find((s) => s.id === props.connection.toSocket)

  if (!fromSocket || !toSocket) return ''

  const fromIdx = props.fromNode.outputs.indexOf(fromSocket)
  const toIdx = props.toNode.inputs.indexOf(toSocket)

  // Calculate socket positions in board space
  // Output is on the right edge: width - border
  const fromLocalX = NODE_WIDTH - NODE_BORDER_SIDE
  const fromLocalY =
    NODE_BORDER_TOP +
    NODE_HEADER_HEIGHT +
    NODE_PADDING +
    fromIdx * SOCKET_ROW_HEIGHT +
    SOCKET_ROW_HEIGHT / 2

  // Input is on the left edge: border
  const toLocalX = NODE_BORDER_SIDE
  const toLocalY =
    NODE_BORDER_TOP +
    NODE_HEADER_HEIGHT +
    NODE_PADDING +
    toIdx * SOCKET_ROW_HEIGHT +
    SOCKET_ROW_HEIGHT / 2

  const startX = props.fromNode.x + fromLocalX
  const startY = props.fromNode.y + fromLocalY
  const endX = props.toNode.x + toLocalX
  const endY = props.toNode.y + toLocalY

  // Bezier curve control points
  const controlOffset = Math.min(Math.abs(endX - startX) / 2, 100)
  const cp1X = startX + controlOffset
  const cp1Y = startY
  const cp2X = endX - controlOffset
  const cp2Y = endY

  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
})

const isExecution = computed(() => {
  const socket = props.fromNode.outputs.find((s) => s.id === props.connection.fromSocket)
  return socket?.type === 'execution'
})
</script>

<template>
  <g class="group pointer-events-none">
    <!-- Background hit area -->
    <path
      :d="path"
      fill="none"
      stroke="transparent"
      stroke-width="12"
      class="pointer-events-auto cursor-pointer"
      @click="emit('delete')"
    />

    <!-- Main line -->
    <path
      :d="path"
      fill="none"
      :stroke="isExecution ? '#94a3b8' : '#60a5fa'"
      :stroke-width="isExecution ? 3 : 2"
      class="group-hover:stroke-indigo-500 transition-colors duration-200"
      :stroke-dasharray="isExecution ? 'none' : '4 4'"
    />

    <!-- Flow animation for execution lines -->
    <g v-if="isExecution">
      <circle r="2.5" fill="#6366f1">
        <animateMotion dur="2.5s" repeatCount="indefinite" :path="path" />
      </circle>
      <!-- Glow -->
      <circle r="5" fill="#6366f1" opacity="0.3">
        <animateMotion dur="2.5s" repeatCount="indefinite" :path="path" />
      </circle>
    </g>
  </g>
</template>
