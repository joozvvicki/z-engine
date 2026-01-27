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
  <div class="flex h-full gap-4 text-xs select-none">
    <div class="w-48 flex flex-col bg-white rounded">
      <div
        class="p-2 border-b border-white/5 font-bold text-black/50 flex justify-between items-center"
      >
        <span>Actors List</span>
        <button class="hover:text-green-400" @click="handleAdd"><IconPlus :size="14" /></button>
      </div>

      <div class="flex-1 overflow-y-auto scrollbar-thin">
        <div
          v-for="actor in db.actors"
          :key="actor.id"
          class="px-3 py-2 cursor-pointer flex items-center gap-2 border-l-2 transition-colors"
          :class="
            selectedId === actor.id
              ? 'bg-black/20 border-blue-500 text-black'
              : 'border-transparent text-gray-400 hover:bg-white/5'
          "
          @click="selectedId = actor.id"
        >
          <span class="font-mono opacity-50">{{ actor.id.toString().padStart(3, '0') }}</span>
          <span class="truncate">{{ actor.name }}</span>
        </div>
      </div>

      <div class="p-2 border-t border-white/5 text-center">
        <button
          class="w-full bg-white border border-white/10 py-1 hover:bg-red-900/30 hover:border-red-800 transition-colors text-gray-400"
          @click="() => db.deleteActor(selectedId)"
        >
          Delete Max
        </button>
      </div>
    </div>

    <div
      v-if="selectedActor"
      class="flex-1 bg-white border border-white/10 rounded p-4 overflow-y-auto"
    >
      <div class="flex gap-6 mb-6">
        <div class="flex flex-col gap-2">
          <div
            class="w-[144px] h-[144px] bg-black border border-white/20 flex items-center justify-center relative group"
          >
            <span class="text-black/20">Face Image</span>
            <div
              class="absolute inset-0 bg-white/10 hidden group-hover:flex items-center justify-center cursor-pointer"
            >
              Change
            </div>
          </div>
          <div
            class="w-[144px] h-[48px] bg-black border border-white/20 flex items-center justify-center relative group"
          >
            <span class="text-black/20">Char Sprite</span>
          </div>
        </div>

        <div class="flex-1 grid grid-cols-2 gap-4 h-min">
          <div class="space-y-1">
            <label class="block text-black/40">Name</label>
            <input v-model="selectedActor.name" class="z-input w-full" type="text" />
          </div>

          <div class="space-y-1">
            <label class="block text-black/40">Nickname</label>
            <input v-model="selectedActor.nickname" class="z-input w-full" type="text" />
          </div>

          <div class="space-y-1">
            <label class="block text-black/40">Class</label>
            <select v-model="selectedActor.classId" class="z-input w-full">
              <option :value="1">Hero</option>
              <option :value="2">Mage</option>
              <option :value="3">Warrior</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <label class="block text-black/40">Initial Lvl</label>
              <input
                v-model="selectedActor.initialLevel"
                class="z-input w-full"
                type="number"
                min="1"
                max="99"
              />
            </div>
            <div class="space-y-1">
              <label class="block text-black/40">Max Lvl</label>
              <input
                v-model="selectedActor.maxLevel"
                class="z-input w-full"
                type="number"
                min="1"
                max="99"
              />
            </div>
          </div>

          <div class="col-span-2 space-y-1">
            <label class="block text-black/40">Profile / Description</label>
            <textarea
              v-model="selectedActor.profile"
              class="z-input w-full h-20 resize-none"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="border border-white/10 rounded">
        <div class="bg-black/20 p-2 border-b border-white/10 font-bold text-black/60">
          Traits / Features
        </div>
        <div class="p-4 text-center text-black/20 italic">
          (Feature list implementation coming soon...)
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center text-black/20">
      Select an actor to edit
    </div>
  </div>
</template>

<style scoped></style>
