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
    <div class="px-6 py-4 border-b border-gray-100 bg-white shadow-sm z-10">
      <h2
        class="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
      >
        System Database
      </h2>
      <p class="text-gray-500 mt-1 text-xs">
        Manage global state persistence (Switches & Variables). These can be referenced in Event
        Conditions.
      </p>
    </div>

    <!-- Columns Container -->
    <div class="flex-1 flex overflow-hidden divide-x divide-gray-100">
      <!-- Switches Column -->
      <div class="flex-1 flex flex-col min-w-0 bg-gray-50/30">
        <div class="p-3 border-b border-gray-100 bg-white sticky top-0 z-10 space-y-2">
          <div class="flex items-center justify-between">
            <h3
              class="font-bold text-gray-700 uppercase tracking-widest text-xs flex items-center gap-2"
            >
              <span class="w-2 h-2 rounded-full bg-blue-500"></span> Switches
            </h3>
            <span class="text-[10px] font-mono text-gray-400"
              >{{ filteredSwitches.length }} / {{ store.systemSwitches.length }}</span
            >
          </div>

          <div class="relative group">
            <IconSearch
              :size="14"
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
            />
            <input
              v-model="searchSwitches"
              type="text"
              placeholder="Search ID or Name..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 border border-transparent rounded-md focus:bg-white focus:border-blue-200 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
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
                class="w-10 text-right font-mono text-xs text-gray-400 select-none group-focus-within:text-blue-500"
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

          <div class="mt-4 px-4 pb-8" v-if="!searchSwitches">
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
              <span class="w-2 h-2 rounded-full bg-indigo-500"></span> Variables
            </h3>
            <span class="text-[10px] font-mono text-gray-400"
              >{{ filteredVariables.length }} / {{ store.systemVariables.length }}</span
            >
          </div>

          <div class="relative group">
            <IconSearch
              :size="14"
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors"
            />
            <input
              v-model="searchVariables"
              type="text"
              placeholder="Search ID or Name..."
              class="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 border border-transparent rounded-md focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
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
                class="w-10 text-right font-mono text-xs text-gray-400 select-none group-focus-within:text-indigo-500"
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

          <div class="mt-4 px-4 pb-8" v-if="!searchVariables">
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
