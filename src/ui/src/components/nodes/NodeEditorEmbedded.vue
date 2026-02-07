<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { IconSearch, IconLayoutGrid, IconPlus } from '@tabler/icons-vue'
import type {
  ZNodeGraph,
  ZNode,
  ZConnection,
  ZNodeValueSchema,
  ZNodeType,
  ZNodeDefinition
} from '@engine/types'
import { NodeRegistry } from '@engine/nodes'
import NodeEditorBoard from './NodeEditorBoard.vue'

const props = defineProps<{
  nodeGraph?: ZNodeGraph
}>()

const emit = defineEmits<{
  (e: 'update:nodeGraph', value: ZNodeGraph): void
}>()

// Local state for the board
const nodes = ref<ZNode[]>([])
const connections = ref<ZConnection[]>([])
const pan = ref({ x: 0, y: 0 })
const zoom = ref(1)

// Track the last emitted state to avoid infinite loops
let lastEmittedState = ''

// Sync with external nodeGraph prop
watch(
  () => props.nodeGraph,
  (graph) => {
    if (!graph) return
    const stateStr = JSON.stringify(graph)
    if (stateStr === lastEmittedState) return

    lastEmittedState = stateStr
    nodes.value = JSON.parse(JSON.stringify(graph.nodes || []))
    connections.value = JSON.parse(JSON.stringify(graph.connections || []))
  },
  { immediate: true, deep: true }
)

// Emit updates back when state changes
watch(
  [nodes, connections],
  () => {
    const newState = {
      nodes: nodes.value,
      connections: connections.value
    }
    const stateStr = JSON.stringify(newState)
    if (stateStr === lastEmittedState) return

    lastEmittedState = stateStr
    emit('update:nodeGraph', newState)
  },
  { deep: true }
)

// --- SIDEBAR LOGIC (Parity with NodesPage) ---
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

const nodeTemplates = computed(() => {
  return Object.entries(NodeRegistry).map(([key, def]) => ({
    key,
    definition: def,
    category: def.category,
    color: getCategoryColor(def.category)
  }))
})

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

const initializeNodeValues = (schemas: ZNodeValueSchema[]): Record<string, unknown> => {
  const values: Record<string, unknown> = {}
  schemas.forEach((schema) => {
    values[schema.key] = schema.default ?? null
  })
  return values
}

const addNewNode = (key: string, def: ZNodeDefinition): void => {
  const id = `node-${Date.now()}`
  nodes.value.push({
    id,
    type: def.category,
    title: def.title,
    x: (400 - pan.value.x) / zoom.value,
    y: (300 - pan.value.y) / zoom.value,
    inputs: JSON.parse(JSON.stringify(def.inputs)),
    outputs: JSON.parse(JSON.stringify(def.outputs)),
    values: initializeNodeValues(def.values),
    config: { nodeKey: key }
  } as ZNode)
}

const handleRemoveNode = (id: string): void => {
  nodes.value = nodes.value.filter((n) => n.id !== id)
  connections.value = connections.value.filter((c) => c.fromNode !== id && c.toNode !== id)
}

const handleRemoveConnection = (id: string): void => {
  connections.value = connections.value.filter((c) => c.id !== id)
}

const handleAddConnection = (conn: ZConnection): void => {
  connections.value.push(conn)
}

const handleUpdateNodePosition = (id: string, x: number, y: number): void => {
  const node = nodes.value.find((n) => n.id === id)
  if (node) {
    node.x = x
    node.y = y
  }
}

// --- Dynamic Socket Syncing ---
watch(
  nodes,
  (newNodes) => {
    newNodes.forEach((node) => {
      const nodeKey = (node.config?.nodeKey as string) || ''
      const definition = NodeRegistry[nodeKey]

      if (definition?.getOutputs) {
        // 1. Build desired outputs using registry helper
        const newOutputs = definition.getOutputs(node.values || {})

        // 2. Compare and Update if needed
        const currentOutputsStr = JSON.stringify(node.outputs)
        const newOutputsStr = JSON.stringify(newOutputs)

        if (currentOutputsStr !== newOutputsStr) {
          node.outputs = newOutputs

          // 3. Prune connections from removed sockets
          const validSocketIds = new Set(newOutputs.map((o) => o.id))
          connections.value = connections.value.filter((conn) => {
            if (conn.fromNode === node.id) {
              return validSocketIds.has(conn.fromSocket)
            }
            return true
          })
        }
      }
    })
  },
  { deep: true, immediate: true }
)
</script>

<template>
  <div class="flex h-full w-full bg-[#f8f9fc] text-slate-800 font-sans overflow-hidden relative">
    <!-- Canvas -->
    <div class="flex-1 relative">
      <NodeEditorBoard
        v-model:nodes="nodes"
        v-model:connections="connections"
        v-model:pan="pan"
        v-model:zoom="zoom"
        @node-delete="handleRemoveNode"
        @connection-delete="handleRemoveConnection"
        @connection-add="handleAddConnection"
        @node-move="handleUpdateNodePosition"
      />
    </div>

    <!-- Sidebar (Parity with NodesPage) - Moved to Right -->
    <aside
      class="w-64 bg-white border-l border-slate-200 flex flex-col z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]"
    >
      <div class="p-4 border-b border-slate-100">
        <div class="flex items-center gap-2 mb-4">
          <div class="bg-indigo-600 p-1.5 rounded-lg text-white">
            <IconLayoutGrid :size="16" stroke-width="2.5" />
          </div>
          <span class="font-black text-[10px] uppercase tracking-widest text-slate-800"
            >Available Nodes</span
          >
        </div>
        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            :size="14"
          />
          <input
            type="text"
            placeholder="Search..."
            class="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all font-medium"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        <div v-for="(categoryNodes, category) in nodesByCategory" :key="category" class="space-y-3">
          <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {{ getCategoryLabel(category) }}
          </h3>
          <div class="space-y-2">
            <button
              v-for="item in categoryNodes"
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
    </aside>
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
