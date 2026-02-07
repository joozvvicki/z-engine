<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NODE_WIDTH,
  NODE_HEADER_HEIGHT,
  NODE_PADDING,
  SOCKET_ROW_HEIGHT,
  SOCKET_OFFSET,
  NODE_BORDER_TOP,
  NODE_BORDER_SIDE
} from '@ui/stores/nodeScript'
import type { ZNode, ZConnection, ZNodeValueSchema } from '@engine/types'
import { NodeRegistry } from '@engine/nodes'
import VisualNode from './VisualNode.vue'
import NodeConnection from './NodeConnection.vue'
import NodeEditorPanel from './NodeEditorPanel.vue'

const props = defineProps<{
  nodes: ZNode[]
  connections: ZConnection[]
  pan: { x: number; y: number }
  zoom: number
}>()

const emit = defineEmits<{
  (e: 'update:nodes', value: ZNode[]): void
  (e: 'update:connections', value: ZConnection[]): void
  (e: 'update:pan', value: { x: number; y: number }): void
  (e: 'update:zoom', value: number): void
  (e: 'node-click', nodeId: string): void
  (e: 'node-delete', nodeId: string): void
  (e: 'connection-delete', connectionId: string): void
  (e: 'connection-add', connection: ZConnection): void
  (e: 'node-move', nodeId: string, x: number, y: number): void
}>()

const canvasRef = ref<HTMLElement | null>(null)

// --- INTERACTION STATE ---
const isPanning = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const draggingNodeId = ref<string | null>(null)
const dragNodeOffset = ref({ x: 0, y: 0 })
const connectionSource = ref<{ nodeId: string; socketId: string; x: number; y: number } | null>(
  null
)
const mousePos = ref({ x: 0, y: 0 })

// --- HELPERS ---
const getNodeSchemas = (node: ZNode): ZNodeValueSchema[] => {
  const key = node.config?.nodeKey as string
  if (!key || !NodeRegistry[key]) return []
  const schemas = NodeRegistry[key].values
  return schemas.filter((s) => (s.visible ? s.visible(node.values || {}) : true))
}

const getSocketGlobalPos = (
  nodeId: string,
  socketId: string,
  isInput: boolean
): { x: number; y: number } => {
  const node = props.nodes.find((n) => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }

  const list = isInput ? node.inputs : node.outputs
  const index = list.findIndex((s) => s.id === socketId)

  const relativeY =
    NODE_BORDER_TOP +
    NODE_HEADER_HEIGHT +
    NODE_PADDING +
    index * SOCKET_ROW_HEIGHT +
    SOCKET_ROW_HEIGHT / 2
  const relativeX = isInput
    ? NODE_BORDER_SIDE - SOCKET_OFFSET
    : NODE_WIDTH - NODE_BORDER_SIDE + SOCKET_OFFSET

  return {
    x: node.x + relativeX,
    y: node.y + relativeY
  }
}

const activeDragPath = computed((): string => {
  if (!connectionSource.value) return ''
  const start = getSocketGlobalPos(
    connectionSource.value.nodeId,
    connectionSource.value.socketId,
    false
  )

  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return ''
  const mouseX = mousePos.value.x - rect.left
  const mouseY = mousePos.value.y - rect.top

  const endX = (mouseX - props.pan.x) / props.zoom
  const endY = (mouseY - props.pan.y) / props.zoom

  const dist = Math.abs(endX - start.x)
  const controlOffset = Math.max(dist * 0.5, 50)

  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`
})

// --- HANDLERS ---
const handleMouseDown = (e: MouseEvent): void => {
  if (e.target === canvasRef.value) {
    if (e.button === 0 || e.button === 1) {
      isPanning.value = true
      dragStart.value = { x: e.clientX, y: e.clientY }
    }
  }
}

const handleMouseMove = (e: MouseEvent): void => {
  mousePos.value = { x: e.clientX, y: e.clientY }

  if (isPanning.value) {
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y
    emit('update:pan', { x: props.pan.x + dx, y: props.pan.y + dy })
    dragStart.value = { x: e.clientX, y: e.clientY }
  }

  if (draggingNodeId.value) {
    const rect = canvasRef.value?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const x = mouseX / props.zoom - dragNodeOffset.value.x
    const y = mouseY / props.zoom - dragNodeOffset.value.y
    emit('node-move', draggingNodeId.value, x, y)
  }
}

const handleMouseUp = (): void => {
  isPanning.value = false
  draggingNodeId.value = null
  connectionSource.value = null
}

const handleWheel = (e: WheelEvent): void => {
  if (e.ctrlKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(Math.max(0.25, props.zoom * delta), 2)
    emit('update:zoom', newZoom)
  } else {
    emit('update:pan', {
      x: props.pan.x - e.deltaX,
      y: props.pan.y - e.deltaY
    })
  }
}

const handleNodeDragStart = (nodeId: string, e: MouseEvent): void => {
  e.stopPropagation()
  const node = props.nodes.find((n) => n.id === nodeId)
  const rect = canvasRef.value?.getBoundingClientRect()
  if (node && rect) {
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    draggingNodeId.value = nodeId
    dragNodeOffset.value = {
      x: mouseX / props.zoom - node.x,
      y: mouseY / props.zoom - node.y
    }
  }
  emit('node-click', nodeId)
}

const handleSocketDragStart = (
  nodeId: string,
  socketId: string,
  pos: { x: number; y: number }
): void => {
  connectionSource.value = { nodeId, socketId, ...pos }
}

const handleSocketDrop = (targetNodeId: string, targetSocketId: string): void => {
  if (!connectionSource.value) return
  if (connectionSource.value.nodeId === targetNodeId) return

  emit('connection-add', {
    id: `conn_${Date.now()}`,
    fromNode: connectionSource.value.nodeId,
    fromSocket: connectionSource.value.socketId,
    toNode: targetNodeId,
    toSocket: targetSocketId
  })
  connectionSource.value = null
}

const updateNodeValue = (nodeId: string, key: string, value: unknown): void => {
  const nodeIndex = props.nodes.findIndex((n) => n.id === nodeId)
  if (nodeIndex !== -1) {
    const newNodes = [...props.nodes]
    newNodes[nodeIndex] = {
      ...newNodes[nodeIndex],
      values: {
        ...(newNodes[nodeIndex].values || {}),
        [key]: value
      }
    }
    emit('update:nodes', newNodes)
  }
}

// Global listeners
onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div
    ref="canvasRef"
    class="relative h-full w-full overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing"
    @mousedown="handleMouseDown"
    @wheel="handleWheel"
  >
    <!-- Grid Background -->
    <div
      class="absolute inset-0 pointer-events-none opacity-40"
      :style="{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }"
    ></div>

    <!-- Zoom/Pan Wrapper -->
    <div
      class="absolute left-0 top-0 w-full h-full origin-top-left"
      :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
    >
      <!-- Connections Layer -->
      <svg
        class="absolute left-0 top-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible"
      >
        <NodeConnection
          v-for="conn in connections"
          :key="conn.id"
          :connection="conn"
          :from-node="nodes.find((n) => n.id === conn.fromNode)!"
          :to-node="nodes.find((n) => n.id === conn.toNode)!"
          :scale="zoom"
          @delete="emit('connection-delete', conn.id)"
        />

        <!-- Active dragging wire -->
        <path
          v-if="connectionSource"
          :d="activeDragPath"
          fill="none"
          stroke="#6366f1"
          stroke-width="3"
          stroke-dasharray="8 4"
          opacity="0.6"
        />
      </svg>

      <!-- Nodes Layer -->
      <div class="relative z-10">
        <VisualNode
          v-for="node in nodes"
          :key="node.id"
          :node="node"
          :scale="zoom"
          @click="emit('node-click', node.id)"
          @drag-start="(e) => handleNodeDragStart(node.id, e)"
          @socket-drag-start="(socketId, pos) => handleSocketDragStart(node.id, socketId, pos)"
          @socket-drop="(socketId) => handleSocketDrop(node.id, socketId)"
          @delete="emit('node-delete', node.id)"
        >
          <template #content>
            <div class="space-y-2.5">
              <NodeEditorPanel
                v-for="schema in getNodeSchemas(node)"
                :key="schema.key"
                :schema="schema"
                :model-value="node.values?.[schema.key]"
                @update:model-value="updateNodeValue(node.id, schema.key, $event)"
              />
            </div>
          </template>
        </VisualNode>
      </div>
    </div>

    <!-- Toolbar Slot -->
    <div class="absolute top-4 right-4 flex gap-2">
      <slot name="toolbar"></slot>
    </div>

    <!-- Zoom Controls -->
    <div class="absolute bottom-6 right-6 flex gap-2">
      <div
        class="bg-white border border-slate-200 rounded-xl flex items-center p-1 shadow-lg shadow-slate-200/50"
      >
        <button
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
          @click="emit('update:zoom', Math.max(0.25, zoom - 0.1))"
        >
          -
        </button>
        <span class="text-xs font-black text-slate-600 w-12 text-center tracking-tighter"
          >{{ Math.round(zoom * 100) }}%</span
        >
        <button
          class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
          @click="emit('update:zoom', Math.min(2, zoom + 0.1))"
        >
          +
        </button>
      </div>
    </div>

    <!-- HUD Slot -->
    <div class="absolute top-6 left-6 pointer-events-none">
      <slot name="hud"></slot>
    </div>
  </div>
</template>
