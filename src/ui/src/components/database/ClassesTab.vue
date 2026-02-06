<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconTypeface,
  IconChartLine,
  IconBook
} from '@tabler/icons-vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.classes[0]?.id || 0)
const searchQuery = ref('')

// --- COMPUTED ---
const filteredClasses = computed(() => {
  if (!searchQuery.value) return db.classes
  const query = searchQuery.value.toLowerCase()
  return db.classes.filter((c) => c.name.toLowerCase().includes(query))
})

const selectedClass = computed(() => db.classes.find((c) => c.id === selectedId.value))

// --- ACTIONS ---
const handleAdd = () => {
  db.addClass()
  const last = db.classes[db.classes.length - 1]
  if (last) selectedId.value = last.id
}

const handleDelete = () => {
  if (confirm('Are you sure you want to delete this class?')) {
    db.deleteClass(selectedId.value)
    if (db.classes.length > 0) selectedId.value = db.classes[0].id
  }
}

// --- STATS ---
const paramNames = ['MHP', 'MMP', 'ATK', 'DEF', 'MAT', 'MDF', 'AGI', 'LUK']
const paramLimits = [9999, 9999, 999, 999, 999, 999, 999, 999] // for visualization scale

const updateParam = (index: number, value: number) => {
  if (selectedClass.value) {
    selectedClass.value.params[index] = value
    db.save('Classes.json', db.classes)
  }
}
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Classes</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-500 transition-all"
            title="Add Class"
            @click="handleAdd"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>

        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search classes..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="zClass in filteredClasses"
          :key="zClass.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === zClass.id
              ? 'bg-white border-blue-200 shadow-md shadow-blue-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = zClass.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-indigo-400"
          >
            <IconTypeface :size="20" stroke-width="1.5" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === zClass.id ? 'text-blue-700' : 'text-slate-700'"
              >
                {{ zClass.name || 'Unnamed Class' }}
              </span>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                ID:{{ zClass.id }}
              </span>
            </div>
            <div class="text-[10px] text-slate-400 truncate mt-0.5">Standard Growth</div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-200 bg-slate-50/50">
        <button
          class="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
          @click="handleDelete"
        >
          <IconTrash :size="14" />
          Delete Class
        </button>
      </div>
    </div>

    <div v-if="selectedClass" class="flex-1 flex flex-col h-full overflow-hidden">
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="max-w-5xl mx-auto p-10">
          <div class="flex flex-col md:flex-row gap-8 mb-10">
            <div class="group relative shrink-0">
              <div
                class="w-48 h-32 bg-slate-900 rounded-2xl shadow-lg flex flex-col items-center justify-center relative overflow-hidden"
              >
                <svg
                  class="absolute inset-0 w-full h-full text-blue-500/20"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0,128 C20,100 50,100 80,80 C120,50 160,20 192,0 L192,128 Z"
                    fill="currentColor"
                  />
                </svg>
                <svg
                  class="absolute inset-0 w-full h-full text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M0,128 C20,100 50,100 80,80 C120,50 160,20 192,0" />
                </svg>

                <div class="relative z-10 text-center">
                  <span
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1"
                    >EXP Curve</span
                  >
                  <span class="text-white font-black text-lg">Standard</span>
                </div>

                <div
                  class="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                >
                  <span
                    class="px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-lg"
                    >Edit Curve</span
                  >
                </div>
              </div>
            </div>

            <div class="flex-1 grid grid-cols-2 gap-6">
              <div class="col-span-1 space-y-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Class Name</label
                >
                <input
                  v-model="selectedClass.name"
                  type="text"
                  class="w-full text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1 transition-colors placeholder:text-slate-200"
                  placeholder="e.g. Warrior"
                  @input="db.save('Classes.json', db.classes)"
                />
              </div>

              <div class="col-span-1 space-y-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Nickname / Title</label
                >
                <input
                  v-model="selectedClass.nickname"
                  type="text"
                  class="w-full text-xl font-bold text-slate-500 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1.5 transition-colors placeholder:text-slate-200"
                  placeholder="e.g. Sword Master"
                  @input="db.save('Classes.json', db.classes)"
                />
              </div>

              <div class="col-span-2 space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Description</label
                >
                <textarea
                  v-model="selectedClass.description"
                  class="w-full h-16 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none resize-none transition-all"
                  placeholder="Description shown in status menu..."
                  @input="db.save('Classes.json', db.classes)"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="mb-10">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                <IconChartLine :size="16" />
              </div>
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                Base Parameters (Level 1)
              </h3>
              <div class="h-px bg-slate-200 flex-1"></div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div v-for="(name, index) in paramNames" :key="name" class="relative group">
                <div
                  class="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                >
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{
                      name
                    }}</span>
                  </div>

                  <div class="relative w-full mb-3">
                    <input
                      type="number"
                      :value="selectedClass.params[index]"
                      class="w-full text-2xl font-black text-slate-800 bg-transparent border-none outline-none p-0 m-0 focus:text-indigo-600 transition-colors"
                      @input="
                        (e) => updateParam(index, parseInt((e.target as HTMLInputElement).value))
                      "
                    />
                  </div>

                  <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-indigo-500 rounded-full"
                      :style="{
                        width: `${Math.min(100, (selectedClass.params[index] / paramLimits[index]) * 100)}%`
                      }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4 pt-4 border-t border-gray-100">
            <div class="flex items-center gap-3">
              <div class="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                <IconBook :size="16" />
              </div>
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                Skills to Learn
              </h3>
              <div class="flex-1 h-px bg-slate-200"></div>
            </div>

            <div
              class="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8 text-center opacity-80 hover:opacity-100 transition-opacity"
            >
              <p class="text-xs font-bold text-slate-400">
                Skill learning table (Level required, Skill) will be available in the next update.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <IconTypeface :size="40" class="opacity-50" />
      </div>
      <span class="text-sm font-bold text-slate-400">No Class Selected</span>
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
