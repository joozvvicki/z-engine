<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  IconSearch,
  IconPlayerPlay,
  IconZoomIn,
  IconZoomOut,
  IconLayoutGrid,
  IconPlus
} from '@tabler/icons-vue'
import { useNodeScriptStore } from '@ui/stores/nodeScript'
import VisualNode from '@ui/components/nodes/VisualNode.vue'
import NodeConnection from '@ui/components/nodes/NodeConnection.vue'
import NodeEditorPanel from '@ui/components/nodes/NodeEditorPanel.vue'
import type { ZNodeType, ZNode, ZNodeDefinition, ZNodeValueSchema } from '@engine/types'
import { NodeRegistry } from '@engine/nodes'
import {
  NODE_WIDTH,
  NODE_HEADER_HEIGHT,
  NODE_PADDING,
  SOCKET_ROW_HEIGHT,
  SOCKET_OFFSET
} from '@ui/stores/nodeScript'

const store = useNodeScriptStore()
const canvasRef = ref<HTMLElement | null>(null)

// --- VIEWPORT STATE (Local UI triggers) ---
const isPanning = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// --- DRAG NODE STATE ---
const draggingNodeId = ref<string | null>(null)
const dragNodeOffset = ref({ x: 0, y: 0 })

// --- CONNECTION STATE ---
const connectionSource = ref<{ nodeId: string; socketId: string; x: number; y: number } | null>(
  null
)
const mousePos = ref({ x: 0, y: 0 })

// --- HELPER FUNCTIONS ---
const getCategoryColor = (category: ZNodeType): string => {
  const colors: Record<ZNodeType, string> = {
    event: 'bg-purple-500',
    action: 'bg-emerald-500',
    condition: 'bg-blue-500',
    variable: 'bg-amber-500',
    math: 'bg-pink-500',
    logic: 'bg-indigo-500',
    audio: 'bg-rose-500',
    picture: 'bg-cyan-500',
    flow: 'bg-blue-500',
    scene: 'bg-teal-500'
  }
  return colors[category] || 'bg-slate-500'
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    event: '🎯 Events',
    action: '💬 Actions',
    flow: '🌊 Flow Control',
    variable: '📊 Data',
    audio: '🔊 Audio',
    scene: '🗺️ Scene',
    condition: '❓ Conditions',
    math: '🔢 Math',
    logic: '🔧 Logic',
    picture: '🖼️ Pictures'
  }
  return labels[category] || category
}

// --- NODE TEMPLATES FROM REGISTRY ---
const nodeTemplates = computed(() => {
  return Object.entries(NodeRegistry).map(([key, def]) => ({
    key,
    definition: def,
    category: def.category,
    color: getCategoryColor(def.category)
  }))
})

// Group by category for sidebar
const nodesByCategory = computed(() => {
  const grouped: Record<string, typeof nodeTemplates.value> = {}
  nodeTemplates.value.forEach((t) => {
    if (!grouped[t.category]) {
      grouped[t.category] = []
    }
    grouped[t.category].push(t)
  })
  return grouped
})

// Initialize node values with defaults from schemas
const initializeNodeValues = (schemas: ZNodeValueSchema[]): Record<string, unknown> => {
  const values: Record<string, unknown> = {}
  schemas.forEach((schema) => {
    values[schema.key] = schema.default ?? null
  })
  return values
}

// Get node schemas from registry
const getNodeSchemas = (node: ZNode): ZNodeValueSchema[] => {
  const key = node.config?.nodeKey as string
  if (!key || !NodeRegistry[key]) return []
  return NodeRegistry[key].values
}

// Update node value
const updateNodeValue = (nodeId: string, key: string, value: unknown): void => {
  const node = store.nodes.find((n) => n.id === nodeId)
  if (node) {
    if (!node.values) node.values = {}
    node.values[key] = value
  }
}

// --- INITIAL LOAD ---
onMounted(async () => {
  await store.loadAll()
  if (store.nodes.length === 0) {
    // Initial example graph
    store.addNode({
      id: 'node-1',
      type: 'event',
      title: 'Game Start',
      x: 100,
      y: 150,
      inputs: [],
      outputs: [{ id: 'out-1', label: 'Start', type: 'execution' }]
    })
    store.addNode({
      id: 'node-2',
      type: 'action',
      title: 'Show Message',
      x: 400,
      y: 150,
      inputs: [{ id: 'in-1', label: 'In', type: 'execution' }],
      outputs: [{ id: 'out-next', label: 'Next', type: 'execution' }],
      values: { text: 'Hello World!' }
    })
    store.addConnection({
      id: 'c1',
      fromNode: 'node-1',
      fromSocket: 'out-1',
      toNode: 'node-2',
      toSocket: 'in-1'
    })
  }
})

// --- HELPERS ---
const getSocketGlobalPos = (
  nodeId: string,
  socketId: string,
  isInput: boolean
): { x: number; y: number } => {
  const node = store.nodes.find((n) => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }

  const list = isInput ? node.inputs : node.outputs
  const index = list.findIndex((s) => s.id === socketId)

  const relativeY =
    NODE_HEADER_HEIGHT + NODE_PADDING + index * SOCKET_ROW_HEIGHT + SOCKET_ROW_HEIGHT / 2
  const relativeX = isInput ? -SOCKET_OFFSET : NODE_WIDTH + SOCKET_OFFSET

  return {
    x: node.x + relativeX,
    y: node.y + relativeY
  }
}

// --- HANDLERS ---
const handleWheel = (e: WheelEvent): void => {
  if (e.ctrlKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    store.zoom = Math.min(Math.max(0.5, store.zoom * delta), 2)
  } else {
    store.pan.x -= e.deltaX
    store.pan.y -= e.deltaY
  }
}

const startPan = (e: MouseEvent): void => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }
}

const startDragNode = (e: MouseEvent, node: ZNode): void => {
  if (e.button !== 0 || e.altKey) return
  e.stopPropagation()
  const rect = canvasRef.value?.getBoundingClientRect()
  const mouseX = e.clientX - (rect?.left || 0)
  const mouseY = e.clientY - (rect?.top || 0)

  draggingNodeId.value = node.id
  dragNodeOffset.value = {
    x: mouseX / store.zoom - node.x,
    y: mouseY / store.zoom - node.y
  }
}

const handleMouseMove = (e: MouseEvent): void => {
  mousePos.value = { x: e.clientX, y: e.clientY }

  if (isPanning.value) {
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y
    store.pan.x += dx
    store.pan.y += dy
    dragStart.value = { x: e.clientX, y: e.clientY }
  }

  if (draggingNodeId.value) {
    const rect = canvasRef.value?.getBoundingClientRect()
    const mouseX = e.clientX - (rect?.left || 0)
    const mouseY = e.clientY - (rect?.top || 0)

    const x = mouseX / store.zoom - dragNodeOffset.value.x
    const y = mouseY / store.zoom - dragNodeOffset.value.y
    store.updateNodePosition(draggingNodeId.value, x, y)
  }
}

const handleMouseUp = (): void => {
  isPanning.value = false
  draggingNodeId.value = null
  connectionSource.value = null
}

const handleSocketDragStart = (
  nodeId: string,
  socketId: string,
  pos: { x: number; y: number }
): void => {
  connectionSource.value = { nodeId, socketId, x: pos.x, y: pos.y }
}

const handleSocketDrop = (toNodeId: string, toSocketId: string): void => {
  if (!connectionSource.value) return

  store.addConnection({
    id: `c-${Date.now()}`,
    fromNode: connectionSource.value.nodeId,
    fromSocket: connectionSource.value.socketId,
    toNode: toNodeId,
    toSocket: toSocketId
  })
  connectionSource.value = null
}

const activeDragPath = computed((): string => {
  if (!connectionSource.value) return ''
  const start = getSocketGlobalPos(
    connectionSource.value.nodeId,
    connectionSource.value.socketId,
    false
  )

  // Convert current mouse to board coordinates
  const rect = canvasRef.value?.getBoundingClientRect()
  const mouseX = mousePos.value.x - (rect?.left || 0)
  const mouseY = mousePos.value.y - (rect?.top || 0)

  const endX = (mouseX - store.pan.x) / store.zoom
  const endY = (mouseY - store.pan.y) / store.zoom

  const dist = Math.abs(endX - start.x)
  const controlOffset = Math.max(dist * 0.5, 50)

  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`
})

const addNewNode = (key: string, def: ZNodeDefinition): void => {
  const id = `node-${Date.now()}`

  store.addNode({
    id,
    type: def.category,
    title: def.title,
    x: (400 - store.pan.x) / store.zoom,
    y: (300 - store.pan.y) / store.zoom,
    inputs: JSON.parse(JSON.stringify(def.inputs)),
    outputs: JSON.parse(JSON.stringify(def.outputs)),
    values: initializeNodeValues(def.values),
    config: { nodeKey: key }
  } as ZNode)
}
</script>

<template>
  <div class="flex h-full w-full bg-[#f8f9fc] text-slate-800 font-sans overflow-hidden relative">
    <!-- Sidebar -->
    <aside
      class="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
    >
      <div class="p-4 border-b border-slate-100">
        <div class="flex items-center gap-2 mb-4">
          <div class="bg-indigo-600 p-1.5 rounded-lg text-white">
            <IconLayoutGrid :size="16" stroke-width="2.5" />
          </div>
          <span class="font-black text-xs uppercase tracking-widest text-slate-800"
            >Visual Scripter</span
          >
        </div>
        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            :size="14"
          />
          <input
            type="text"
            placeholder="Search nodes..."
            class="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <div v-for="(nodes, category) in nodesByCategory" :key="category" class="space-y-3">
          <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {{ getCategoryLabel(category) }}
          </h3>
          <div class="space-y-2">
            <button
              v-for="item in nodes"
              :key="item.key"
              class="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/50 hover:bg-white hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
              @click="addNewNode(item.key, item.definition)"
            >
              <div class="w-2.5 h-2.5 rounded-full" :class="item.color"></div>
              <span class="text-xs font-bold text-slate-600 group-hover:text-slate-900">{{
                item.definition.title
              }}</span>
              <IconPlus
                size="12"
                class="ml-auto text-slate-300 group-hover:text-indigo-500 transition-colors"
              />
            </button>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-50 bg-slate-50/30">
        <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[9px] font-black uppercase text-slate-400">Viewport Stats</span>
            <div class="flex gap-1">
              <div class="w-1 h-1 rounded-full bg-emerald-400"></div>
              <div class="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
            <span class="opacity-60">Nodes:</span> <span>{{ store.nodes.length }}</span>
            <span class="opacity-60">Wires:</span> <span>{{ store.connections.length }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Canvas -->
    <main
      ref="canvasRef"
      class="flex-1 relative overflow-hidden bg-[#f8f9fc] cursor-grab active:cursor-grabbing"
      @mousedown="startPan"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
    >
      <!-- Grid Background -->
      <div
        class="absolute inset-0 pointer-events-none opacity-40"
        :style="{
          transform: `translate(${store.pan.x}px, ${store.pan.y}px) scale(${store.zoom})`,
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }"
      ></div>

      <!-- Zoom/Pan Wrapper -->
      <div
        class="absolute left-0 top-0 w-full h-full origin-top-left"
        :style="{ transform: `translate(${store.pan.x}px, ${store.pan.y}px) scale(${store.zoom})` }"
      >
        <!-- Wires (Connections) -->
        <svg
          class="absolute left-0 top-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible z-0"
        >
          <g>
            <NodeConnection
              v-for="c in store.connections"
              :key="c.id"
              :connection="c"
              :from-node="store.nodes.find((n) => n.id === c.fromNode)!"
              :to-node="store.nodes.find((n) => n.id === c.toNode)!"
              :scale="store.zoom"
              @delete="store.removeConnection(c.id)"
            />
            <!-- Currently dragging wire -->
            <path
              v-if="connectionSource"
              :d="activeDragPath"
              fill="none"
              stroke="#6366f1"
              stroke-width="3"
              stroke-dasharray="8 4"
              opacity="0.6"
            />
          </g>
        </svg>

        <!-- Nodes -->
        <div class="relative z-10">
          <VisualNode
            v-for="node in store.nodes"
            :key="node.id"
            :node="node"
            :scale="store.zoom"
            @drag-start="(e) => startDragNode(e, node)"
            @delete="store.removeNode(node.id)"
            @socket-drag-start="(id, pos) => handleSocketDragStart(node.id, id, pos)"
            @socket-drop="(id) => handleSocketDrop(node.id, id)"
          >
            <template #content>
              <!-- Dynamic node value editor based on registry schemas -->
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

      <!-- Overlays -->
      <div class="absolute bottom-6 right-6 flex gap-2">
        <div
          class="bg-white border border-slate-200 rounded-xl flex items-center p-1 shadow-lg shadow-slate-200/50"
        >
          <button
            class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
            @click="store.zoom = Math.max(0.5, store.zoom - 0.1)"
          >
            <IconZoomOut :size="18" />
          </button>
          <span class="text-xs font-black text-slate-600 w-12 text-center tracking-tighter"
            >{{ Math.round(store.zoom * 100) }}%</span
          >
          <button
            class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
            @click="store.zoom = Math.min(2, store.zoom + 0.1)"
          >
            <IconZoomIn :size="18" />
          </button>
        </div>
      </div>

      <div class="absolute top-6 right-6 flex gap-3">
        <button
          class="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-2xl shadow-xl shadow-slate-200/20 flex items-center gap-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-slate-200"
          @click="store.saveAll"
        >
          Save Graph
        </button>
        <button
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center gap-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-indigo-500/50"
        >
          <IconPlayerPlay :size="14" class="fill-current" />
          Compile
        </button>
      </div>

      <!-- Instructions Overlay -->
      <div class="absolute top-6 left-6 pointer-events-none">
        <div
          class="bg-slate-900/80 backdrop-blur-md text-white/70 px-4 py-3 rounded-2xl border border-white/10 text-[10px] font-bold space-y-1 shadow-2xl"
        >
          <div class="flex items-center gap-2">
            <div class="w-1 h-1 rounded-full bg-indigo-400"></div>
            <span>Left Click drag to move nodes</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-1 h-1 rounded-full bg-indigo-400"></div>
            <span>Right Click / Alt+Drag to pan</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-1 h-1 rounded-full bg-indigo-400"></div>
            <span>Ctrl + Scroll to zoom</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
