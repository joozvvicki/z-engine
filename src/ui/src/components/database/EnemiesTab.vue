<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconGhost,
  IconChartBar,
  IconTrophy,
  IconBox
} from '@tabler/icons-vue'
import EnemyDropItemsEditor from './common/EnemyDropItemsEditor.vue'
import EnemyActionPatternsEditor from './common/EnemyActionPatternsEditor.vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.enemies[0]?.id || 0)
const searchQuery = ref('')

// --- COMPUTED ---
const filteredEnemies = computed(() => {
  if (!searchQuery.value) return db.enemies
  const query = searchQuery.value.toLowerCase()
  return db.enemies.filter((e) => e.name.toLowerCase().includes(query))
})

const selectedEnemy = computed(() => db.enemies.find((e) => e.id === selectedId.value))

// --- ACTIONS ---
const handleAdd = (): void => {
  db.addEnemy()
  const last = db.enemies[db.enemies.length - 1]
  if (last) selectedId.value = last.id
}

const handleDelete = (): void => {
  if (confirm('Are you sure you want to delete this enemy?')) {
    db.deleteEnemy(selectedId.value)
    if (db.enemies.length > 0) selectedId.value = db.enemies[0].id
  }
}

// --- STATS CONFIG ---
const stats = [
  { key: 'mhp', label: 'Max HP' },
  { key: 'mmp', label: 'Max MP' },
  { key: 'atk', label: 'Attack' },
  { key: 'def', label: 'Defense' },
  { key: 'mat', label: 'M.Attack' },
  { key: 'mdf', label: 'M.Defense' },
  { key: 'agi', label: 'Agility' },
  { key: 'luk', label: 'Luck' }
] as const
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Bestiary</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-purple-600 hover:text-white text-slate-500 transition-all"
            title="Add Enemy"
            @click="handleAdd"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>

        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search enemies..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="enemy in filteredEnemies"
          :key="enemy.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === enemy.id
              ? 'bg-white border-purple-200 shadow-md shadow-purple-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = enemy.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100 text-purple-400"
          >
            <IconGhost :size="20" stroke-width="1.5" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === enemy.id ? 'text-purple-700' : 'text-slate-700'"
              >
                {{ enemy.name || 'Unnamed Enemy' }}
              </span>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                ID:{{ enemy.id }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-400 truncate flex items-center gap-1">
                HP: <b class="text-slate-600">{{ enemy.mhp }}</b>
              </span>
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
          Delete Enemy
        </button>
      </div>
    </div>

    <div v-if="selectedEnemy" class="flex-1 flex flex-col h-full overflow-hidden">
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="max-w-5xl mx-auto p-10">
          <div class="flex flex-col md:flex-row gap-8 mb-10">
            <div class="group relative shrink-0">
              <div
                class="w-48 h-48 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-center shadow-sm relative overflow-hidden"
              >
                <IconGhost :size="64" class="text-purple-300" stroke-width="1" />

                <div
                  class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[1px]"
                >
                  <span
                    class="px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-lg"
                    >Change Battler</span
                  >
                </div>
              </div>
            </div>

            <div class="flex-1 grid grid-cols-2 gap-6 content-start">
              <div class="col-span-2 space-y-1">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Enemy Name</label
                >
                <input
                  v-model="selectedEnemy.name"
                  type="text"
                  class="w-full text-3xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-purple-500 outline-none py-1 transition-colors placeholder:text-slate-200"
                  placeholder="e.g. Slime"
                  @input="db.save('Enemies.json', db.enemies)"
                />
              </div>

              <div class="col-span-2 p-5 bg-purple-50/50 rounded-2xl border border-purple-100">
                <h4 class="text-xs font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <IconTrophy :size="14" /> Rewards
                </h4>
                <div class="flex gap-4">
                  <div class="flex-1 space-y-1">
                    <label class="text-[9px] font-bold text-slate-400 uppercase">Experience</label>
                    <input
                      v-model.number="selectedEnemy.exp"
                      type="number"
                      class="w-full bg-white border border-purple-200 text-purple-900 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-purple-400 transition-all"
                      @input="db.save('Enemies.json', db.enemies)"
                    />
                  </div>
                  <div class="flex-1 space-y-1">
                    <label class="text-[9px] font-bold text-slate-400 uppercase">Gold</label>
                    <input
                      v-model.number="selectedEnemy.gold"
                      type="number"
                      class="w-full bg-white border border-purple-200 text-purple-900 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-purple-400 transition-all"
                      @input="db.save('Enemies.json', db.enemies)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="mb-10">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                <IconChartBar :size="16" />
              </div>
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                Base Parameters
              </h3>
              <div class="h-px bg-slate-200 flex-1"></div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div v-for="stat in stats" :key="stat.key" class="relative group">
                <div
                  class="bg-white border border-slate-200 rounded-xl p-3 hover:border-purple-300 hover:shadow-md transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{
                    stat.label
                  }}</span>
                  <input
                    v-model.number="selectedEnemy[stat.key]"
                    type="number"
                    class="w-full text-center text-xl font-black text-slate-700 bg-transparent border-none outline-none focus:text-purple-600 focus:scale-110 transition-all p-0 m-0"
                    @input="db.save('Enemies.json', db.enemies)"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <IconBox :size="16" class="text-slate-400" />
                <h3 class="text-sm font-bold text-slate-700">Drop Items</h3>
              </div>
              <EnemyDropItemsEditor
                v-if="selectedEnemy.dropItems !== undefined"
                v-model="selectedEnemy.dropItems"
                @update:model-value="db.save('Enemies.json', db.enemies)"
              />
              <EnemyDropItemsEditor
                v-else
                :model-value="[]"
                @update:model-value="
                  (updated) => {
                    if (selectedEnemy) {
                      selectedEnemy.dropItems = updated
                      db.save('Enemies.json', db.enemies)
                    }
                  }
                "
              />
            </div>

            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <IconGhost :size="16" class="text-slate-400" />
                <h3 class="text-sm font-bold text-slate-700">Action Patterns</h3>
              </div>
              <EnemyActionPatternsEditor
                v-if="selectedEnemy.actions !== undefined"
                v-model="selectedEnemy.actions"
                @update:model-value="db.save('Enemies.json', db.enemies)"
              />
              <EnemyActionPatternsEditor
                v-else
                :model-value="[]"
                @update:model-value="
                  (updated) => {
                    if (selectedEnemy) {
                      selectedEnemy.actions = updated
                      db.save('Enemies.json', db.enemies)
                    }
                  }
                "
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <IconGhost :size="40" class="opacity-50" />
      </div>
      <span class="text-sm font-bold text-slate-400">No Enemy Selected</span>
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
