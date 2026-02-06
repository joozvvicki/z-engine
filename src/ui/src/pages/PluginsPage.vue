<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IconPlug,
  IconPlus,
  IconSearch,
  IconTrash,
  IconCode,
  IconToggleRight,
  IconToggleLeft,
  IconChevronUp,
  IconChevronDown,
  IconAdjustments,
  IconMenu2,
  IconFileCode
} from '@tabler/icons-vue'

// --- MOCK DATA ---
// W przyszłości to będzie w usePluginsStore()
interface PluginParam {
  name: string
  value: string | number | boolean
  desc: string
}

interface Plugin {
  id: string
  name: string
  status: boolean
  author: string
  version: string
  description: string
  help: string
  parameters: PluginParam[]
}

const plugins = ref<Plugin[]>([
  {
    id: 'core_engine',
    name: 'Z-Core Engine',
    status: true,
    author: 'Z-Team',
    version: '1.0.2',
    description: 'Basic system fixes and screen resolution management.',
    help: 'This plugin must be placed at the top of the list.',
    parameters: [
      { name: 'Screen Width', value: 1280, desc: 'Default screen width' },
      { name: 'Screen Height', value: 720, desc: 'Default screen height' },
      { name: 'Debug Mode', value: true, desc: 'Enable F8 debug console' }
    ]
  },
  {
    id: 'battle_system_atb',
    name: 'Battle System - ATB',
    status: true,
    author: 'VisuStella',
    version: '1.0.0',
    description: 'Changes the battle system to Active Time Battle.',
    help: 'Requires Z-Core Engine.',
    parameters: [
      { name: 'Wait Mode', value: 'Full Wait', desc: 'Time stops when selecting actions' },
      { name: 'Speed Factor', value: 1.5, desc: 'Global ATB fill rate' },
      { name: 'Show Gauge', value: true, desc: 'Display ATB bar under HP' }
    ]
  },
  {
    id: 'message_core',
    name: 'Message Core',
    status: false,
    author: 'Yanfly',
    version: '1.1.0',
    description: 'Enhanced message window features and text codes.',
    help: 'Use \\c[x] for colors and \\n[x] for names.',
    parameters: [
      { name: 'Font Size', value: 24, desc: 'Base font size for messages' },
      { name: 'Name Box', value: true, desc: 'Show name box window' }
    ]
  }
])

const selectedId = ref<string>(plugins.value[0]?.id || '')
const searchQuery = ref('')

// --- COMPUTED ---
const filteredPlugins = computed(() => {
  if (!searchQuery.value) return plugins.value
  const query = searchQuery.value.toLowerCase()
  return plugins.value.filter((p) => p.name.toLowerCase().includes(query))
})

const selectedPlugin = computed(() => plugins.value.find((p) => p.id === selectedId.value))

// --- ACTIONS ---
const toggleStatus = (plugin: Plugin) => {
  plugin.status = !plugin.status
}

const movePlugin = (direction: 'up' | 'down') => {
  if (!selectedId.value) return
  const index = plugins.value.findIndex((p) => p.id === selectedId.value)
  if (index === -1) return

  if (direction === 'up' && index > 0) {
    const temp = plugins.value[index]
    plugins.value[index] = plugins.value[index - 1]
    plugins.value[index - 1] = temp
  } else if (direction === 'down' && index < plugins.value.length - 1) {
    const temp = plugins.value[index]
    plugins.value[index] = plugins.value[index + 1]
    plugins.value[index + 1] = temp
  }
}

const handleImport = () => {
  // Mock import
  const newId = `new_plugin_${plugins.value.length}`
  plugins.value.push({
    id: newId,
    name: 'New Imported Plugin',
    status: true,
    author: 'Unknown',
    version: '1.0.0',
    description: 'No description provided.',
    help: '',
    parameters: []
  })
  selectedId.value = newId
}

const handleDelete = () => {
  if (confirm('Uninstall this plugin?')) {
    const idx = plugins.value.findIndex((p) => p.id === selectedId.value)
    if (idx !== -1) {
      plugins.value.splice(idx, 1)
      if (plugins.value.length > 0)
        selectedId.value = plugins.value[Math.min(idx, plugins.value.length - 1)].id
      else selectedId.value = ''
    }
  }
}
</script>

<template>
  <div class="h-full w-full bg-white flex text-slate-900 font-sans overflow-hidden">
    <div class="w-80 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-2">
            <IconPlug class="text-teal-600" :size="20" stroke-width="2" />
            <h2 class="text-xs font-black uppercase tracking-widest text-slate-500">
              Plugin Manager
            </h2>
          </div>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-teal-600 hover:text-white text-slate-500 transition-all shadow-sm"
            @click="handleImport"
            title="Import JS File"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>

        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search scripts..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-400 transition-all"
          />
        </div>

        <div class="flex gap-2 mt-3">
          <button
            class="flex-1 py-1 flex items-center justify-center gap-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
            @click="movePlugin('up')"
          >
            <IconChevronUp :size="12" /> Move Up
          </button>
          <button
            class="flex-1 py-1 flex items-center justify-center gap-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
            @click="movePlugin('down')"
          >
            <IconChevronDown :size="12" /> Move Down
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="plugin in filteredPlugins"
          :key="plugin.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === plugin.id
              ? 'bg-white border-teal-200 shadow-md shadow-teal-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = plugin.id"
        >
          <button class="shrink-0 transition-colors" @click.stop="toggleStatus(plugin)">
            <IconToggleRight v-if="plugin.status" :size="24" class="text-teal-500" />
            <IconToggleLeft v-else :size="24" class="text-slate-300 hover:text-slate-400" />
          </button>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="[
                  selectedId === plugin.id ? 'text-teal-700' : 'text-slate-700',
                  !plugin.status && 'opacity-50 decoration-slate-400'
                ]"
              >
                {{ plugin.name }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded truncate">
                {{ plugin.id }}.js
              </span>
            </div>
          </div>

          <IconMenu2 v-if="selectedId === plugin.id" :size="14" class="text-slate-300" />
        </div>
      </div>
    </div>

    <div v-if="selectedPlugin" class="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <div
        class="h-24 px-8 flex items-center justify-between bg-white border-b border-slate-200 shrink-0"
      >
        <div class="flex items-center gap-6">
          <div
            class="w-14 h-14 rounded-2xl flex items-center justify-center bg-teal-50 border border-teal-100 text-teal-600 shadow-sm"
          >
            <IconFileCode :size="32" stroke-width="1.5" />
          </div>
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h1 class="text-2xl font-black text-slate-900 tracking-tight">
                {{ selectedPlugin.name }}
              </h1>
              <span
                class="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200"
                >v{{ selectedPlugin.version }}</span
              >
            </div>
            <div class="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span class="flex items-center gap-1"
                ><IconCode :size="14" /> by {{ selectedPlugin.author }}</span
              >
              <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span class="font-mono text-slate-400">{{ selectedPlugin.id }}.js</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <div class="flex flex-col items-end gap-1">
            <label class="text-[9px] font-bold uppercase tracking-widest text-slate-400"
              >Status</label
            >
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm active:scale-95"
              :class="
                selectedPlugin.status
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-slate-200 text-slate-400'
              "
              @click="toggleStatus(selectedPlugin)"
            >
              <div
                class="w-2 h-2 rounded-full"
                :class="selectedPlugin.status ? 'bg-teal-500 animate-pulse' : 'bg-slate-300'"
              ></div>
              <span class="text-xs font-bold">{{
                selectedPlugin.status ? 'Active' : 'Disabled'
              }}</span>
            </button>
          </div>

          <div class="w-px h-10 bg-slate-100"></div>

          <button
            class="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            @click="handleDelete"
            title="Uninstall"
          >
            <IconTrash :size="20" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div class="max-w-4xl mx-auto space-y-8">
          <div class="space-y-2">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
              >Description</label
            >
            <div
              class="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 leading-relaxed shadow-sm"
            >
              {{ selectedPlugin.description }}
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label
                class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"
              >
                <IconAdjustments :size="12" /> Parameters
              </label>
              <span
                class="text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded"
                >{{ selectedPlugin.parameters.length }}</span
              >
            </div>

            <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table class="w-full text-left border-collapse">
                <thead class="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th class="px-4 py-3 text-[10px] font-black uppercase text-slate-400 w-1/3">
                      Name
                    </th>
                    <th class="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Value</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr
                    v-for="(param, idx) in selectedPlugin.parameters"
                    :key="idx"
                    class="group hover:bg-slate-50/50 transition-colors"
                  >
                    <td class="px-4 py-3 align-top">
                      <div class="text-xs font-bold text-slate-700">{{ param.name }}</div>
                      <div class="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {{ param.desc }}
                      </div>
                    </td>
                    <td class="px-4 py-2 align-top">
                      <input
                        v-model="param.value"
                        class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-teal-700 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-50 outline-none transition-all"
                      />
                    </td>
                  </tr>
                  <tr v-if="selectedPlugin.parameters.length === 0">
                    <td colspan="2" class="px-4 py-8 text-center text-xs text-slate-400 italic">
                      This plugin has no configurable parameters.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
              >Help / Documentation</label
            >
            <div
              class="p-4 bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600 leading-relaxed whitespace-pre-wrap select-text h-40 overflow-y-auto custom-scrollbar"
            >
              {{ selectedPlugin.help || 'No documentation provided.' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50">
      <div
        class="w-24 h-24 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-center mb-6"
      >
        <IconPlug :size="48" class="text-slate-200" />
      </div>
      <h3 class="text-lg font-black text-slate-400 mb-1">No Plugin Selected</h3>
      <p class="text-xs text-slate-400 max-w-xs text-center">
        Select a plugin from the list to configure its parameters or import a new script.
      </p>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
