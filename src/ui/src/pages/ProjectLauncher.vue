<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '../stores/editor'
import { ProjectService } from '../services/ProjectService'
import { IconFolder, IconPlus } from '@tabler/icons-vue'

import { onMounted } from 'vue'

const router = useRouter()
const store = useEditorStore()

onMounted(async () => {
  const lastPath = ProjectService.loadLastProject()
  if (lastPath) {
    try {
      // Auto-load
      // We need to bypass folder selection if path is known
      // Store.loadProject calls selectProject which opens dialog...
      // We need store.loadProject(false) AND ProjectService to be loaded.
      // loadLastProject() already sets this.projectPath!
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
    // Auto load without dialog
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
  <div class="h-screen w-screen bg-white text-black flex flex-col items-center justify-center p-10">
    <div class="max-w-2xl w-full bg-white rounded-xl border border-black/10 shadow-2xl p-8">
      <div class="text-center mb-10">
        <h1
          class="text-4xl font-black tracking-tighter mb-2 flex items-center justify-center gap-3"
        >
          Z Engine
        </h1>
        <p class="text-black">Create or open a project to start building.</p>
      </div>

      <div v-if="!isCreating" class="grid grid-cols-2 gap-6">
        <button
          class="aspect-square bg-white/50 hover:bg-black/10 hover:border-black/50 border-2 border-dashed border-black cursor-pointer rounded-xl flex flex-col items-center justify-center gap-4 transition-all group"
          @click="openProject"
        >
          <IconFolder class="w-16 h-16 text-black group-hover:text-black" />
          <span class="text-xl font-bold text-black group-hover:text-black">Open Project</span>
        </button>

        <button
          class="aspect-square bg-white/50 hover:bg-black/10 hover:border-black/50 border-2 border-dashed border-black cursor-pointer rounded-xl flex flex-col items-center justify-center gap-4 transition-all group"
          @click="isCreating = true"
        >
          <IconPlus class="w-16 h-16 text-black group-hover:text-black" />
          <span class="text-xl font-bold text-black group-hover:text-black">New Project</span>
        </button>
      </div>

      <div v-else class="space-y-6 animate-fade-in">
        <div>
          <label class="block text-sm font-bold text-black mb-2">Project Name</label>
          <input
            v-model="projectName"
            type="text"
            class="w-full bg-white border border-black/10 rounded-lg px-4 py-3 focus:border-black outline-none transition-colors"
          />
        </div>

        <div>
          <label class="block text-sm font-bold text-black mb-2">Location</label>
          <div class="flex gap-2">
            <input
              :value="parentPath"
              readonly
              type="text"
              class="flex-1 bg-white border border-black/10 rounded-lg px-4 py-3 text-black cursor-not-allowed"
              placeholder="Select folder..."
            />
            <button
              class="bg-black hover:bg-black/80 text-white px-6 rounded-lg font-bold transition-colors cursor-pointer"
              @click="selectParentFolder"
            >
              Browse
            </button>
          </div>
        </div>

        <div class="flex gap-4 pt-4">
          <button
            class="flex-1 py-3 font-bold text-black hover:bg-black/10 rounded-lg transition-colors w-full cursor-pointer"
            @click="isCreating = false"
          >
            Cancel
          </button>
          <button
            class="flex-1 bg-black hover:bg-black/80 text-white px-6 rounded-lg font-bold transition-colors w-full cursor-pointer"
            @click="createProject"
          >
            Create Project
          </button>
        </div>
      </div>

      <p
        v-if="errorMsg"
        class="text-red-400 text-center mt-6 text-sm bg-red-400/20 py-2 rounded-lg"
      >
        {{ errorMsg }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
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
