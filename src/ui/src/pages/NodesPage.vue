<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { IconSearch, IconLayoutGrid, IconPlus, IconCode } from '@tabler/icons-vue'
import { useNodeScriptStore } from '@ui/stores/nodeScript'
import type {
  ZNodeType,
  ZNode,
  ZNodeDefinition,
  ZNodeValueSchema,
  ZEventCommand
} from '@engine/types'
import { NodeRegistry, nodeCompiler } from '@engine/nodes'
import NodeEditorBoard from '@ui/components/nodes/NodeEditorBoard.vue'

const store = useNodeScriptStore()

// --- COMPILE PREVIEW STATE ---
const showCompilePreview = ref(false)
const compiledCommands = ref<ZEventCommand[]>([])

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

// --- INITIAL LOAD ---
onMounted(async () => {
  await store.loadAll()
})

// --- COMPILE FUNCTIONALITY ---
const compileNodeGraph = (): void => {
  try {
    const graph = {
      nodes: store.nodes,
      connections: store.connections
    }

    compiledCommands.value = nodeCompiler.compile(graph)
    showCompilePreview.value = true

    console.log('[NodesPage] Compiled commands:', compiledCommands.value)
  } catch (error) {
    console.error('[NodesPage] Compilation error:', error)
    alert(`Compilation failed: ${error}`)
  }
}

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
    </aside>

    <!-- Unified Board -->
    <main class="flex-1 relative overflow-hidden">
      <NodeEditorBoard
        v-model:nodes="store.nodes"
        v-model:connections="store.connections"
        v-model:pan="store.pan"
        v-model:zoom="store.zoom"
        @connection-add="store.addConnection"
        @connection-delete="store.removeConnection"
        @node-delete="store.removeNode"
        @node-move="store.updateNodePosition"
      >
        <template #toolbar>
          <button
            class="bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-2xl shadow-xl shadow-slate-200/20 flex items-center gap-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-slate-200"
            @click="store.saveAll"
          >
            Save Graph
          </button>
          <button
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center gap-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-indigo-500/50"
            @click="compileNodeGraph"
          >
            <IconCode :size="14" />
            Compile
          </button>
        </template>

        <template #hud>
          <div
            class="bg-slate-900/80 backdrop-blur-md text-white/70 px-4 py-3 rounded-2xl border border-white/10 text-[10px] font-bold space-y-1 shadow-2xl"
          >
            <div class="flex items-center gap-2">
              <div class="w-1 h-1 rounded-full bg-indigo-400"></div>
              <span>Left Click drag to move nodes</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-1 h-1 rounded-full bg-indigo-400"></div>
              <span>Middle Click / Alt+Drag to pan</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-1 h-1 rounded-full bg-indigo-400"></div>
              <span>Ctrl + Scroll to zoom</span>
            </div>
          </div>
        </template>
      </NodeEditorBoard>
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
