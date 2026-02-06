<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconPackage,
  IconCoins,
  IconSettings,
  IconClick,
  IconClock,
  IconTarget,
  IconFlask
} from '@tabler/icons-vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.items[0]?.id || 0)
const searchQuery = ref('')

// --- COMPUTED ---
const filteredItems = computed(() => {
  if (!searchQuery.value) return db.items
  const query = searchQuery.value.toLowerCase()
  return db.items.filter((i) => i.name.toLowerCase().includes(query))
})

const selectedItem = computed(() => db.items.find((i) => i.id === selectedId.value))

// --- ACTIONS ---
const handleAdd = () => {
  db.addItem()
  const last = db.items[db.items.length - 1]
  if (last) selectedId.value = last.id
}

const handleDelete = () => {
  if (confirm('Are you sure you want to delete this item?')) {
    db.deleteItem(selectedId.value)
    if (db.items.length > 0) selectedId.value = db.items[0].id
  }
}

// --- MOCK DATA ---
const itemTypes = ['Regular Item', 'Key Item', 'Hidden Item A', 'Hidden Item B']
const scopes = ['1 Enemy', 'All Enemies', '1 Ally', 'All Allies', 'The User', 'None']
const occasions = ['Always', 'Battle Screen', 'Menu Screen', 'Never']
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Inventory</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-amber-600 hover:text-white text-slate-500 transition-all"
            title="Add Item"
            @click="handleAdd"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>

        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search items..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === item.id
              ? 'bg-white border-amber-200 shadow-md shadow-amber-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = item.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100 text-amber-500"
          >
            <IconPackage :size="20" stroke-width="1.5" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === item.id ? 'text-amber-700' : 'text-slate-700'"
              >
                {{ item.name || 'Unnamed Item' }}
              </span>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                ID:{{ item.id }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-400 truncate">Consumable</span>
              <span
                v-if="item.price > 0"
                class="text-[10px] font-bold text-slate-500 flex items-center gap-0.5"
              >
                {{ item.price }} G
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
          Delete Item
        </button>
      </div>
    </div>

    <div v-if="selectedItem" class="flex-1 flex flex-col h-full overflow-hidden">
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="max-w-5xl mx-auto p-10">
          <div class="flex flex-col md:flex-row gap-8 mb-10">
            <div class="group relative shrink-0">
              <div
                class="w-32 h-32 bg-slate-50 rounded-[2rem] border-2 border-slate-100 flex items-center justify-center shadow-sm relative overflow-hidden"
              >
                <IconPackage :size="48" class="text-amber-400" stroke-width="1.5" />

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
                  >Item Name</label
                >
                <input
                  v-model="selectedItem.name"
                  type="text"
                  class="w-full text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-amber-500 outline-none py-1 transition-colors placeholder:text-slate-200"
                  placeholder="e.g. Potion"
                  @input="db.save('Items.json', db.items)"
                />
              </div>

              <div class="space-y-1.5">
                <label
                  class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <IconSettings :size="12" /> Item Type
                </label>
                <div class="relative">
                  <select
                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-amber-400 appearance-none cursor-pointer"
                  >
                    <option v-for="type in itemTypes" :key="type">{{ type }}</option>
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
                  v-model.number="selectedItem.price"
                  type="number"
                  class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-3 py-2.5 outline-none focus:border-amber-400 transition-all"
                  @input="db.save('Items.json', db.items)"
                />
              </div>

              <div class="col-span-2 space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Description</label
                >
                <textarea
                  v-model="selectedItem.description"
                  class="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-50 outline-none resize-none transition-all"
                  placeholder="Item description shown in menu..."
                  @input="db.save('Items.json', db.items)"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-12 gap-8">
            <div class="col-span-4 space-y-6">
              <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <h4 class="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <IconClick :size="14" class="text-amber-500" /> Usage
                </h4>

                <label class="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    class="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 rounded-md bg-white"
                    checked
                  />
                  <span class="text-xs font-medium text-slate-600 group-hover:text-slate-900"
                    >Consumable</span
                  >
                </label>

                <div class="space-y-1.5 pt-2 border-t border-slate-200/50">
                  <label
                    class="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"
                  >
                    <IconTarget :size="10" /> Scope
                  </label>
                  <select
                    class="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-2 py-2 outline-none focus:border-amber-400"
                  >
                    <option v-for="scope in scopes" :key="scope">{{ scope }}</option>
                  </select>
                </div>

                <div class="space-y-1.5">
                  <label
                    class="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1"
                  >
                    <IconClock :size="10" /> Occasion
                  </label>
                  <select
                    class="w-full bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-2 py-2 outline-none focus:border-amber-400"
                  >
                    <option v-for="occ in occasions" :key="occ">{{ occ }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="col-span-8">
              <div class="flex items-center gap-3 mb-4">
                <div class="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                  <IconFlask :size="16" />
                </div>
                <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">Effects</h3>
                <div class="h-px bg-slate-200 flex-1"></div>
              </div>

              <div
                class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center group hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer"
              >
                <div
                  class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-300 mb-3 group-hover:scale-110 transition-transform"
                >
                  <IconPlus :size="24" />
                </div>
                <h4 class="text-sm font-bold text-slate-700">Add Effect</h4>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">
                  Configure HP/MP recovery, state removal, and growth effects here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
        <IconPackage :size="40" class="opacity-50" />
      </div>
      <span class="text-sm font-bold text-slate-400">No Item Selected</span>
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
