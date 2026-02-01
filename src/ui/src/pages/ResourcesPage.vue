<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ProjectService } from '../services/ProjectService'
import ResourceGrid from '../components/ResourceGrid.vue'
import { IconUsers, IconLayoutGrid } from '@tabler/icons-vue'

const currentTab = ref<'tilesets' | 'characters'>('tilesets')
const tilesets = ref<string[]>([])
const characters = ref<string[]>([])
const isLoading = ref(true)

const loadFiles = async () => {
  isLoading.value = true
  try {
    tilesets.value = await ProjectService.getProjectFiles('img/tilesets')
    characters.value = await ProjectService.getProjectFiles('img/characters')
  } catch (e) {
    console.error('Failed to load project files', e)
  } finally {
    isLoading.value = false
  }
}

const getAssetUrl = (folder: string) => {
  const path = ProjectService.currentPath
  if (!path) return ''
  return `z-proj://${path}/${folder}/`
}

onMounted(() => {
  loadFiles()
})
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Header -->
    <header
      class="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white/50 backdrop-blur-md sticky top-0 z-10"
    >
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Resources</h1>
        <p class="text-sm text-gray-500 mt-1">Manage and preview your game assets</p>
      </div>

      <div class="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-sm">
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
          :class="
            currentTab === 'tilesets'
              ? 'bg-white text-black/60 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
          @click="currentTab = 'tilesets'"
        >
          <IconLayoutGrid :size="18" />
          Tilesets
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
          :class="
            currentTab === 'characters'
              ? 'bg-white text-black/60 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
          @click="currentTab = 'characters'"
        >
          <IconUsers :size="18" />
          Characters
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden relative">
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-white/80 z-20 transition-opacity"
      >
        <div class="flex flex-col items-center">
          <div
            class="w-10 h-10 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mb-4"
          ></div>
          <p class="text-sm font-medium text-gray-500 animate-pulse">Loading assets...</p>
        </div>
      </div>

      <div class="h-full overflow-y-auto px-4">
        <ResourceGrid
          v-if="currentTab === 'tilesets'"
          :files="tilesets"
          :base-path="getAssetUrl('img/tilesets')"
        />
        <ResourceGrid
          v-else-if="currentTab === 'characters'"
          :files="characters"
          :base-path="getAssetUrl('img/characters')"
        />
      </div>
    </main>

    <!-- Footer / Stats -->
    <footer
      class="px-8 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-400 uppercase tracking-widest"
    >
      <div class="flex gap-6">
        <span>Total Tilesets: {{ tilesets.length }}</span>
        <span>Total Characters: {{ characters.length }}</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-green-400"></div>
        Project Connected
      </div>
    </footer>
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
