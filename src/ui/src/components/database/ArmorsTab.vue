<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import {
  IconPlus,
  IconShield,
  IconSearch,
  IconTrash,
  IconCoins,
  IconHanger,
  IconChartBar
} from '@tabler/icons-vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.armors[0]?.id || 0)
const searchQuery = ref('')

// --- COMPUTED ---
const filteredArmors = computed(() => {
  if (!searchQuery.value) return db.armors
  const query = searchQuery.value.toLowerCase()
  return db.armors.filter((a) => a.name.toLowerCase().includes(query))
})

const selectedArmor = computed(() => db.armors.find((a) => a.id === selectedId.value))

// --- ACTIONS ---
const handleAdd = (): void => {
  db.addArmor()
  const last = db.armors[db.armors.length - 1]
  if (last) selectedId.value = last.id
}

const handleDelete = (): void => {
  if (confirm('Are you sure you want to delete this armor?')) {
    db.deleteArmor(selectedId.value)
    if (db.armors.length > 0) selectedId.value = db.armors[0].id
  }
}

// --- STATS CONFIG ---
const paramNames = ['MHP', 'MMP', 'ATK', 'DEF', 'MAT', 'MDF', 'AGI', 'LUK']

// Typy ekwipunku (Hardcoded for UI demo, in real app likely from System store)
const equipmentTypes = [
  { id: 1, name: 'Shield' },
  { id: 2, name: 'Head' },
  { id: 3, name: 'Body' },
  { id: 4, name: 'Accessory' }
]

const updateParam = (index: number, value: number): void => {
  if (selectedArmor.value) {
    selectedArmor.value.params[index] = value
    db.save('Armors.json', db.armors)
  }
}
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Armory</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-500 transition-all"
            title="Add Armor"
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
            placeholder="Search equipment..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="armor in filteredArmors"
          :key="armor.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === armor.id
              ? 'bg-white border-blue-200 shadow-md shadow-blue-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = armor.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-400"
          >
            <IconShield :size="20" stroke-width="1.5" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === armor.id ? 'text-blue-700' : 'text-slate-700'"
              >
                {{ armor.name || 'Unnamed' }}
              </span>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                ID:{{ armor.id }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-400 truncate">
                {{ equipmentTypes.find((t) => t.id === armor.etypeId)?.name || 'General Armor' }}
              </span>
              <span
                v-if="armor.price > 0"
                class="text-[10px] font-bold text-amber-500 flex items-center gap-0.5"
              >
                {{ armor.price }} G
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
          Delete Armor
        </button>
      </div>
    </div>

    <div v-if="selectedArmor" class="flex-1 flex flex-col h-full overflow-hidden">
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="max-w-5xl mx-auto p-10">
          <div class="flex flex-col md:flex-row gap-8 mb-10">
            <div class="group relative shrink-0">
              <div
                class="w-32 h-32 bg-slate-50 rounded-4xl border-2 border-slate-100 flex items-center justify-center shadow-sm relative overflow-hidden"
              >
                <IconShield :size="48" class="text-slate-300" stroke-width="1" />

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
                  >Armor Name</label
                >
                <input
                  v-model="selectedArmor.name"
                  type="text"
                  class="w-full text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1 transition-colors placeholder:text-slate-200"
                  placeholder="e.g. Mythril Shield"
                  @input="db.save('Armors.json', db.armors)"
                />
              </div>

              <div class="space-y-1.5">
                <label
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <IconHanger :size="12" /> Equipment Type
                </label>
                <div class="relative">
                  <select
                    v-model="selectedArmor.etypeId"
                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all appearance-none"
                    @change="db.save('Armors.json', db.armors)"
                  >
                    <option v-for="type in equipmentTypes" :key="type.id" :value="type.id">
                      {{ type.name }}
                    </option>
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

              <div class="space-y-1.5">
                <label
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <IconCoins :size="12" /> Price
                </label>
                <input
                  v-model.number="selectedArmor.price"
                  type="number"
                  class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  @input="db.save('Armors.json', db.armors)"
                />
              </div>

              <div class="col-span-2 space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Description</label
                >
                <textarea
                  v-model="selectedArmor.description"
                  class="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none resize-none transition-all"
                  placeholder="Description shown in inventory..."
                  @input="db.save('Armors.json', db.armors)"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="mb-10">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                <IconChartBar :size="16" />
              </div>
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                Stat Changes
              </h3>
              <div class="h-px bg-slate-200 flex-1"></div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div v-for="(name, index) in paramNames" :key="name" class="relative group">
                <div
                  class="bg-white border border-slate-200 rounded-xl p-3 hover:border-emerald-300 hover:shadow-md transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{
                    name
                  }}</span>

                  <div class="relative w-full">
                    <input
                      type="number"
                      :value="selectedArmor.params[index]"
                      class="w-full text-center text-xl font-black text-slate-700 bg-transparent border-none outline-none focus:text-emerald-600 focus:scale-110 transition-all p-0 m-0"
                      @input="
                        (e) => updateParam(index, parseInt((e.target as HTMLInputElement).value))
                      "
                    />
                    <span
                      v-if="selectedArmor.params[index] > 0"
                      class="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-bold text-emerald-500 pointer-events-none"
                      >+</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center text-center opacity-70"
          >
            <p class="text-xs text-slate-400 font-medium">
              Advanced Traits (Elemental Resistances, State Immunities) coming in v1.1
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center mb-4">
        <IconShield :size="40" class="opacity-50" />
      </div>
      <span class="text-sm font-bold text-slate-400">No Armor Selected</span>
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
