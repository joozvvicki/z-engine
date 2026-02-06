<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database' // Zakładam, że dodasz te tablice do store
import {
  IconFlame, // Elements
  IconSword, // Weapon Types
  IconShield, // Armor Types
  IconSparkles, // Skill Types
  IconTags, // Header
  IconPlus,
  IconTrash,
  IconSearch
} from '@tabler/icons-vue'

// --- MOCK STORE DATA (Dopóki nie ma w store) ---
// W realnym store: db.elements, db.weaponTypes, etc.
const localData = ref({
  elements: [
    { id: 1, name: 'Physical' },
    { id: 2, name: 'Fire' },
    { id: 3, name: 'Ice' },
    { id: 4, name: 'Thunder' },
    { id: 5, name: 'Water' },
    { id: 6, name: 'Earth' },
    { id: 7, name: 'Wind' },
    { id: 8, name: 'Light' },
    { id: 9, name: 'Darkness' }
  ],
  weaponTypes: [
    { id: 1, name: 'Dagger' },
    { id: 2, name: 'Sword' },
    { id: 3, name: 'Flail' },
    { id: 4, name: 'Axe' },
    { id: 5, name: 'Whip' },
    { id: 6, name: 'Staff' },
    { id: 7, name: 'Bow' },
    { id: 8, name: 'Crossbow' },
    { id: 9, name: 'Gun' },
    { id: 10, name: 'Claw' }
  ],
  armorTypes: [
    { id: 1, name: 'General Armor' },
    { id: 2, name: 'Magic Armor' },
    { id: 3, name: 'Light Armor' },
    { id: 4, name: 'Heavy Armor' },
    { id: 5, name: 'Small Shield' },
    { id: 6, name: 'Large Shield' }
  ],
  skillTypes: [
    { id: 1, name: 'Magic' },
    { id: 2, name: 'Special' }
  ]
})

type CategoryKey = 'elements' | 'weaponTypes' | 'armorTypes' | 'skillTypes'

// Konfiguracja kategorii
const categories: { id: CategoryKey; label: string; icon: any; color: string; bg: string }[] = [
  {
    id: 'elements',
    label: 'Elements',
    icon: IconFlame,
    color: 'text-orange-600',
    bg: 'bg-orange-50'
  },
  {
    id: 'skillTypes',
    label: 'Skill Types',
    icon: IconSparkles,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50'
  },
  {
    id: 'weaponTypes',
    label: 'Weapon Types',
    icon: IconSword,
    color: 'text-rose-600',
    bg: 'bg-rose-50'
  },
  {
    id: 'armorTypes',
    label: 'Armor Types',
    icon: IconShield,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  }
]

const activeCategory = ref<CategoryKey>('elements')
const searchQuery = ref('')

const activeConfig = computed(() => categories.find((c) => c.id === activeCategory.value)!)

const currentList = computed(() => {
  let list = localData.value[activeCategory.value]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((item) => item.name.toLowerCase().includes(q))
  }
  return list
})

// --- ACTIONS ---
const handleAdd = () => {
  const list = localData.value[activeCategory.value]
  const newId = list.length > 0 ? Math.max(...list.map((i) => i.id)) + 1 : 1
  list.push({ id: newId, name: '' })
  // W realnym scenariuszu: db.addElement('New Element')
}

const handleDelete = (id: number) => {
  const list = localData.value[activeCategory.value]
  const idx = list.findIndex((i) => i.id === id)
  if (idx !== -1) list.splice(idx, 1)
}
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <div class="w-64 flex flex-col border-r border-slate-200 bg-white">
      <div class="p-6 pb-2">
        <h2 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">
          Definitions
        </h2>
        <nav class="space-y-1">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="w-full text-left px-3 py-3 rounded-xl transition-all group relative overflow-hidden flex items-center gap-3"
            :class="
              activeCategory === cat.id
                ? `${cat.bg} ${cat.color} shadow-sm ring-1 ring-black/5`
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            "
            @click="activeCategory = cat.id"
          >
            <component :is="cat.icon" :size="18" :stroke-width="2" />
            <span class="text-sm font-bold">{{ cat.label }}</span>

            <span class="ml-auto text-[10px] font-bold opacity-60">
              {{ localData[cat.id].length }}
            </span>
          </button>
        </nav>
      </div>
    </div>

    <div class="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      <div
        class="h-20 px-10 flex items-center justify-between border-b border-slate-200 bg-white shrink-0"
      >
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="[activeConfig.bg, activeConfig.color]"
          >
            <component :is="activeConfig.icon" :size="24" stroke-width="2" />
          </div>
          <div>
            <h1 class="text-xl font-black text-slate-900 leading-none mb-1">
              {{ activeConfig.label }}
            </h1>
            <p class="text-xs text-slate-400 font-medium">Define types available in the game.</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="relative">
            <IconSearch
              :size="16"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Filter..."
              class="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-xs font-bold w-48 outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-95"
            @click="handleAdd"
          >
            <IconPlus :size="14" /> Add New
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div class="max-w-3xl mx-auto">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              class="flex items-center px-6 py-3 border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              <div class="w-12 text-center">ID</div>
              <div class="flex-1">Name</div>
              <div class="w-10"></div>
            </div>

            <div class="divide-y divide-slate-100">
              <div
                v-for="item in currentList"
                :key="item.id"
                class="flex items-center px-4 py-2 group hover:bg-slate-50/80 transition-colors"
              >
                <div
                  class="w-16 text-center font-mono text-xs font-bold text-slate-300 select-none"
                >
                  {{ String(item.id).padStart(2, '0') }}
                </div>

                <div class="flex-1">
                  <input
                    v-model="item.name"
                    type="text"
                    class="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-700 placeholder:text-slate-200 py-2 focus:text-slate-900 transition-colors"
                    placeholder="(Empty Name)"
                  />
                </div>

                <div
                  class="w-12 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    tabindex="-1"
                    @click="handleDelete(item.id)"
                  >
                    <IconTrash :size="16" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="currentList.length === 0" class="p-12 text-center">
              <p class="text-xs font-bold text-slate-400">No items found.</p>
            </div>
          </div>

          <p class="text-center mt-6 text-[10px] text-slate-400 font-medium">
            Maximum capacity: 99 items per category.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
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
