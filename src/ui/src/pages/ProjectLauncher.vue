<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '../stores/editor'
import { ProjectService } from '../services/ProjectService'
import { IconFolder, IconPlus, IconArrowLeft, IconRocket, IconCode } from '@tabler/icons-vue'

const router = useRouter()
const store = useEditorStore()

onMounted(async () => {
  const lastPath = ProjectService.loadLastProject()
  if (lastPath) {
    try {
      await store.loadProject(false)
      if (ProjectService.isLoaded()) {
        router.push('/editor')
      }
    } catch (e) {
      console.warn('Failed to auto-load last project', e)
    }
  }
})

const isCreating = ref(false)
const projectName = ref('My RPG Project')
const parentPath = ref('')
const errorMsg = ref('')

const selectParentFolder = async (): Promise<void> => {
  // @ts-ignore - Zakładamy obecność API w oknie (Electron/Preload)
  const path = await window.api.selectProjectFolder()
  if (path) {
    parentPath.value = path
  }
}

const openProject = async (): Promise<void> => {
  await store.loadProject(true)
  if (ProjectService.isLoaded()) {
    router.push('/editor')
  }
}

const createProject = async (): Promise<void> => {
  if (!parentPath.value || !projectName.value) {
    errorMsg.value = 'Please select a folder and enter a name.'
    return
  }

  try {
    await ProjectService.createProject(parentPath.value, projectName.value)
    await store.loadProject(false)
    router.push('/editor')
  } catch (e: unknown) {
    if (e instanceof Error) {
      errorMsg.value = e.message
    } else {
      errorMsg.value = 'An unknown error occurred'
    }
  }
}
</script>

<template>
  <div
    class="h-screen w-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center relative overflow-hidden font-sans"
  >
    <div
      class="absolute inset-0 z-0 opacity-[0.4]"
      style="
        background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
        background-size: 24px 24px;
      "
    ></div>

    <div
      class="relative z-10 w-full max-w-2xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white p-12 overflow-hidden"
    >
      <div class="text-center mb-12">
        <div
          class="inline-flex items-center justify-center w-16 h-16 bg-slate-900 text-white rounded-2xl mb-6 shadow-lg shadow-slate-900/20"
        >
          <IconRocket :size="32" stroke-width="1.5" />
        </div>
        <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-3">
          <span class="text-slate-900 mr-4">Z</span>
          <span class="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-violet-600"
            >Engine</span
          >
        </h1>
        <p class="text-slate-500 font-medium text-lg">Build your world, one tile at a time.</p>
      </div>

      <div v-if="!isCreating" class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        <button
          class="group relative h-48 bg-white border border-slate-200 rounded-3xl p-8 text-left hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer overflow-hidden"
          @click="openProject"
        >
          <div
            class="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500"
          >
            <IconFolder :size="100" />
          </div>
          <div class="relative z-10 flex flex-col h-full justify-between">
            <div
              class="h-12 w-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"
            >
              <IconFolder :size="24" />
            </div>
            <div>
              <h3
                class="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors"
              >
                Open Project
              </h3>
              <p class="text-slate-500 text-sm mt-1">Locate a project.json file</p>
            </div>
          </div>
        </button>

        <button
          class="group relative h-48 bg-slate-900 text-white rounded-3xl p-8 text-left hover:shadow-2xl hover:shadow-slate-900/20 hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
          @click="isCreating = true"
        >
          <div class="absolute inset-0 bg-linear-to-br from-slate-800 to-black"></div>
          <div class="relative z-10 flex flex-col h-full justify-between">
            <div
              class="h-12 w-12 bg-white/10 backdrop-blur-sm text-white rounded-2xl flex items-center justify-center"
            >
              <IconPlus :size="24" />
            </div>
            <div>
              <h3 class="text-xl font-bold">New Project</h3>
              <p class="text-white/50 text-sm mt-1">Start from scratch</p>
            </div>
          </div>
        </button>
      </div>

      <div v-else class="animate-fade-in max-w-md mx-auto">
        <div class="space-y-6">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1"
              >Project Name</label
            >
            <input
              v-model="projectName"
              type="text"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="My Awesome RPG"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1"
              >Parent Folder</label
            >
            <div class="flex gap-2">
              <div class="relative flex-1">
                <IconFolder
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  :size="18"
                />
                <input
                  :value="parentPath"
                  readonly
                  type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-600 text-sm font-medium cursor-not-allowed select-none"
                  placeholder="No folder selected"
                />
              </div>
              <button
                class="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                @click="selectParentFolder"
              >
                Browse
              </button>
            </div>
          </div>

          <div
            v-if="errorMsg"
            class="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3"
          >
            <div class="h-2 w-2 rounded-full bg-red-500"></div>
            <p class="text-xs font-bold text-red-600">{{ errorMsg }}</p>
          </div>

          <div class="pt-4 flex gap-4">
            <button
              class="flex-1 py-3.5 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              @click="isCreating = false"
            >
              <IconArrowLeft :size="16" /> Back
            </button>
            <button
              class="flex-1 bg-linear-to-r from-blue-600 to-violet-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              @click="createProject"
            >
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute bottom-6 text-center">
      <div
        class="flex items-center gap-2 text-slate-400 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity cursor-default"
      >
        <IconCode :size="14" />
        <span>v1.0.0-alpha &bull; Z Engine Studio</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
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
</style>
