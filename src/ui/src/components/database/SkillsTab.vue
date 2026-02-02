<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import { IconPlus, IconSparkles, IconSearch } from '@tabler/icons-vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.skills[0]?.id || 0)
const searchQuery = ref('')

const filteredSkills = computed(() => {
  if (!searchQuery.value) return db.skills
  const query = searchQuery.value.toLowerCase()
  return db.skills.filter((s) => s.name.toLowerCase().includes(query))
})

const selectedSkill = computed(() => db.skills.find((s) => s.id === selectedId.value))

const handleAdd = (): void => {
  db.addSkill()
  const last = db.skills[db.skills.length - 1]
  if (last) selectedId.value = last.id
}
</script>

<template>
  <div class="flex h-full text-[13px] select-none text-gray-700">
    <!-- Skill List Sidebar -->
    <div class="w-64 flex flex-col bg-gray-50/50 border-r border-gray-100">
      <div
        class="px-4 py-4 flex flex-col gap-3 border-b border-gray-100 bg-white/80 backdrop-blur-sm"
      >
        <div class="flex justify-between items-center">
          <span class="font-bold text-gray-900 tracking-tight">Skills</span>
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
            placeholder="Search skills..."
            class="w-full pl-8 pr-3 py-1.5 bg-gray-100/50 border border-transparent rounded-lg text-[11px] focus:bg-white focus:border-black/10 outline-none transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div
          v-for="skill in filteredSkills"
          :key="skill.id"
          class="px-3 py-2.5 cursor-pointer flex items-center gap-3 rounded-xl transition-all group relative"
          :class="
            selectedId === skill.id
              ? 'bg-white text-black shadow-sm ring-1 ring-gray-200'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
          "
          @click="selectedId = skill.id"
        >
          <div
            v-if="selectedId === skill.id"
            class="absolute left-1.5 w-1 h-4 bg-black rounded-full"
          ></div>
          <span class="font-mono text-[10px] opacity-40 font-bold w-6 text-right">{{
            skill.id.toString().padStart(3, '0')
          }}</span>
          <span class="truncate font-medium">{{ skill.name || 'Unnamed Skill' }}</span>
        </div>
      </div>

      <div class="p-3 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <button
          class="w-full py-2 flex items-center justify-center gap-2 text-[11px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          @click="() => db.deleteSkill(selectedId)"
        >
          Remove Skill
        </button>
      </div>
    </div>

    <!-- Skill Detail Content -->
    <div v-if="selectedSkill" class="flex-1 flex flex-col overflow-hidden bg-white">
      <div class="flex-1 overflow-y-auto p-8">
        <div class="max-w-4xl mx-auto space-y-10">
          <div class="grid grid-cols-2 gap-x-6 gap-y-5">
            <div class="col-span-1 flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                >Skill Name</label
              >
              <input
                v-model="selectedSkill.name"
                class="px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:bg-white focus:border-black/20 focus:ring-4 focus:ring-black/5 outline-none transition-all shadow-sm"
                type="text"
                @input="db.save('Skills.json', db.skills)"
              />
            </div>

            <div class="col-span-2 flex flex-col gap-1.5">
              <label class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                >Description</label
              >
              <textarea
                v-model="selectedSkill.description"
                placeholder="Describe what this skill does..."
                class="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-900 focus:bg-white focus:border-black/20 outline-none transition-all shadow-sm h-32 resize-none leading-relaxed"
                @input="db.save('Skills.json', db.skills)"
              ></textarea>
            </div>
          </div>

          <!-- Future Extensions -->
          <div class="space-y-4 pt-10 border-t border-gray-100">
            <div class="flex items-center gap-3">
              <span class="text-[10px] uppercase tracking-widest font-bold text-gray-400"
                >Effects & Costs</span
              >
              <div class="flex-1 h-px bg-gray-100"></div>
            </div>

            <div
              class="bg-gray-50/20 rounded-2xl border border-dashed border-gray-200 p-12 text-center"
            >
              <p class="text-gray-400 text-sm italic">
                Advanced skill configuration (MP cost, effects, animations) is under development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center bg-white text-gray-300">
      <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
        <IconSparkles :size="32" stroke-width="1" class="opacity-20 translate-x-0.5" />
      </div>
      <p class="text-sm font-medium">Select a skill from the list or create a new one</p>
    </div>
  </div>
</template>
