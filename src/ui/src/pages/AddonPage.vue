<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IconSearch,
  IconPuzzle,
  IconSettings,
  IconDownload,
  IconCheck,
  IconRefresh,
  IconTrash,
  IconBoxModel,
  IconCpu,
  IconLayoutDashboard,
  IconWand
} from '@tabler/icons-vue'

// --- TYPY ---
interface Addon {
  id: string
  name: string
  description: string
  author: string
  version: string
  category: 'core' | 'map' | 'battle' | 'editor'
  installed: boolean
  enabled: boolean // Tylko jeśli installed === true
  hasUpdate: boolean
  icon: any
  color: string
}

// --- DANE (MOCK) ---
const addons = ref<Addon[]>([
  {
    id: '1',
    name: 'Pixel-Perfect Movement',
    description: 'Replaces the grid-based movement with sub-pixel precision collision and physics.',
    author: 'Z-Engine Core',
    version: '2.1.0',
    category: 'core',
    installed: true,
    enabled: true,
    hasUpdate: false,
    icon: IconCpu,
    color: 'text-blue-600 bg-blue-50'
  },
  {
    id: '2',
    name: 'Parallax Mapper Pro',
    description:
      'Enables multi-layer mapping with unlimited distinct layers and visual editor overlay.',
    author: 'MapWizards',
    version: '1.0.4',
    category: 'map',
    installed: true,
    enabled: false,
    hasUpdate: true,
    icon: IconLayoutDashboard,
    color: 'text-emerald-600 bg-emerald-50'
  },
  {
    id: '3',
    name: 'Dynamic Lighting System',
    description: 'Real-time 2D lighting engine with shadows, day/night cycle and light sources.',
    author: 'Lumina',
    version: '3.0.0',
    category: 'map',
    installed: false,
    enabled: false,
    hasUpdate: false,
    icon: IconWand,
    color: 'text-amber-500 bg-amber-50'
  },
  {
    id: '4',
    name: 'Advanced Battle AI',
    description: 'Behavior tree based AI system for complex enemy patterns and strategy.',
    author: 'TacticsLab',
    version: '0.9.5',
    category: 'battle',
    installed: false,
    enabled: false,
    hasUpdate: false,
    icon: IconCpu,
    color: 'text-rose-500 bg-rose-50'
  },
  {
    id: '5',
    name: 'UI Theme Editor',
    description: 'WYSIWYG editor for customizing game windows, fonts and system graphics.',
    author: 'InterfaceGod',
    version: '1.2.0',
    category: 'editor',
    installed: true,
    enabled: true,
    hasUpdate: false,
    icon: IconBoxModel,
    color: 'text-violet-600 bg-violet-50'
  }
])

// --- STATE ---
const searchQuery = ref('')
const filter = ref<'all' | 'installed' | 'updates'>('all')

// --- COMPUTED ---
const filteredAddons = computed(() => {
  let result = addons.value

  if (filter.value === 'installed') {
    result = result.filter((a) => a.installed)
  } else if (filter.value === 'updates') {
    result = result.filter((a) => a.hasUpdate)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    )
  }

  return result
})

// --- ACTIONS ---
const togglePlugin = (addon: Addon) => {
  if (addon.installed) {
    addon.enabled = !addon.enabled
  }
}

const installAddon = (addon: Addon) => {
  // Symulacja instalacji
  addon.installed = true
  addon.enabled = true
}

const updateAddon = (addon: Addon) => {
  addon.hasUpdate = false
  addon.version = 'Latest'
}
</script>

<template>
  <div class="flex h-full w-full bg-[#f8f9fc] text-slate-800 font-sans overflow-hidden">
    <aside
      class="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
    >
      <div class="p-6">
        <h2 class="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-6">
          <div class="bg-indigo-600 text-white p-1.5 rounded-lg">
            <IconPuzzle :size="18" stroke-width="2.5" />
          </div>
          Extensions
        </h2>

        <nav class="space-y-1">
          <button
            @click="filter = 'all'"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
            :class="
              filter === 'all'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            "
          >
            <span>Discover</span>
            <span v-if="filter === 'all'" class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
          </button>

          <button
            @click="filter = 'installed'"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
            :class="
              filter === 'installed'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            "
          >
            <span>Installed</span>
            <span
              class="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full group-hover:bg-white"
              >{{ addons.filter((a) => a.installed).length }}</span
            >
          </button>

          <button
            @click="filter = 'updates'"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group"
            :class="
              filter === 'updates'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            "
          >
            <span>Updates</span>
            <span
              v-if="addons.some((a) => a.hasUpdate)"
              class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
            ></span>
          </button>
        </nav>
      </div>

      <div class="mt-auto p-6">
        <div
          class="p-4 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30"
        >
          <IconPuzzle :size="24" class="mb-2 opacity-80" />
          <h3 class="font-bold text-sm mb-1">Create Add-ons</h3>
          <p class="text-[11px] opacity-80 mb-3 leading-relaxed">
            Read the documentation to learn how to build your own extensions.
          </p>
          <button
            class="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
          >
            Open Docs
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <header
        class="h-16 px-8 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-10"
      >
        <div class="flex items-center gap-4 w-full max-w-lg">
          <IconSearch class="text-slate-400" :size="20" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search extensions (e.g. 'lighting', 'physics')..."
            class="w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
          />
        </div>
        <div class="flex items-center gap-3">
          <button
            class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <IconRefresh :size="18" />
          </button>
          <button
            class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <IconSettings :size="18" />
          </button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div
          v-if="filter === 'all' && !searchQuery"
          class="mb-10 p-1 rounded-3xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"
        >
          <div
            class="bg-white rounded-[20px] p-8 flex items-center justify-between relative overflow-hidden"
          >
            <div class="relative z-10 max-w-lg">
              <span
                class="text-orange-500 font-bold text-[10px] uppercase tracking-widest mb-2 block"
                >Featured Extension</span
              >
              <h2 class="text-3xl font-black text-slate-800 mb-3">Particle System VX</h2>
              <p class="text-slate-500 text-sm mb-6 leading-relaxed">
                Create stunning visual effects with our GPU accelerated particle engine. Includes
                presets for fire, smoke, magic, and weather effects.
              </p>
              <button
                class="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:bg-black transition-all active:scale-95"
              >
                Get It Now — Free
              </button>
            </div>
            <div
              class="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-orange-50 to-transparent"
            ></div>
            <IconWand
              :size="180"
              class="absolute -right-10 -bottom-10 text-orange-100 rotate-12"
              stroke-width="1"
            />
          </div>
        </div>

        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-slate-800">
            {{
              filter === 'installed'
                ? 'Installed Extensions'
                : filter === 'updates'
                  ? 'Available Updates'
                  : 'All Extensions'
            }}
          </h3>
          <span class="text-xs font-medium text-slate-400">{{ filteredAddons.length }} items</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div
            v-for="addon in filteredAddons"
            :key="addon.id"
            class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col group relative"
          >
            <div
              v-if="addon.hasUpdate"
              class="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm z-10 flex items-center gap-1"
            >
              <IconRefresh :size="10" /> Update
            </div>

            <div class="flex items-start gap-4 mb-3">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                :class="addon.color"
              >
                <component :is="addon.icon" :size="24" stroke-width="2" />
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-slate-800 text-sm truncate pr-4">{{ addon.name }}</h4>
                <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span>v{{ addon.version }}</span>
                  <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span class="truncate">{{ addon.author }}</span>
                </div>
              </div>
            </div>

            <p class="text-xs text-slate-500 leading-relaxed mb-6 line-clamp-2">
              {{ addon.description }}
            </p>

            <div class="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
              <div v-if="addon.installed" class="flex items-center gap-3 w-full">
                <div
                  @click="togglePlugin(addon)"
                  class="flex items-center gap-2 cursor-pointer select-none"
                >
                  <div
                    class="w-9 h-5 rounded-full relative transition-colors duration-200"
                    :class="addon.enabled ? 'bg-emerald-500' : 'bg-slate-200'"
                  >
                    <div
                      class="absolute top-1 bottom-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
                      :class="addon.enabled ? 'left-[20px]' : 'left-1'"
                    ></div>
                  </div>
                  <span
                    class="text-xs font-bold"
                    :class="addon.enabled ? 'text-emerald-600' : 'text-slate-400'"
                  >
                    {{ addon.enabled ? 'Active' : 'Disabled' }}
                  </span>
                </div>

                <div class="ml-auto flex gap-1">
                  <button
                    v-if="addon.hasUpdate"
                    @click="updateAddon(addon)"
                    class="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Update"
                  >
                    <IconDownload :size="16" />
                  </button>
                  <button
                    class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Uninstall"
                  >
                    <IconTrash :size="16" />
                  </button>
                </div>
              </div>

              <div v-else class="w-full flex justify-end">
                <button
                  @click="installAddon(addon)"
                  class="flex items-center gap-2 px-4 py-1.5 bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white border border-slate-200 hover:border-transparent rounded-lg text-xs font-bold transition-all"
                >
                  <IconDownload :size="14" />
                  <span>Install</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

/* Scrollbar */
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
