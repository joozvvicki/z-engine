<script setup lang="ts">
import { ref } from 'vue'
import {
  IconSearch,
  IconPlayerPlay,
  IconVariable,
  IconBolt,
  IconArrowMerge,
  IconMessage,
  IconZoomIn,
  IconZoomOut,
  IconX,
  IconLayoutGrid
} from '@tabler/icons-vue'

// --- TYPY DANYCH ---
type NodeType = 'event' | 'action' | 'condition' | 'variable'

interface NodeSocket {
  id: string
  label: string
  type: 'execution' | 'data'
}

interface NodeData {
  id: string
  type: NodeType
  title: string
  x: number
  y: number
  inputs: NodeSocket[]
  outputs: NodeSocket[]
  values?: Record<string, any>
}

interface Connection {
  id: string
  fromNode: string
  fromSocket: string
  toNode: string
  toSocket: string
}

// --- DANE PRZYKŁADOWE ---
const nodes = ref<NodeData[]>([
  {
    id: 'node-1',
    type: 'event',
    title: 'Game Start',
    x: 100,
    y: 150,
    inputs: [],
    outputs: [{ id: 'out-1', label: 'Start', type: 'execution' }]
  },
  {
    id: 'node-2',
    type: 'condition',
    title: 'Check HP < 10',
    x: 400,
    y: 150,
    inputs: [
      { id: 'in-1', label: 'In', type: 'execution' },
      { id: 'in-hp', label: 'Current HP', type: 'data' }
    ],
    outputs: [
      { id: 'true', label: 'True', type: 'execution' },
      { id: 'false', label: 'False', type: 'execution' }
    ]
  },
  {
    id: 'node-3',
    type: 'action',
    title: 'Show Dialog',
    x: 750,
    y: 80,
    inputs: [{ id: 'in-1', label: 'Run', type: 'execution' }],
    outputs: [{ id: 'out-next', label: 'Next', type: 'execution' }],
    values: { text: 'You are wounded!' }
  },
  {
    id: 'node-4',
    type: 'action',
    title: 'Game Over',
    x: 750,
    y: 280,
    inputs: [{ id: 'in-1', label: 'Run', type: 'execution' }],
    outputs: []
  },
  {
    id: 'node-5',
    type: 'variable',
    title: 'Player HP',
    x: 100,
    y: 350,
    inputs: [],
    outputs: [{ id: 'val', label: 'Value', type: 'data' }]
  }
])

const connections = ref<Connection[]>([
  { id: 'c1', fromNode: 'node-1', fromSocket: 'out-1', toNode: 'node-2', toSocket: 'in-1' },
  { id: 'c2', fromNode: 'node-2', fromSocket: 'true', toNode: 'node-3', toSocket: 'in-1' },
  { id: 'c3', fromNode: 'node-2', fromSocket: 'false', toNode: 'node-4', toSocket: 'in-1' },
  { id: 'c4', fromNode: 'node-5', fromSocket: 'val', toNode: 'node-2', toSocket: 'in-hp' }
])

// --- VIEWPORT STATE ---
const scale = ref(1)
const pan = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const dragStart = ref({ x: 0, y: 0 })

// --- DRAG NODE STATE ---
const draggingNodeId = ref<string | null>(null)
const dragNodeOffset = ref({ x: 0, y: 0 })

// --- LOGIKA SVG ---
const getSocketPosition = (
  nodeId: string,
  socketId: string,
  isInput: boolean
): { x: number; y: number } => {
  const node = nodes.value.find((n) => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }

  const headerHeight = 40
  const socketRowHeight = 28
  const baseOffset = headerHeight + 15

  const list = isInput ? node.inputs : node.outputs
  const index = list.findIndex((s) => s.id === socketId)

  const relativeY = baseOffset + index * socketRowHeight
  const relativeX = isInput ? 0 : 200

  return {
    x: node.x + relativeX,
    y: node.y + relativeY
  }
}

const getPath = (conn: Connection): string => {
  const start = getSocketPosition(conn.fromNode, conn.fromSocket, false)
  const end = getSocketPosition(conn.toNode, conn.toSocket, true)
  const dist = Math.abs(end.x - start.x)
  const controlOffset = Math.max(dist * 0.5, 50)
  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`
}

// --- HANDLERS ---
const handleWheel = (e: WheelEvent): void => {
  if (e.ctrlKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scale.value = Math.min(Math.max(0.5, scale.value * delta), 2)
  } else {
    pan.value.x -= e.deltaX
    pan.value.y -= e.deltaY
  }
}

const startPan = (e: MouseEvent): void => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    isPanning.value = true
    dragStart.value = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }
}

const startDragNode = (e: MouseEvent, node: NodeData): void => {
  if (e.button !== 0 || e.altKey) return
  e.stopPropagation()
  draggingNodeId.value = node.id
  dragNodeOffset.value = {
    x: e.clientX / scale.value - node.x,
    y: e.clientY / scale.value - node.y
  }
}

const handleMouseMove = (e: MouseEvent): void => {
  if (isPanning.value) {
    const dx = e.clientX - dragStart.value.x
    const dy = e.clientY - dragStart.value.y
    pan.value.x += dx
    pan.value.y += dy
    dragStart.value = { x: e.clientX, y: e.clientY }
  }
  if (draggingNodeId.value) {
    const node = nodes.value.find((n) => n.id === draggingNodeId.value)
    if (node) {
      node.x = e.clientX / scale.value - dragNodeOffset.value.x
      node.y = e.clientY / scale.value - dragNodeOffset.value.y
    }
  }
}

const handleMouseUp = (): void => {
  isPanning.value = false
  draggingNodeId.value = null
}

// --- KOLORYSTYKA WĘZŁÓW (LIGHT THEME) ---
const getNodeBorderClass = (type: NodeType): string => {
  switch (type) {
    case 'event':
      return 'border-t-purple-500'
    case 'condition':
      return 'border-t-blue-500'
    case 'action':
      return 'border-t-emerald-500'
    case 'variable':
      return 'border-t-amber-500'
    default:
      return 'border-t-slate-500'
  }
}

const getHeaderClass = (type: NodeType): string => {
  switch (type) {
    case 'event':
      return 'bg-purple-50 text-purple-700'
    case 'condition':
      return 'bg-blue-50 text-blue-700'
    case 'action':
      return 'bg-emerald-50 text-emerald-700'
    case 'variable':
      return 'bg-amber-50 text-amber-700'
    default:
      return 'bg-slate-50 text-slate-700'
  }
}

const getIconClass = (type: NodeType): string => {
  switch (type) {
    case 'event':
      return 'text-purple-600'
    case 'condition':
      return 'text-blue-600'
    case 'action':
      return 'text-emerald-600'
    case 'variable':
      return 'text-amber-600'
    default:
      return 'text-slate-600'
  }
}
</script>

<template>
  <div class="flex h-full w-full bg-[#f8f9fc] text-slate-800 font-sans overflow-hidden relative">
    <aside
      class="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
    >
      <div class="p-4 border-b border-slate-100">
        <div class="flex items-center gap-2 mb-4">
          <div class="bg-indigo-600 p-1.5 rounded-lg text-white">
            <IconLayoutGrid :size="16" stroke-width="2.5" />
          </div>
          <span class="font-bold text-sm tracking-tight text-slate-800">Visual Scripter</span>
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
        <div>
          <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Events
          </h3>
          <div class="space-y-1">
            <div
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100"
            >
              <div
                class="w-2 h-2 rounded-full bg-purple-500 group-hover:shadow-[0_0_8px_rgba(168,85,247,0.4)] transition-all"
              ></div>
              <span class="text-xs font-bold text-slate-600 group-hover:text-slate-900"
                >Game Start</span
              >
            </div>
            <div
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100"
            >
              <div
                class="w-2 h-2 rounded-full bg-purple-500 group-hover:shadow-[0_0_8px_rgba(168,85,247,0.4)] transition-all"
              ></div>
              <span class="text-xs font-bold text-slate-600 group-hover:text-slate-900"
                >Player Interact</span
              >
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Actions
          </h3>
          <div class="space-y-1">
            <div
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100"
            >
              <div
                class="w-2 h-2 rounded-full bg-emerald-500 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all"
              ></div>
              <span class="text-xs font-bold text-slate-600 group-hover:text-slate-900"
                >Show Message</span
              >
            </div>
            <div
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100"
            >
              <div
                class="w-2 h-2 rounded-full bg-emerald-500 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all"
              ></div>
              <span class="text-xs font-bold text-slate-600 group-hover:text-slate-900"
                >Play Sound</span
              >
            </div>
            <div
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100"
            >
              <div
                class="w-2 h-2 rounded-full bg-emerald-500 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all"
              ></div>
              <span class="text-xs font-bold text-slate-600 group-hover:text-slate-900"
                >Change Scene</span
              >
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Flow Control
          </h3>
          <div class="space-y-1">
            <div
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors border border-transparent hover:border-slate-100"
            >
              <IconArrowMerge :size="14" class="text-blue-500" />
              <span class="text-xs font-bold text-slate-600 group-hover:text-slate-900"
                >Branch (If/Else)</span
              >
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main
      class="flex-1 relative overflow-hidden bg-[#f8f9fc] cursor-grab active:cursor-grabbing"
      @mousedown="startPan"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @wheel="handleWheel"
    >
      <div
        class="absolute inset-0 pointer-events-none opacity-40"
        :style="{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }"
      ></div>

      <div
        class="absolute left-0 top-0 w-full h-full origin-top-left"
        :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }"
      >
        <svg
          class="absolute left-0 top-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible z-0"
        >
          <g>
            <path
              v-for="conn in connections"
              :key="conn.id"
              :d="getPath(conn)"
              fill="none"
              stroke="#94a3b8"
              stroke-width="2"
              class="hover:stroke-indigo-500 transition-colors cursor-pointer"
            />
            <circle v-for="conn in connections" :key="'dot-' + conn.id" r="3" fill="#4f46e5">
              <animateMotion dur="2s" repeatCount="indefinite" :path="getPath(conn)" />
            </circle>
          </g>
        </svg>

        <div class="relative z-10">
          <div
            v-for="node in nodes"
            :key="node.id"
            class="absolute w-[200px] bg-white rounded-xl shadow-md border border-slate-200 border-t-4 select-none group"
            :class="getNodeBorderClass(node.type)"
            :style="{ left: node.x + 'px', top: node.y + 'px' }"
            @mousedown="(e) => startDragNode(e, node)"
          >
            <div
              class="px-3 py-2 rounded-t-md flex items-center justify-between border-b border-transparent"
              :class="getHeaderClass(node.type)"
            >
              <div class="flex items-center gap-2">
                <IconBolt
                  v-if="node.type === 'event'"
                  :size="14"
                  :class="getIconClass(node.type)"
                />
                <IconArrowMerge
                  v-else-if="node.type === 'condition'"
                  :size="14"
                  :class="getIconClass(node.type)"
                />
                <IconMessage
                  v-else-if="node.type === 'action'"
                  :size="14"
                  :class="getIconClass(node.type)"
                />
                <IconVariable v-else :size="14" :class="getIconClass(node.type)" />
                <span class="text-xs font-bold">{{ node.title }}</span>
              </div>
              <button
                class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                @click.stop=""
              >
                <IconX :size="12" />
              </button>
            </div>

            <div class="p-3 space-y-3">
              <div v-for="input in node.inputs" :key="input.id" class="flex items-center gap-2">
                <div
                  class="w-3 h-3 border border-slate-400 rounded-sm -ml-[19px] bg-white hover:border-slate-800 transition-colors cursor-crosshair flex items-center justify-center shadow-sm"
                  :class="
                    input.type === 'execution'
                      ? 'rotate-45 rounded-none border-slate-400 bg-slate-100'
                      : 'rounded-full bg-blue-50 border-blue-400'
                  "
                ></div>
                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{{
                  input.label
                }}</span>
              </div>

              <div v-if="node.values" class="bg-slate-50 p-2 rounded border border-slate-200">
                <p class="text-[10px] text-slate-400 font-bold uppercase mb-1">Message Text</p>
                <input
                  v-model="node.values.text"
                  type="text"
                  class="w-full bg-white text-xs text-slate-800 outline-none border border-slate-200 rounded px-2 py-1 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div
                v-for="output in node.outputs"
                :key="output.id"
                class="flex items-center justify-end gap-2"
              >
                <span class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{{
                  output.label
                }}</span>
                <div
                  class="w-3 h-3 border border-slate-400 rounded-sm -mr-[19px] bg-white hover:border-slate-800 transition-colors cursor-crosshair flex items-center justify-center shadow-sm"
                  :class="
                    output.type === 'execution'
                      ? 'rotate-45 rounded-none border-slate-400 bg-slate-100'
                      : 'rounded-full bg-blue-50 border-blue-400'
                  "
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="absolute bottom-6 right-6 flex gap-2">
        <div
          class="bg-white border border-slate-200 rounded-xl flex items-center p-1 shadow-lg shadow-slate-200/50"
        >
          <button
            class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
            @click="scale = Math.max(0.5, scale - 0.1)"
          >
            <IconZoomOut :size="18" />
          </button>
          <span class="text-xs font-bold text-slate-600 w-12 text-center"
            >{{ Math.round(scale * 100) }}%</span
          >
          <button
            class="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
            @click="scale = Math.min(2, scale + 0.1)"
          >
            <IconZoomIn :size="18" />
          </button>
        </div>
      </div>

      <div class="absolute top-6 right-6">
        <button
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 text-xs font-bold transition-all active:scale-95 border border-transparent"
        >
          <IconPlayerPlay :size="14" class="fill-current" />
          Compile & Run
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Scrollbar */
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
