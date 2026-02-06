<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useEditorStore } from '@ui/stores/editor'
import {
  IconSearch,
  IconPlus,
  IconFolder,
  IconMusic,
  IconPhoto,
  IconUsers,
  IconLayoutGrid,
  IconMoodSmile,
  IconBolt,
  IconSparkles,
  IconRefresh,
  IconDatabase
} from '@tabler/icons-vue'
import { ProjectService } from '../services/ProjectService'
import ResourceGrid from '../components/ResourceGrid.vue'
import ResourcePreviewModal from '../components/modal/ResourcePreviewModal.vue'

const route = useRoute()
const router = useRouter()
const store = useEditorStore()

type ResourceType =
  | 'tilesets'
  | 'characters'
  | 'faces'
  | 'backgrounds'
  | 'animations'
  | 'music'
  | 'sounds'

const categories: Record<ResourceType, { folder: string; label: string; icon: any }> = {
  tilesets: { folder: 'img/tilesets', label: 'Tilesets', icon: IconLayoutGrid },
  characters: { folder: 'img/characters', label: 'Characters', icon: IconUsers },
  faces: { folder: 'img/faces', label: 'Faces', icon: IconMoodSmile },
  backgrounds: { folder: 'img/backgrounds', label: 'Backgrounds', icon: IconPhoto },
  animations: { folder: 'img/animations', label: 'Animations', icon: IconSparkles },
  music: { folder: 'audio/bgm', label: 'Music (BGM)', icon: IconMusic },
  sounds: { folder: 'audio/se', label: 'Sounds (SE)', icon: IconBolt }
}

const currentTab = computed((): ResourceType => {
  const path = route.path.split('/').pop() as ResourceType
  return categories[path] ? path : 'tilesets'
})

const navigateTo = (key: string) => {
  router.push(`/resources/${key}`)
}

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
  if (success) loadFiles()
}

const handleDelete = async (file: string): Promise<void> => {
  if (!window.confirm(`Are you sure you want to delete ${file}?`)) return
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

onMounted(() => {
  if (store.isProjectLoaded) loadFiles()
})
</script>

<template>
  <div class="flex w-full h-full bg-white text-slate-900 font-sans overflow-hidden">
    <aside class="w-64 bg-slate-50/80 flex flex-col shrink-0 z-10 border-r border-slate-200">
      <div class="px-5 pt-6 pb-4">
        <h2 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 px-2">
          Project Assets
        </h2>
        <p class="text-xs text-slate-500 font-medium px-2 opacity-60">Manage your game files</p>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        <nav class="space-y-0.5">
          <button
            v-for="(config, key) in categories"
            :key="key"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all group border border-transparent"
            :class="
              currentTab === key
                ? 'bg-white text-blue-600 shadow-sm border-slate-200'
                : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
            "
            @click="navigateTo(key)"
          >
            <div class="flex items-center gap-3">
              <component
                :is="config.icon"
                :size="16"
                :stroke-width="currentTab === key ? 2.5 : 2"
                class="transition-colors"
                :class="
                  currentTab === key ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                "
              />
              {{ config.label }}
            </div>

            <div
              v-if="currentTab === key"
              class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"
            ></div>
          </button>
        </nav>
      </div>

      <div class="p-4 mt-auto border-t border-slate-200/60 bg-slate-100/50">
        <div class="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <div class="p-1.5 bg-slate-100 rounded-md">
              <IconDatabase :size="14" class="text-slate-500" />
            </div>
            <span class="text-[10px] font-bold text-slate-900 uppercase tracking-wide"
              >Storage</span
            >
          </div>
          <div class="w-full h-1.5 bg-slate-100 rounded-full mb-1.5 overflow-hidden">
            <div class="h-full bg-slate-900 w-[35%] rounded-full"></div>
          </div>
          <div class="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Used: 124 MB</span>
            <span>35%</span>
          </div>
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 bg-white relative">
      <header
        class="h-16 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100"
      >
        <div class="flex items-center gap-3">
          <div
            class="h-9 w-9 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-blue-600 shadow-sm"
          >
            <component :is="categories[currentTab].icon" :size="18" stroke-width="2" />
          </div>
          <div>
            <h1 class="text-base font-bold text-slate-900 leading-tight">
              {{ categories[currentTab].label }}
            </h1>
            <div class="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
              <span>/assets/{{ categories[currentTab].folder.split('/')[1] }}</span>
              <span class="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>{{ files.length }} files</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative group">
            <IconSearch
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
              size="14"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search..."
              class="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-50 rounded-lg text-xs font-medium w-40 focus:w-56 transition-all outline-none placeholder:text-slate-400"
            />
          </div>

          <div class="h-6 w-px bg-slate-200 mx-1"></div>

          <button
            class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all active:scale-95"
            title="Refresh"
            @click="loadFiles"
          >
            <IconRefresh size="18" />
          </button>

          <button
            class="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-slate-900/10 active:scale-95"
            @click="handleImport"
          >
            <IconPlus size="14" />
            <span>Import</span>
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-hidden relative px-6">
        <div
          v-if="isLoading"
          class="absolute inset-0 flex items-center justify-center bg-white/80 z-20 backdrop-blur-sm"
        >
          <div class="flex flex-col items-center">
            <div
              class="w-8 h-8 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-3"
            ></div>
            <span class="text-xs font-bold text-slate-400">Loading resources...</span>
          </div>
        </div>

        <div
          v-else-if="files.length === 0"
          class="h-full p-8 flex flex-col items-center justify-center"
        >
          <div
            class="group w-full max-w-md aspect-video rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-all duration-300 flex flex-col items-center justify-center text-center p-8 cursor-pointer relative overflow-hidden"
            @click="handleImport"
          >
            <div
              class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style="
                background-image: radial-gradient(#3b82f6 1px, transparent 1px);
                background-size: 20px 20px;
                opacity: 0.1;
              "
            ></div>

            <div class="relative mb-6">
              <div
                class="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center relative z-10 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300 ease-out"
              >
                <IconFolderOpen
                  size="40"
                  class="text-slate-300 group-hover:text-blue-500 transition-colors duration-300"
                  stroke-width="1.5"
                />
              </div>

              <div
                class="absolute -right-3 -top-3 bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm z-20 group-hover:rotate-12 transition-transform duration-500 delay-75"
              >
                <IconPlus size="14" class="text-blue-500" stroke-width="3" />
              </div>
              <div
                class="absolute -left-2 -bottom-1 bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm z-20 group-hover:-rotate-12 transition-transform duration-500 delay-100"
              >
                <component :is="categories[currentTab].icon" size="14" class="text-slate-400" />
              </div>
            </div>

            <h3
              class="text-base font-black text-slate-700 mb-2 group-hover:text-blue-700 transition-colors"
            >
              It's a bit empty here
            </h3>
            <p
              class="text-xs text-slate-400 font-medium max-w-[240px] leading-relaxed mb-6 group-hover:text-slate-500 transition-colors"
            >
              Start by importing your {{ categories[currentTab].label.toLowerCase() }} files to
              populate this folder.
            </p>

            <button
              class="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold shadow-sm group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all active:scale-95"
            >
              Import Assets
            </button>
          </div>
        </div>

        <ResourceGrid
          v-else
          class="h-full py-6"
          :files="filteredFiles"
          :base-path="getAssetUrl(categories[currentTab].folder)"
          :selected-file="selectedFile || undefined"
          @select="selectedFile = $event"
        />
      </main>
    </div>

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
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
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
