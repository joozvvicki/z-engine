<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@ui/stores/editor'
import { useDatabaseStore } from '@ui/stores/database'
import { ProjectService } from '@ui/services/ProjectService'
import {
  IconFolder,
  IconPlus,
  IconPlayerPlay,
  IconMap,
  IconDatabase,
  IconArrowRight,
  IconClock,
  IconTrash,
  IconUsers,
  IconPackage,
  IconGhost,
  IconSettings,
  IconLayoutDashboard,
  IconBolt,
  IconChartBar
} from '@tabler/icons-vue'
import dashboardArt from '@ui/assets/dashboard_welcome_art.png'

const router = useRouter()
const store = useEditorStore()
const db = useDatabaseStore()

const recentProjects = ref<string[]>([])
const isLoaded = computed(() => ProjectService.isLoaded())

onMounted(() => {
  recentProjects.value = ProjectService.getHistory()
})

const openProject = async (path?: string) => {
  if (path) {
    localStorage.setItem('Z_LastProjectPath', path)
    await store.loadProject(false)
  } else {
    await store.loadProject(true)
  }
  if (ProjectService.isLoaded()) {
    // Force refresh of recent projects list
    recentProjects.value = ProjectService.getHistory()
  }
}

const removeHistory = (path: string) => {
  ProjectService.removeFromHistory(path)
  recentProjects.value = ProjectService.getHistory()
}

const getProjectName = (path: string) => path.split('/').pop() || path
const getRandomDate = () => ['2h ago', 'Yesterday', '2 days ago'][Math.floor(Math.random() * 3)]

// --- LIVE STATS FROM STORES ---
const stats = computed(() => [
  {
    label: 'Heroes',
    value: db.actors.length,
    icon: IconUsers,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    link: '/database/actors'
  },
  {
    label: 'Maps',
    value: store.maps.length,
    icon: IconMap,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    link: '/editor/maps'
  },
  {
    label: 'Items',
    value: db.items.length + db.weapons.length + db.armors.length,
    icon: IconPackage,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    link: '/database/items'
  },
  {
    label: 'Enemies',
    value: db.enemies.length,
    icon: IconGhost,
    color: 'bg-rose-50 text-rose-600 border-rose-100',
    link: '/database/enemies'
  }
])

// --- PARTY PREVIEW ---
const startPartyFaces = computed(() => {
  return store.systemStartingParty
    .map((id) => {
      const actor = db.actors.find((a) => a.id === id)
      if (!actor || !actor.face) return null
      return {
        name: actor.name,
        url: ProjectService.resolveAssetUrl(actor.face),
        pos: { x: actor.faceSrcX || 0, y: actor.faceSrcY || 0 }
      }
    })
    .filter(Boolean)
})

const welcomeMessage = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening'
})
</script>

<template>
  <div class="h-full w-full bg-slate-50 relative overflow-hidden flex font-sans">
    <div
      class="absolute inset-0 z-0 opacity-[0.4]"
      style="
        background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
        background-size: 24px 24px;
      "
    ></div>

    <div class="h-full w-full overflow-y-auto z-10 px-8 py-10 md:px-16 md:py-14 scroll-smooth">
      <div class="max-w-7xl mx-auto">
        <header
          class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in-down"
        >
          <div>
            <div class="flex items-center gap-3 mb-2">
              <div
                class="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg shadow-slate-900/20"
              >
                <IconLayoutDashboard :size="18" />
              </div>
              <span class="text-xs font-bold uppercase tracking-widest text-slate-500"
                >Dashboard</span
              >
            </div>
            <h1 class="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-2">
              {{ welcomeMessage }},
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"
                >Creator.</span
              >
            </h1>
            <p class="text-slate-500 font-medium">
              {{
                isLoaded
                  ? `Project "${store.systemProjectName || 'Untitled'}" is active.`
                  : 'Select a workspace to begin.'
              }}
            </p>
          </div>

          <div v-if="isLoaded" class="flex gap-3">
            <button class="btn-secondary" @click="router.push('/settings')">
              <IconSettings :size="20" />
            </button>
            <button class="btn-primary" @click="router.push('/editor')">
              <span class="relative z-10 flex items-center gap-2">
                <IconPlayerPlay :size="16" class="fill-current" /> Continue Editing
              </span>
            </button>
          </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div class="lg:col-span-8 space-y-8">
            <div
              v-if="!isLoaded"
              class="group relative h-[320px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 cursor-pointer animate-fade-in"
              @click="openProject()"
            >
              <img
                :src="dashboardArt"
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"
              ></div>
              <div class="absolute bottom-0 left-0 p-10 w-full">
                <h2 class="text-3xl font-black text-white mb-2">Open Project</h2>
                <p class="text-white/70 font-medium flex items-center gap-2">
                  Local File System <IconArrowRight :size="16" />
                </p>
              </div>
            </div>

            <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
              <div
                v-for="stat in stats"
                :key="stat.label"
                class="bg-white border rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
                :class="stat.color"
                @click="router.push(stat.link)"
              >
                <div class="flex justify-between items-start mb-3">
                  <component :is="stat.icon" :size="24" stroke-width="1.5" />
                  <IconArrowRight
                    :size="14"
                    class="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0"
                  />
                </div>
                <div class="text-2xl font-black text-slate-800">{{ stat.value }}</div>
                <div class="text-[10px] font-bold uppercase tracking-widest opacity-60">
                  {{ stat.label }}
                </div>
              </div>
            </div>

            <div
              v-if="isLoaded"
              class="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row gap-8 animate-fade-in delay-100"
            >
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-4">
                  <IconUsers :size="20" class="text-indigo-500" />
                  <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Starting Party
                  </h3>
                </div>
                <div class="flex items-center gap-4">
                  <template v-if="startPartyFaces.length > 0">
                    <div
                      v-for="(char, idx) in startPartyFaces"
                      :key="idx"
                      class="flex flex-col items-center gap-2 group cursor-pointer"
                      @click="router.push('/database/system')"
                    >
                      <div
                        class="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-white shadow-md overflow-hidden relative group-hover:scale-110 transition-transform"
                      >
                        <div
                          class="absolute inset-0 pixelated"
                          :style="{
                            backgroundImage: `url('${char.url}')`,
                            backgroundPosition: `-${char.pos.x}px -${char.pos.y}px`
                          }"
                        ></div>
                      </div>
                      <span
                        class="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600 transition-colors"
                        >{{ char.name }}</span
                      >
                    </div>
                  </template>
                  <div
                    v-else
                    class="flex flex-col items-center justify-center w-full py-4 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl"
                  >
                    <span class="text-xs font-bold">No party members set</span>
                    <button
                      class="text-[10px] text-blue-500 hover:underline mt-1"
                      @click="router.push('/database/system')"
                    >
                      Configure in System
                    </button>
                  </div>
                </div>
              </div>

              <div class="w-px bg-slate-100 hidden md:block"></div>

              <div class="w-64 shrink-0">
                <div class="flex items-center gap-2 mb-4">
                  <IconChartBar :size="20" class="text-emerald-500" />
                  <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Database Health
                  </h3>
                </div>
                <div class="space-y-4">
                  <div>
                    <div class="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>Switches Used</span>
                      <span
                        >{{ store.systemSwitches.filter((s) => s).length }} /
                        {{ store.systemSwitches.length }}</span
                      >
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-blue-500 rounded-full"
                        :style="{
                          width: `${(store.systemSwitches.filter((s) => s).length / store.systemSwitches.length) * 100}%`
                        }"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>Variables Used</span>
                      <span
                        >{{ store.systemVariables.filter((v) => v).length }} /
                        {{ store.systemVariables.length }}</span
                      >
                    </div>
                    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-emerald-500 rounded-full"
                        :style="{
                          width: `${(store.systemVariables.filter((v) => v).length / store.systemVariables.length) * 100}%`
                        }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="!isLoaded" class="grid grid-cols-2 gap-6">
              <button class="action-card" @click="router.push('/')">
                <div class="icon-box bg-blue-50 text-blue-600"><IconPlus :size="24" /></div>
                <div class="text-left">
                  <div class="font-bold text-slate-900">New Project</div>
                  <div class="text-xs text-slate-400">Create from template</div>
                </div>
              </button>
              <button class="action-card" @click="openProject()">
                <div class="icon-box bg-slate-100 text-slate-600"><IconFolder :size="24" /></div>
                <div class="text-left">
                  <div class="font-bold text-slate-900">Open Folder</div>
                  <div class="text-xs text-slate-400">Load existing RPG</div>
                </div>
              </button>
            </div>
          </div>

          <div class="lg:col-span-4 space-y-8 animate-fade-in delay-200">
            <div
              class="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col h-[420px]"
            >
              <div class="flex items-center justify-between mb-6">
                <h3 class="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <IconClock :size="18" class="text-slate-400" /> Recent Activity
                </h3>
              </div>

              <div
                v-if="recentProjects.length > 0"
                class="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2"
              >
                <div
                  v-for="path in recentProjects"
                  :key="path"
                  class="group p-3 rounded-xl bg-slate-50 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer flex gap-3 items-center"
                  @click="openProject(path)"
                >
                  <div
                    class="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm shrink-0"
                  >
                    RPG
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 text-xs truncate">
                      {{ getProjectName(path) }}
                    </h4>
                    <div class="text-[9px] text-slate-400 truncate">{{ path }}</div>
                  </div>
                  <button
                    class="p-1.5 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                    @click.stop="removeHistory(path)"
                  >
                    <IconTrash :size="14" />
                  </button>
                </div>
              </div>
              <div
                v-else
                class="flex-1 flex flex-col items-center justify-center text-center opacity-50"
              >
                <IconFolder :size="32" class="text-slate-300 mb-2" />
                <p class="text-xs font-bold text-slate-400">No recent history</p>
              </div>
            </div>

            <div
              class="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20 group"
            >
              <div
                class="absolute -right-8 -top-8 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"
              ></div>
              <div class="relative z-10">
                <div class="flex items-center gap-2 mb-3 opacity-80">
                  <IconBolt :size="16" />
                  <span class="text-[10px] font-bold uppercase tracking-widest">Did you know?</span>
                </div>
                <p class="text-sm font-medium leading-relaxed mb-4">
                  You can drag and drop images directly into the Tileset Editor to automatically
                  import them into your project.
                </p>
                <div class="h-1 w-12 bg-white/30 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss';

.btn-primary {
  @apply bg-slate-900 text-white pl-5 pr-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden;
}
.btn-secondary {
  @apply h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm;
}
.action-card {
  @apply h-24 bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all cursor-pointer;
}
.icon-box {
  @apply h-12 w-12 rounded-xl flex items-center justify-center;
}
.pixelated {
  image-rendering: pixelated;
}
.animate-fade-in-down {
  animation: fadeInDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.animate-fade-in {
  opacity: 0;
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded;
}
</style>
