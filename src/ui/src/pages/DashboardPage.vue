<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@ui/stores/editor'
import { ProjectService } from '@ui/services/ProjectService'
import {
  IconFolder,
  IconPlus,
  IconPlayerPlay,
  IconMap,
  IconDatabase,
  IconArrowRight,
  IconClock,
  IconTrash
} from '@tabler/icons-vue'
import dashboardArt from '@ui/assets/dashboard_welcome_art.png'

const router = useRouter()
const store = useEditorStore()

const recentProjects = ref<string[]>([])
const isLoaded = computed(() => ProjectService.isLoaded())

onMounted(() => {
  recentProjects.value = ProjectService.getHistory()
})

const openProject = async (path?: string): Promise<void> => {
  if (path) {
    // Custom logic to load specific path if needed, but ProjectService.selectProject handles dialog.
    // For specific path, we'd need a new method in ProjectService.
    // Let's assume store.loadProject handles the current path if not forcing.
    localStorage.setItem('Z_LastProjectPath', path)
    await store.loadProject(false)
  } else {
    await store.loadProject(true)
  }

  if (ProjectService.isLoaded()) {
    router.push('/editor')
  }
}

const removeHistory = (path: string): void => {
  ProjectService.removeFromHistory(path)
  recentProjects.value = ProjectService.getHistory()
}

const getProjectName = (path: string): string => {
  return path.split('/').pop() || path
}

const stats = computed(() => [
  { label: 'Maps', value: store.maps.length, icon: IconMap, color: 'text-blue-500' },
  {
    label: 'Switches',
    value: store.systemSwitches.filter((s) => s).length,
    icon: IconDatabase,
    color: 'text-purple-500'
  },
  {
    label: 'Variables',
    value: store.systemVariables.filter((v) => v).length,
    icon: IconDatabase,
    color: 'text-green-500'
  }
])

const welcomeMessage = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning, Creator'
  if (hour < 18) return 'Good Afternoon, Creator'
  return 'Good Evening, Creator'
})
</script>

<template>
  <div class="h-full w-full bg-white overflow-y-auto px-12 py-16">
    <!-- Header Section -->
    <header class="mb-16 flex justify-between items-end">
      <div>
        <h1 class="text-6xl font-black tracking-tighter text-black mb-4">
          {{ isLoaded ? welcomeMessage : 'Z Engine' }}
        </h1>
        <p class="text-xl text-black/40 font-medium max-w-xl leading-relaxed">
          {{
            isLoaded
              ? 'Your masterpiece is waiting. Dive back into development and bring your world to life.'
              : 'The ultimate canvas for game creators. Start building your dream project today.'
          }}
        </p>
      </div>

      <div v-if="isLoaded" class="flex gap-4">
        <button
          class="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-black/20 cursor-pointer"
          @click="router.push('/editor')"
        >
          <IconPlayerPlay :size="18" stroke-width="3" />
          Continue Development
        </button>
      </div>
    </header>

    <div class="grid grid-cols-12 gap-12">
      <!-- Main Content Area -->
      <div class="col-span-8 space-y-12">
        <!-- Hero Art Card -->
        <div class="relative h-[400px] rounded-4xl overflow-hidden shadow-2xl group">
          <img
            :src="dashboardArt"
            class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div
            class="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-10"
          >
            <span class="text-white/40 text-xs font-black uppercase tracking-[0.3em] mb-2"
              >Featured Project</span
            >
            <h2 class="text-4xl font-black text-white mb-4">
              {{ isLoaded ? getProjectName(ProjectService.currentPath!) : 'Getting Started' }}
            </h2>
          </div>
        </div>

        <!-- Project Stats (If Loaded) -->
        <div v-if="isLoaded" class="grid grid-cols-3 gap-6">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="bg-white border border-black/5 p-8 rounded-3xl flex items-center gap-6 hover:border-black/20 transition-all cursor-default shadow-sm"
          >
            <div
              :class="`w-14 h-14 bg-black/5 rounded-2xl flex items-center justify-center ${stat.color}`"
            >
              <component :is="stat.icon" :size="28" />
            </div>
            <div>
              <div class="text-3xl font-black text-black leading-none">{{ stat.value }}</div>
              <div class="text-xs font-bold text-black/30 uppercase tracking-widest mt-1">
                {{ stat.label }}
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions (If Not Loaded) -->
        <div v-else class="grid grid-cols-2 gap-8">
          <button
            class="h-64 bg-black text-white rounded-4xl p-10 flex flex-col justify-between hover:scale-[1.02] transition-all cursor-pointer shadow-xl"
            @click="openProject()"
          >
            <IconFolder :size="48" stroke-width="1.5" />
            <div>
              <h3 class="text-2xl font-black mb-2">Open Existing Project</h3>
              <p class="text-white/40 text-sm font-medium">Browse files to find your workspace.</p>
            </div>
          </button>

          <button
            class="h-64 bg-white border-2 border-dashed border-black/10 rounded-4xl p-10 flex flex-col justify-between hover:border-black/40 transition-all cursor-pointer group"
            @click="router.push('/')"
          >
            <IconPlus
              :size="48"
              stroke-width="1.5"
              class="text-black/20 group-hover:text-black transition-colors"
            />
            <div class="text-left">
              <h3 class="text-2xl font-black mb-2">Create New Project</h3>
              <p class="text-black/40 text-sm font-medium">Start fresh with a blank template.</p>
            </div>
          </button>
        </div>
      </div>

      <!-- Sidebar Area -->
      <div class="col-span-4 space-y-12">
        <!-- Recent Projects Section -->
        <section>
          <div class="flex items-center justify-between mb-8">
            <h4 class="text-xs font-black uppercase tracking-[0.2em] text-black/30">
              Recent Projects
            </h4>
            <IconClock :size="16" class="text-black/20" />
          </div>

          <div v-if="recentProjects.length > 0" class="space-y-4">
            <div
              v-for="path in recentProjects"
              :key="path"
              class="group flex items-center gap-4 p-4 rounded-2xl hover:bg-black/5 transition-all cursor-pointer border border-transparent hover:border-black/5"
              @click="openProject(path)"
            >
              <div
                class="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all"
              >
                <IconFolder :size="20" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-black truncate text-black">{{ getProjectName(path) }}</div>
                <div class="text-[10px] text-black/30 truncate font-mono uppercase mt-0.5">
                  {{ path }}
                </div>
              </div>
              <button
                class="opacity-0 group-hover:opacity-100 p-2 text-black/20 hover:text-red-500 transition-all"
                @click.stop="removeHistory(path)"
              >
                <IconTrash :size="14" />
              </button>
            </div>
          </div>
          <div v-else class="text-center py-12 border-2 border-dashed border-black/5 rounded-3xl">
            <p class="text-xs font-bold text-black/20 uppercase tracking-widest">
              No Recent Projects
            </p>
          </div>
        </section>

        <!-- Inspiration Card -->
        <div
          class="bg-linear-to-br from-indigo-500 to-purple-600 rounded-4xl p-8 text-white relative overflow-hidden shadow-2xl"
        >
          <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <h5 class="text-xl font-black mb-4 relative z-10">Did you know?</h5>
          <p class="text-white/80 text-sm leading-relaxed mb-6 relative z-10 font-medium">
            You can use the Database tab to customize every aspect of your actors and items.
          </p>
          <button
            class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:gap-4 transition-all opacity-60 hover:opacity-100"
          >
            Learn More <IconArrowRight :size="12" stroke-width="3" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for premium look */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.1);
}
</style>
