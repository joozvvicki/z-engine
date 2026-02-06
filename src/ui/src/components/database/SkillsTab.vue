<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconSparkles,
  IconBolt,
  IconTarget,
  IconClock,
  IconMessage
} from '@tabler/icons-vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.skills[0]?.id || 0)
const searchQuery = ref('')

// --- COMPUTED ---
const filteredSkills = computed(() => {
  if (!searchQuery.value) return db.skills
  const query = searchQuery.value.toLowerCase()
  return db.skills.filter((s) => s.name.toLowerCase().includes(query))
})

const selectedSkill = computed(() => db.skills.find((s) => s.id === selectedId.value))

// --- ACTIONS ---
const handleAdd = () => {
  db.addSkill()
  const last = db.skills[db.skills.length - 1]
  if (last) selectedId.value = last.id
}

const handleDelete = () => {
  if (confirm('Are you sure you want to delete this skill?')) {
    db.deleteSkill(selectedId.value)
    if (db.skills.length > 0) selectedId.value = db.skills[0].id
  }
}

// --- MOCK DATA FOR UI ---
// W przyszłości te pola powinny być w modelu Skill w store
const scopes = ['1 Enemy', 'All Enemies', '1 Random Enemy', '1 Ally', 'All Allies', 'The User']
const occasions = ['Always', 'Battle Screen', 'Menu Screen', 'Never']
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Skills</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-cyan-600 hover:text-white text-slate-500 transition-all"
            title="Add Skill"
            @click="handleAdd"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>

        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search skills..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="skill in filteredSkills"
          :key="skill.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === skill.id
              ? 'bg-white border-cyan-200 shadow-md shadow-cyan-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = skill.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0 border border-cyan-100 text-cyan-500"
          >
            <IconSparkles :size="20" stroke-width="1.5" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === skill.id ? 'text-cyan-700' : 'text-slate-700'"
              >
                {{ skill.name || 'Unnamed Skill' }}
              </span>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                ID:{{ skill.id }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-400 truncate">Magic / Special</span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-200 bg-slate-50/50">
        <button
          class="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
          @click="handleDelete"
        >
          <IconTrash :size="14" />
          Delete Skill
        </button>
      </div>
    </div>

    <div v-if="selectedSkill" class="flex-1 flex flex-col h-full overflow-hidden">
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="max-w-5xl mx-auto p-10">
          <div class="flex flex-col md:flex-row gap-8 mb-10">
            <div class="group relative shrink-0">
              <div
                class="w-32 h-32 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center shadow-sm relative overflow-hidden"
              >
                <IconSparkles :size="48" class="text-cyan-400" stroke-width="1.5" />

                <div
                  class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[1px]"
                >
                  <span
                    class="px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-lg"
                    >Change Icon</span
                  >
                </div>
              </div>
            </div>

            <div class="flex-1 grid grid-cols-2 gap-6">
              <div class="col-span-2 space-y-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Skill Name</label
                >
                <input
                  v-model="selectedSkill.name"
                  type="text"
                  class="w-full text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-cyan-500 outline-none py-1 transition-colors placeholder:text-slate-200"
                  placeholder="e.g. Fireball"
                  @input="db.save('Skills.json', db.skills)"
                />
              </div>

              <div class="space-y-1.5">
                <label
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <IconBolt :size="12" /> Costs
                </label>
                <div class="flex gap-2">
                  <div class="relative flex-1">
                    <input
                      type="number"
                      placeholder="0"
                      class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl pl-3 pr-8 py-2.5 outline-none focus:border-cyan-400 transition-all"
                    />
                    <span
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400"
                      >MP</span
                    >
                  </div>
                  <div class="relative flex-1">
                    <input
                      type="number"
                      placeholder="0"
                      class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl pl-3 pr-8 py-2.5 outline-none focus:border-cyan-400 transition-all"
                    />
                    <span
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400"
                      >TP</span
                    >
                  </div>
                </div>
              </div>

              <div class="space-y-1.5">
                <label
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <IconTarget :size="12" /> Scope
                </label>
                <div class="relative">
                  <select
                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-cyan-400 appearance-none cursor-pointer"
                  >
                    <option v-for="scope in scopes" :key="scope">{{ scope }}</option>
                  </select>
                  <div
                    class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div class="col-span-2 space-y-1.5">
                <label
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <IconMessage :size="12" /> Description
                </label>
                <textarea
                  v-model="selectedSkill.description"
                  class="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 focus:bg-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-50 outline-none resize-none transition-all"
                  placeholder="Skill description shown in menu..."
                  @input="db.save('Skills.json', db.skills)"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-12 gap-8">
            <div class="col-span-4 space-y-6">
              <div class="space-y-1.5">
                <label
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <IconClock :size="12" /> Occasion
                </label>
                <div class="relative">
                  <select
                    class="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-cyan-400 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                  >
                    <option v-for="occ in occasions" :key="occ">{{ occ }}</option>
                  </select>
                  <div
                    class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 class="text-xs font-bold text-slate-900 mb-3">Invocation</h4>
                <div class="space-y-3">
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      class="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 rounded-md bg-white"
                    />
                    <span class="text-xs font-medium text-slate-600 group-hover:text-slate-900"
                      >Hit Type: Certain Hit</span
                    >
                  </label>
                  <label class="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      class="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 rounded-md bg-white"
                    />
                    <span class="text-xs font-medium text-slate-600 group-hover:text-slate-900"
                      >Cast Animation</span
                    >
                  </label>
                </div>
              </div>
            </div>

            <div class="col-span-8">
              <div class="flex items-center gap-3 mb-4">
                <div class="p-1.5 bg-cyan-100 text-cyan-600 rounded-lg">
                  <IconBolt :size="16" />
                </div>
                <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Damage & Effects
                </h3>
                <div class="h-px bg-slate-200 flex-1"></div>
              </div>

              <div
                class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center group hover:border-cyan-200 hover:bg-cyan-50/30 transition-all cursor-pointer"
              >
                <div
                  class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-300 mb-3 group-hover:scale-110 transition-transform"
                >
                  <IconPlus :size="24" />
                </div>
                <h4 class="text-sm font-bold text-slate-700">Add Effect</h4>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">
                  Damage formulas, state changes, and buffs will be configured here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
        <IconSparkles :size="40" class="opacity-50" />
      </div>
      <span class="text-sm font-bold text-slate-400">No Skill Selected</span>
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
