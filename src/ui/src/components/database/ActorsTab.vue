<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import { IconPlus } from '@tabler/icons-vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.actors[0]?.id || 0)

const selectedActor = computed(() => db.actors.find((a) => a.id === selectedId.value))

const handleAdd = (): void => {
  db.addActor()
  // Wybierz nowo dodanego
  const last = db.actors[db.actors.length - 1]
  if (last) selectedId.value = last.id
}
</script>

<template>
  <div class="flex h-full text-[13px] select-none text-gray-700">
    <!-- Actor List Sidebar -->
    <div class="w-64 flex flex-col bg-gray-50/50 border-r border-gray-100">
      <div
        class="px-4 py-4 flex justify-between items-center border-b border-gray-100 bg-white/80 backdrop-blur-sm"
      >
        <span class="font-bold text-gray-900 tracking-tight">Actors</span>
        <button
          class="w-7 h-7 flex items-center justify-center bg-black text-white rounded-lg shadow-lg shadow-black/10 hover:scale-105 active:scale-95 transition-all"
          @click="handleAdd"
        >
          <IconPlus :size="14" stroke-width="3" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="actor in db.actors"
          :key="actor.id"
          class="px-3 py-2.5 cursor-pointer flex items-center gap-3 rounded-xl transition-all group relative"
          :class="
            selectedId === actor.id
              ? 'bg-white text-black shadow-sm ring-1 ring-gray-200'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
          "
          @click="selectedId = actor.id"
        >
          <div
            v-if="selectedId === actor.id"
            class="absolute left-1.5 w-1 h-4 bg-black rounded-full"
          ></div>
          <span class="font-mono text-[10px] opacity-40 font-bold w-6">{{
            actor.id.toString().padStart(3, '0')
          }}</span>
          <span class="truncate font-medium">{{ actor.name || 'Unnamed Actor' }}</span>
        </div>
      </div>

      <div class="p-3 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <button
          class="w-full py-2 flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          @click="() => db.deleteActor(selectedId)"
        >
          Remove Actor
        </button>
      </div>
    </div>

    <!-- Actor Detail Content -->
    <div v-if="selectedActor" class="flex-1 flex flex-col overflow-hidden bg-white">
      <div class="flex-1 overflow-y-auto p-8">
        <div class="max-w-4xl mx-auto space-y-10">
          <!-- Profile Header Section -->
          <div class="flex gap-8 items-start">
            <!-- Visual Previews -->
            <div class="space-y-4">
              <div class="flex flex-col gap-1.5">
                <span class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                  >Face View</span
                >
                <div
                  class="relative group w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all hover:border-gray-300"
                >
                  <span class="text-[10px] font-medium text-gray-400 group-hover:hidden"
                    >No Image</span
                  >
                  <div
                    class="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center cursor-pointer transition-all"
                  >
                    <span class="text-white text-[10px] font-bold uppercase tracking-widest"
                      >Update</span
                    >
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <span class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                  >Character Sprite</span
                >
                <div
                  class="w-32 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center opacity-50"
                >
                  <div class="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            <!-- Basic Info Grid -->
            <div class="flex-1 grid grid-cols-2 gap-x-6 gap-y-5">
              <div class="col-span-1 flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                  >Name</label
                >
                <input
                  v-model="selectedActor.name"
                  class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                  type="text"
                />
              </div>

              <div class="col-span-1 flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                  >Nickname</label
                >
                <input
                  v-model="selectedActor.nickname"
                  class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                  type="text"
                />
              </div>

              <div class="col-span-1 flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                  >Archetype / Class</label
                >
                <div class="relative">
                  <select
                    v-model="selectedActor.classId"
                    class="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm appearance-none"
                  >
                    <option :value="1">Adventurer</option>
                    <option :value="2">Spellcaster</option>
                    <option :value="3">Berserker</option>
                  </select>
                  <div
                    class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
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

              <div class="col-span-1 grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label
                    class="text-[10px] uppercase tracking-widest font-bold text-gray-400 text-center"
                    >Initial Lv</label
                  >
                  <input
                    v-model="selectedActor.initialLevel"
                    class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 text-center focus:bg-white focus:border-black/20 outline-none transition-all shadow-sm"
                    type="number"
                    min="1"
                    max="99"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label
                    class="text-[10px] uppercase tracking-widest font-bold text-gray-400 text-center"
                    >Max Lv</label
                  >
                  <input
                    v-model="selectedActor.maxLevel"
                    class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 text-center focus:bg-white focus:border-black/20 outline-none transition-all shadow-sm"
                    type="number"
                    min="1"
                    max="99"
                  />
                </div>
              </div>

              <div class="col-span-2 flex flex-col gap-1.5">
                <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                  >Biography / Notes</label
                >
                <textarea
                  v-model="selectedActor.profile"
                  placeholder="Tell the actor's story..."
                  class="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 focus:bg-white focus:border-black/20 outline-none transition-all shadow-sm h-28 resize-none leading-relaxed"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Tabs/Sections for Extended Data -->
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <span class="text-[10px] uppercase tracking-widest font-bold text-gray-900"
                >Traits & Capabilities</span
              >
              <div class="flex-1 h-px bg-gray-100"></div>
            </div>

            <div class="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center space-y-3">
              <div
                class="inline-flex w-12 h-12 items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h4 class="font-bold text-gray-900">Traits System coming soon</h4>
                <p class="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  Configure special abilities, elemental resistances, and unique battle mechanics
                  for this actor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center bg-white text-gray-300">
      <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <IconPlus :size="32" stroke-width="1" class="opacity-20 translate-x-0.5" />
      </div>
      <p class="text-sm font-medium">Select an actor from the side list to begin editing</p>
    </div>
  </div>
</template>

<style scoped></style>
