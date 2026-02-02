<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import { IconPlus, IconUsers, IconSearch } from '@tabler/icons-vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.enemies[0]?.id || 0)
const searchQuery = ref('')

const filteredEnemies = computed(() => {
  if (!searchQuery.value) return db.enemies
  const query = searchQuery.value.toLowerCase()
  return db.enemies.filter((e) => e.name.toLowerCase().includes(query))
})

const selectedEnemy = computed(() => db.enemies.find((e) => e.id === selectedId.value))

const handleAdd = (): void => {
  db.addEnemy()
  const last = db.enemies[db.enemies.length - 1]
  if (last) selectedId.value = last.id
}

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
  <div class="flex h-full text-[13px] select-none text-gray-700">
    <!-- Enemy List Sidebar -->
    <div class="w-64 flex flex-col bg-gray-50/50 border-r border-gray-100">
      <div
        class="px-4 py-4 flex flex-col gap-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm"
      >
        <div class="flex justify-between items-center">
          <span class="font-bold text-gray-900 tracking-tight">Enemies</span>
          <button
            class="w-7 h-7 flex items-center justify-center bg-black text-white rounded-lg shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all"
            @click="handleAdd"
          >
            <IconPlus :size="14" stroke-width="3" />
          </button>
        </div>

        <div class="relative">
          <IconSearch class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" :size="14" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search enemies..."
            class="w-full pl-8 pr-3 py-1.5 bg-gray-100/50 border border-transparent rounded-lg text-[11px] focus:bg-white focus:border-black/10 outline-none transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="enemy in filteredEnemies"
          :key="enemy.id"
          class="px-3 py-2.5 cursor-pointer flex items-center gap-3 rounded-xl transition-all group relative"
          :class="
            selectedId === enemy.id
              ? 'bg-white text-black shadow-sm ring-1 ring-gray-200'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
          "
          @click="selectedId = enemy.id"
        >
          <div
            v-if="selectedId === enemy.id"
            class="absolute left-1.5 w-1 h-4 bg-black rounded-full"
          ></div>
          <span class="font-mono text-[10px] opacity-40 font-bold w-6 text-right">{{
            enemy.id.toString().padStart(3, '0')
          }}</span>
          <span class="truncate font-medium">{{ enemy.name || 'Unnamed Enemy' }}</span>
        </div>
      </div>

      <div class="p-3 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <button
          class="w-full py-2 flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          @click="() => db.deleteEnemy(selectedId)"
        >
          Remove Enemy
        </button>
      </div>
    </div>

    <!-- Enemy Detail Content -->
    <div v-if="selectedEnemy" class="flex-1 flex flex-col overflow-hidden bg-white">
      <div class="flex-1 overflow-y-auto p-8">
        <div class="max-w-4xl mx-auto space-y-10">
          <div class="grid grid-cols-2 gap-x-6 gap-y-5">
            <div class="col-span-1 flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                >Enemy Name</label
              >
              <input
                v-model="selectedEnemy.name"
                class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                type="text"
                @input="db.save('Enemies.json', db.enemies)"
              />
            </div>

            <div class="col-span-2 grid grid-cols-4 gap-4 pt-4">
              <div v-for="stat in stats" :key="stat.key" class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400">{{
                  stat.label
                }}</label>
                <input
                  v-model.number="selectedEnemy[stat.key]"
                  class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                  type="number"
                  @input="db.save('Enemies.json', db.enemies)"
                />
              </div>
            </div>

            <div class="col-span-1 flex flex-col gap-1.5 pt-4">
              <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                >EXP Reward</label
              >
              <input
                v-model.number="selectedEnemy.exp"
                class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                type="number"
                @input="db.save('Enemies.json', db.enemies)"
              />
            </div>

            <div class="col-span-1 flex flex-col gap-1.5 pt-4">
              <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                >Gold Reward</label
              >
              <input
                v-model.number="selectedEnemy.gold"
                class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                type="number"
                @input="db.save('Enemies.json', db.enemies)"
              />
            </div>
          </div>

          <!-- Future Extensions -->
          <div class="space-y-4 pt-10 border-t border-gray-100">
            <div class="flex items-center gap-3">
              <span class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                >Visuals & AI</span
              >
              <div class="flex-1 h-px bg-gray-100"></div>
            </div>

            <div
              class="bg-gray-50/20 rounded-2xl border border-dashed border-gray-200 p-12 text-center"
            >
              <p class="text-gray-400 text-sm italic">
                Enemy visuals (battler graphic) and AI behavioral patterns are under development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center bg-white text-gray-300">
      <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <IconUsers :size="32" stroke-width="1" class="opacity-20 translate-x-0.5" />
      </div>
      <p class="text-sm font-medium">Select an enemy from the list or create a new one</p>
    </div>
  </div>
</template>
