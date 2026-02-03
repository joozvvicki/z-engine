<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useEditorStore } from '@ui/stores/editor'
import { IconSearch, IconPlus } from '@tabler/icons-vue'
import { ProjectService } from '../services/ProjectService'
import ResourceGrid from '../components/ResourceGrid.vue'
import ResourcePreviewModal from '../components/modal/ResourcePreviewModal.vue'

const route = useRoute()
const store = useEditorStore()

type ResourceType =
  | 'tilesets'
  | 'characters'
  | 'faces'
  | 'backgrounds'
  | 'animations'
  | 'music'
  | 'sounds'

const categories: Record<ResourceType, { folder: string; label: string }> = {
  tilesets: { folder: 'img/tilesets', label: 'Tilesets' },
  characters: { folder: 'img/characters', label: 'Characters' },
  faces: { folder: 'img/faces', label: 'Faces' },
  backgrounds: { folder: 'img/backgrounds', label: 'Backgrounds' },
  animations: { folder: 'img/animations', label: 'Animations' },
  music: { folder: 'audio/bgm', label: 'Music' },
  sounds: { folder: 'audio/se', label: 'Sounds' }
}

const currentTab = computed((): ResourceType => {
  const path = route.path.split('/').pop() as ResourceType
  return categories[path] ? path : 'tilesets'
})

const files = ref<string[]>([])
const searchQuery = ref('')
const isLoading = ref(true)

const selectedFile = ref<string | null>(null)

const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value
  const query = searchQuery.value.toLowerCase()
  return files.value.filter((f) => f.toLowerCase().includes(query))
})

const loadFiles = async (): Promise<void> => {
  isLoading.value = true
  try {
    const config = categories[currentTab.value]
    files.value = await ProjectService.getProjectFiles(config.folder)
  } catch (e) {
    console.error('Failed to load project files', e)
    files.value = []
  } finally {
    isLoading.value = false
  }
}

const getAssetUrl = (folder: string): string => {
  const path = ProjectService.currentPath
  if (!path) return ''
  return `z-proj://${path}/${folder}/`
}

const handleImport = async (): Promise<void> => {
  const config = categories[currentTab.value]
  const success = await ProjectService.importAssets(config.folder)
  if (success) {
    loadFiles()
  }
}

const handleDelete = async (file: string): Promise<void> => {
  if (!window.confirm(`Are you sure you want to delete ${file}? This cannot be undone.`)) return

  const config = categories[currentTab.value]
  const success = await ProjectService.deleteAsset(config.folder, file)
  if (success) {
    selectedFile.value = null
    loadFiles()
  }
}

watch(
  () => currentTab.value,
  () => {
    selectedFile.value = null
    loadFiles()
    searchQuery.value = ''
  }
)

watch(
  () => store.isProjectLoaded,
  (loaded) => {
    if (loaded) loadFiles()
  }
)

onMounted((): void => {
  if (store.isProjectLoaded) loadFiles()
})
</script>

<template>
  <div class="flex flex-col w-full h-full bg-white">
    <!-- Header -->
    <header
      class="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white shadow-sm z-30"
    >
      <div class="flex items-center gap-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
            {{ categories[currentTab].label }}
          </h1>
          <p class="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">
            {{ files.length }} items available
          </p>
        </div>

        <!-- Search Bar -->
        <div class="relative w-64 ml-4">
          <IconSearch class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size="16" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search assets..."
            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:border-slate-300 outline-none transition-all"
          />
        </div>
      </div>

      <button
        class="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-slate-900/10 active:scale-95"
        @click="handleImport"
      >
        <IconPlus size="18" />
        Import Asset
      </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden relative">
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-white/80 z-20 transition-opacity"
      >
        <div class="flex flex-col items-center">
          <div
            class="w-10 h-10 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin mb-4"
          ></div>
          <p class="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
            Loading assets...
          </p>
        </div>
      </div>

      <div
        v-if="!store.isProjectLoaded && !isLoading"
        class="absolute inset-0 flex items-center justify-center bg-slate-50/50"
      >
        <div
          class="flex flex-col items-center text-center p-12 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 max-w-sm"
        >
          <div
            class="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-slate-900/20"
          >
            <IconPlus size="32" />
          </div>
          <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
            No Project Ready
          </h2>
          <p class="text-sm text-slate-400 font-medium leading-relaxed">
            Please open or create a project from the dashboard to manage your game assets.
          </p>
        </div>
      </div>

      <div v-else class="h-full flex flex-col px-8 bg-slate-50/10">
        <ResourceGrid
          class="flex-1"
          :files="filteredFiles"
          :base-path="getAssetUrl(categories[currentTab].folder)"
          :selected-file="selectedFile || undefined"
          @select="selectedFile = $event"
        />
      </div>
    </main>

    <!-- Footer / Stats -->
    <footer
      class="px-8 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest"
    >
      <div class="flex gap-6">
        <span>Project: {{ ProjectService.currentPath?.split('/').pop() }}</span>
      </div>
      <div class="flex items-center gap-2">
        <div
          class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        ></div>
        Connected
      </div>
    </footer>

    <!-- Preview Modal -->
    <ResourcePreviewModal
      v-if="selectedFile"
      :file="selectedFile"
      :all-files="filteredFiles"
      :folder="categories[currentTab].folder"
      :base-url="getAssetUrl(categories[currentTab].folder)"
      @close="selectedFile = null"
      @navigate="selectedFile = $event"
      @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
/* Smooth scroll for the grid */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
</style>
