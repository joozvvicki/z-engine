<script setup lang="ts">
import { computed } from 'vue'
import type { ZConnection, ZNode } from '@engine/types'
import {
  NODE_WIDTH,
  NODE_HEADER_HEIGHT,
  NODE_PADDING,
  SOCKET_ROW_HEIGHT,
  SOCKET_OFFSET
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

const getSocketPosition = (
  node: ZNode,
  socketId: string,
  isInput: boolean
): { x: number; y: number } => {
  const list = isInput ? node.inputs : node.outputs
  const index = list.findIndex((s) => s.id === socketId)

  // Use unified constants
  const relativeY =
    NODE_HEADER_HEIGHT + NODE_PADDING + index * SOCKET_ROW_HEIGHT + SOCKET_ROW_HEIGHT / 2
  const relativeX = isInput ? -SOCKET_OFFSET : NODE_WIDTH + SOCKET_OFFSET

  return {
    x: node.x + relativeX,
    y: node.y + relativeY
  }
}

const path = computed(() => {
  const start = getSocketPosition(props.fromNode, props.connection.fromSocket, false)
  const end = getSocketPosition(props.toNode, props.connection.toSocket, true)

  const dist = Math.abs(end.x - start.x)
  const controlOffset = Math.max(dist * 0.4 + 20, 40)

  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`
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
