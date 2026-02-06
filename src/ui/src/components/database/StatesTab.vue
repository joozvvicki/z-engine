<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconBiohazard, // Ikona stanów
  IconSkull,
  IconHourglass,
  IconMessage,
  IconActivity
} from '@tabler/icons-vue'

const db = useDatabaseStore()
// Mockujemy dane stanów, bo pewnie ich jeszcze nie ma w store
const mockStates = ref([
  { id: 1, name: 'Knockout', restriction: 'Cannot Move', color: '#000000', icon: 1 },
  { id: 2, name: 'Guard', restriction: 'None', color: '#3b82f6', icon: 10 },
  { id: 3, name: 'Immortal', restriction: 'None', color: '#eab308', icon: 15 },
  { id: 4, name: 'Poison', restriction: 'None', color: '#a855f7', icon: 20 },
  { id: 5, name: 'Sleep', restriction: 'Cannot Move', color: '#64748b', icon: 25 },
  { id: 6, name: 'Silence', restriction: 'Cannot use Magic', color: '#ef4444', icon: 30 },
  { id: 7, name: 'Confusion', restriction: 'Attack Anyone', color: '#f97316', icon: 35 }
])

const selectedId = ref<number>(1)
const searchQuery = ref('')

const filteredStates = computed(() => {
  if (!searchQuery.value) return mockStates.value
  const query = searchQuery.value.toLowerCase()
  return mockStates.value.filter((s) => s.name.toLowerCase().includes(query))
})

const selectedState = computed(() => mockStates.value.find((s) => s.id === selectedId.value))

const handleAdd = () => {
  const newId = mockStates.value.length + 1
  mockStates.value.push({
    id: newId,
    name: 'New State',
    restriction: 'None',
    color: '#ffffff',
    icon: 0
  })
  selectedId.value = newId
}

const handleDelete = () => {
  /* Logic similar to other tabs */
}

// Config
const restrictions = ['None', 'Cannot Move', 'Attack Enemy', 'Attack Anyone', 'Attack Ally']
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Conditions</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-fuchsia-600 hover:text-white text-slate-500 transition-all"
            @click="handleAdd"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>
        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-fuchsia-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search states..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="state in filteredStates"
          :key="state.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === state.id
              ? 'bg-white border-fuchsia-200 shadow-md shadow-fuchsia-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = state.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-fuchsia-50 flex items-center justify-center shrink-0 border border-fuchsia-100 text-fuchsia-500"
          >
            <IconBiohazard v-if="state.id > 3" :size="20" stroke-width="1.5" />
            <IconActivity v-else :size="20" stroke-width="1.5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === state.id ? 'text-fuchsia-700' : 'text-slate-700'"
                >{{ state.name }}</span
              >
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded"
                >ID:{{ state.id }}</span
              >
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-400 truncate">{{ state.restriction }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedState" class="flex-1 flex flex-col h-full overflow-hidden">
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="max-w-5xl mx-auto p-10">
          <div class="flex flex-col md:flex-row gap-8 mb-10">
            <div class="group relative shrink-0">
              <div
                class="w-32 h-32 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center shadow-sm relative overflow-hidden"
              >
                <IconSkull :size="48" class="text-fuchsia-300" stroke-width="1.5" />
                <div
                  class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[1px]"
                >
                  <span
                    class="px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-lg"
                    >Icon</span
                  >
                </div>
              </div>
            </div>

            <div class="flex-1 grid grid-cols-2 gap-6">
              <div class="col-span-2 space-y-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >State Name</label
                >
                <input
                  v-model="selectedState.name"
                  type="text"
                  class="w-full text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-fuchsia-500 outline-none py-1 transition-colors"
                />
              </div>

              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Restriction</label
                >
                <div class="relative">
                  <select
                    v-model="selectedState.restriction"
                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-fuchsia-400 appearance-none cursor-pointer"
                  >
                    <option v-for="res in restrictions" :key="res">{{ res }}</option>
                  </select>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Overlay Color</label
                >
                <div
                  class="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <div
                    class="w-6 h-6 rounded-lg shadow-sm border border-black/10"
                    :style="{ backgroundColor: selectedState.color }"
                  ></div>
                  <input
                    v-model="selectedState.color"
                    type="text"
                    class="bg-transparent text-xs font-mono font-bold text-slate-600 outline-none w-20"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-12 gap-8">
            <div
              class="col-span-5 p-5 bg-fuchsia-50/50 rounded-2xl border border-fuchsia-100 space-y-5"
            >
              <h4 class="text-xs font-bold text-fuchsia-900 mb-2 flex items-center gap-2">
                <IconHourglass :size="14" /> Removal Conditions
              </h4>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-medium text-slate-600">Remove at Battle End</label>
                  <input type="checkbox" checked class="accent-fuchsia-600 w-4 h-4" />
                </div>

                <div class="space-y-1 pt-2 border-t border-fuchsia-200/50">
                  <label class="text-[9px] font-bold text-slate-400 uppercase"
                    >Auto-removal Timing</label
                  >
                  <div class="flex items-center gap-2">
                    <input
                      type="number"
                      value="3"
                      class="w-16 bg-white border border-fuchsia-200 rounded-lg py-1.5 px-2 text-center text-xs font-bold"
                    />
                    <span class="text-xs text-slate-400">~</span>
                    <input
                      type="number"
                      value="5"
                      class="w-16 bg-white border border-fuchsia-200 rounded-lg py-1.5 px-2 text-center text-xs font-bold"
                    />
                    <span class="text-xs text-slate-500 font-bold">Turns</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-span-7 space-y-4">
              <div class="flex items-center gap-2 mb-2">
                <IconMessage :size="16" class="text-slate-400" />
                <h3 class="text-sm font-bold text-slate-700">Log Messages</h3>
              </div>

              <div class="space-y-2">
                <div class="space-y-1">
                  <label class="text-[9px] font-bold text-slate-400 uppercase"
                    >If an ally is inflicted</label
                  >
                  <input
                    type="text"
                    placeholder="is poisoned!"
                    class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-fuchsia-400 outline-none"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-[9px] font-bold text-slate-400 uppercase"
                    >If an enemy is inflicted</label
                  >
                  <input
                    type="text"
                    placeholder="is poisoned!"
                    class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-fuchsia-400 outline-none"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-[9px] font-bold text-slate-400 uppercase">If removed</label>
                  <input
                    type="text"
                    placeholder="is no longer poisoned!"
                    class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-fuchsia-400 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
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
