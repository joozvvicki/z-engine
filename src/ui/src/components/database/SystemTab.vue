<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { ref, computed } from 'vue'
import { IconSearch } from '@tabler/icons-vue'

const store = useEditorStore()

const maxSwitches = ref(50)
const maxVariables = ref(50)
const searchSwitches = ref('')
const searchVariables = ref('')

const ensureSize = (arr: string[], size: number): void => {
  if (arr.length < size) {
    const originalLength = arr.length
    arr.length = size
    arr.fill('', originalLength)
  }
}

// Ensure initial sizes
ensureSize(store.systemSwitches, maxSwitches.value)
ensureSize(store.systemVariables, maxVariables.value)

const onResize = (): void => {
  ensureSize(store.systemSwitches, maxSwitches.value)
  ensureSize(store.systemVariables, maxVariables.value)
}

const loadMoreSwitches = (): void => {
  maxSwitches.value += 20
  onResize()
}

const loadMoreVariables = (): void => {
  maxVariables.value += 20
  onResize()
}

const filteredSwitches = computed(() => {
  const query = searchSwitches.value.toLowerCase()
  return store.systemSwitches
    .map((name, index) => ({ name, index }))
    .filter((item) => {
      if (!query) return true
      const idStr = String(item.index + 1)
      return idStr.includes(query) || item.name.toLowerCase().includes(query)
    })
})

const filteredVariables = computed(() => {
  const query = searchVariables.value.toLowerCase()
  return store.systemVariables
    .map((name, index) => ({ name, index }))
    .filter((item) => {
      if (!query) return true
      const idStr = String(item.index + 1)
      return idStr.includes(query) || item.name.toLowerCase().includes(query)
    })
})
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden text-sm text-gray-800 bg-white">
    <!-- Header -->
    <div class="px-8 py-6 border-b border-gray-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
      <h2 class="text-2xl font-bold text-gray-900 tracking-tight">System Configuration</h2>
      <p class="text-sm text-gray-500 mt-1">
        Manage global game settings, switches, and variables.
      </p>
    </div>

    <!-- Columns Container -->
    <div class="flex-1 flex overflow-hidden divide-x divide-gray-100">
      <!-- General Settings Column -->
      <div class="w-64 bg-gray-50 flex flex-col border-r border-gray-100">
        <div
          class="p-3 border-b border-gray-100 bg-white font-bold text-gray-700 uppercase tracking-widest text-xs flex items-center gap-2"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-black"></span> General
        </div>
        <div class="p-4 space-y-6 overflow-y-auto">
          <!-- Player Start -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Player Start</h4>

            <div class="space-y-1">
              <label class="text-xs font-medium text-gray-600">Start Map ID</label>
              <input
                v-model.number="store.systemStartMapId"
                type="number"
                class="w-full p-2 text-xs border border-gray-200 rounded focus:border-blue-400 outline-none transition-colors"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-600">X</label>
                <input
                  v-model.number="store.systemStartX"
                  type="number"
                  class="w-full p-2 text-xs border border-gray-200 rounded focus:border-blue-400 outline-none transition-colors"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-600">Y</label>
                <input
                  v-model.number="store.systemStartY"
                  type="number"
                  class="w-full p-2 text-xs border border-gray-200 rounded focus:border-blue-400 outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          <!-- Player Graphic -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">Player Graphic</h4>
            <div class="space-y-1">
              <label class="text-xs font-medium text-gray-600">Asset Path</label>
              <input
                v-model="store.systemPlayerGraphic"
                type="text"
                class="w-full p-2 text-xs border border-gray-200 rounded focus:border-blue-400 outline-none transition-colors"
                placeholder="img/characters/..."
              />
              <p class="text-[10px] text-gray-400">Relative to project root</p>
            </div>
          </div>

          <!-- Screen Resolution -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Screen Resolution
            </h4>
            <div class="grid grid-cols-2 gap-2">
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-600">Width</label>
                <input
                  v-model.number="store.systemScreenWidth"
                  type="number"
                  class="w-full p-2 text-xs border border-gray-200 rounded focus:border-blue-400 outline-none transition-colors"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs font-medium text-gray-600">Height</label>
                <input
                  v-model.number="store.systemScreenHeight"
                  type="number"
                  class="w-full p-2 text-xs border border-gray-200 rounded focus:border-blue-400 outline-none transition-colors"
                />
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-gray-600">Default Zoom</label>
              <input
                v-model.number="store.systemScreenZoom"
                type="number"
                step="0.1"
                min="0.1"
                class="w-full p-2 text-xs border border-gray-200 rounded focus:border-blue-400 outline-none transition-colors"
              />
            </div>
            <p class="text-[10px] text-gray-400">Fixed internal scale in Play Mode</p>
          </div>
        </div>
      </div>

      <!-- Switches Column -->
      <div class="flex-1 flex flex-col min-w-0 bg-gray-50/30">
        <div class="p-3 border-b border-gray-100 bg-white sticky top-0 z-10 space-y-2">
          <div class="flex items-center justify-between">
            <h3
              class="font-bold text-gray-700 uppercase tracking-widest text-xs flex items-center gap-2"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-black"></span> Switches
            </h3>
            <span class="text-[10px] font-mono text-gray-400"
              >{{ filteredSwitches.length }} / {{ store.systemSwitches.length }}</span
            >
          </div>

          <div class="relative group">
            <IconSearch
              :size="14"
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
            />
            <input
              v-model="searchSwitches"
              type="text"
              placeholder="Search ID or Name..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 outline-none transition-all"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto overflow-x-hidden p-2">
          <div class="space-y-0.5">
            <div
              v-for="item in filteredSwitches"
              :key="`sw-${item.index}`"
              class="flex items-center gap-3 p-1 rounded hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 focus-within:bg-white focus-within:border-blue-100 focus-within:ring-2 focus-within:ring-blue-50 transition-all group"
            >
              <span
                class="w-10 text-right font-mono text-xs text-gray-400 select-none group-focus-within:text-black"
              >
                {{ String(item.index + 1).padStart(3, '0') }}
              </span>
              <input
                v-model="store.systemSwitches[item.index]"
                class="flex-1 bg-transparent border-none p-1 text-gray-700 placeholder-gray-300 focus:ring-0 text-sm font-medium"
                placeholder="Unnamed Switch"
              />
            </div>
          </div>

          <div v-if="!searchSwitches" class="mt-4 px-4 pb-8">
            <button
              class="w-full py-2.5 border border-dashed border-gray-300 rounded-lg text-gray-400 text-xs font-medium hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              @click="loadMoreSwitches"
            >
              Load More (Total: {{ maxSwitches }})
            </button>
          </div>

          <div
            v-else-if="filteredSwitches.length === 0"
            class="flex flex-col items-center justify-center py-10 text-gray-400 opacity-60"
          >
            <IconSearch :size="32" stroke-width="1.5" />
            <span class="text-xs mt-2">No switches found</span>
          </div>
        </div>
      </div>

      <!-- Variables Column -->
      <div class="flex-1 flex flex-col min-w-0 bg-white">
        <div class="p-3 border-b border-gray-100 bg-white sticky top-0 z-10 space-y-2">
          <div class="flex items-center justify-between">
            <h3
              class="font-bold text-gray-700 uppercase tracking-widest text-xs flex items-center gap-2"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-black"></span> Variables
            </h3>
            <span class="text-[10px] font-mono text-gray-400"
              >{{ filteredVariables.length }} / {{ store.systemVariables.length }}</span
            >
          </div>

          <div class="relative group">
            <IconSearch
              :size="14"
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors"
            />
            <input
              v-model="searchVariables"
              type="text"
              placeholder="Search ID or Name..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 outline-none transition-all"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto overflow-x-hidden p-2">
          <div class="space-y-0.5">
            <div
              v-for="item in filteredVariables"
              :key="`var-${item.index}`"
              class="flex items-center gap-3 p-1 rounded hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-100 focus-within:bg-gray-50 focus-within:border-indigo-100 focus-within:ring-2 focus-within:ring-indigo-50 transition-all group"
            >
              <span
                class="w-10 text-right font-mono text-xs text-gray-400 select-none group-focus-within:text-black"
              >
                {{ String(item.index + 1).padStart(3, '0') }}
              </span>
              <input
                v-model="store.systemVariables[item.index]"
                class="flex-1 bg-transparent border-none p-1 text-gray-700 placeholder-gray-300 focus:ring-0 text-sm font-medium"
                placeholder="Unnamed Variable"
              />
            </div>
          </div>

          <div v-if="!searchVariables" class="mt-4 px-4 pb-8">
            <button
              class="w-full py-2.5 border border-dashed border-gray-300 rounded-lg text-gray-400 text-xs font-medium hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
              @click="loadMoreVariables"
            >
              Load More (Total: {{ maxVariables }})
            </button>
          </div>

          <div
            v-else-if="filteredVariables.length === 0"
            class="flex flex-col items-center justify-center py-10 text-gray-400 opacity-60"
          >
            <IconSearch :size="32" stroke-width="1.5" />
            <span class="text-xs mt-2">No variables found</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
