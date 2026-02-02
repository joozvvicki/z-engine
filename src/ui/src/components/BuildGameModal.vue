<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-white/50 flex items-center justify-center z-50 pointer-events-auto"
  >
    <div class="bg-white border border-black/10 rounded-lg shadow-xl w-96 p-6">
      <h2 class="text-xl font-bold text-black mb-4">Build Game</h2>

      <!-- Form -->
      <div v-if="!isBuilding" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Game Name</label>
          <input
            v-model="gameName"
            type="text"
            class="w-full bg-white border border-black/10 text-black px-3 py-2 rounded focus:outline-none focus:border-black/10"
            placeholder="My Awesome Game"
          />
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1">Platform</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-black">
              <input v-model="platform" type="radio" value="win" /> Windows
            </label>
            <label class="flex items-center gap-2 text-black">
              <input v-model="platform" type="radio" value="mac" /> Mac
            </label>
            <label class="flex items-center gap-2 text-black">
              <input v-model="platform" type="radio" value="linux" /> Linux
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
            class="px-4 py-2 text-gray-300 hover:text-white hover:bg-black/10 rounded transition-colors cursor-pointer"
            @click="close"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-black hover:bg-black/60 text-white cursor-pointer rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!gameName"
            @click="build"
          >
            Build
          </button>
        </div>
      </div>

      <!-- Spinner / Progress -->
      <div v-else class="text-center py-6">
        <div v-if="!buildResult">
          <div
            class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"
          ></div>
          <p class="text-white text-lg">Building Game...</p>
          <p class="text-gray-400 text-sm mt-2">This may take a minute...</p>
        </div>

        <div v-else>
          <div v-if="buildResult.success" class="text-green-400 text-5xl mb-4">✓</div>
          <div v-else class="text-red-400 text-5xl mb-4">✗</div>

          <h3 class="text-white font-bold text-lg mb-2">
            {{ buildResult.success ? 'Build Complete!' : 'Build Failed' }}
          </h3>
          <p class="text-gray-300 text-sm mb-6 wrap-break-word">{{ buildResult.message }}</p>

          <button class="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded" @click="close">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ProjectService } from '../services/ProjectService'

const isOpen = ref(false)
const isBuilding = ref(false)
const gameName = ref('My Game')
const platform = ref('win')
const buildResult = ref<{ success: boolean; message: string } | null>(null)

const open = (): void => {
  isOpen.value = true
  isBuilding.value = false
  buildResult.value = null
  // Default name based on project folder?
  if (ProjectService.currentPath) {
    const parts = ProjectService.currentPath.split('/') || ProjectService.currentPath.split('\\')
    gameName.value = parts[parts.length - 1]
  }
}

const close = (): void => {
  if (isBuilding.value && !buildResult.value) return // Prevent closing while building
  isOpen.value = false
}

const build = async (): Promise<void> => {
  isBuilding.value = true
  buildResult.value = null

  try {
    const result = await ProjectService.buildGame(platform.value, gameName.value)
    buildResult.value = result
  } catch (e) {
    buildResult.value = { success: false, message: (e as Error).message || 'Unknown error' }
  }
}

defineExpose({ open })
</script>
