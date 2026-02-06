<script setup lang="ts">
import { ref, computed } from 'vue'
import { ZClassLearning } from '@engine/types'
import { useDatabaseStore } from '@ui/stores/database'
import { IconPlus, IconTrash, IconBook } from '@tabler/icons-vue'

interface Props {
  modelValue?: ZClassLearning[]
}

interface Emits {
  (e: 'update:modelValue', value: ZClassLearning[]): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})
const emit = defineEmits<Emits>()

const db = useDatabaseStore()
const showAddModal = ref(false)
const newLearning = ref<ZClassLearning>({
  level: 1,
  skillId: 1
})

const sortedLearnings = computed(() => {
  return [...(props.modelValue || [])].sort((a, b) => a.level - b.level)
})

const addLearning = (): void => {
  const learnings = [...(props.modelValue || []), { ...newLearning.value }]
  emit('update:modelValue', learnings)
  showAddModal.value = false
  resetNewLearning()
}

const removeLearning = (index: number): void => {
  const learnings = sortedLearnings.value.filter((_, i) => i !== index)
  emit('update:modelValue', learnings)
}

const updateLearning = (index: number, field: 'level' | 'skillId', value: number): void => {
  const learnings = [...sortedLearnings.value]
  learnings[index] = { ...learnings[index], [field]: value }
  emit('update:modelValue', learnings)
}

const resetNewLearning = (): void => {
  newLearning.value = {
    level: 1,
    skillId: db.skills[0]?.id || 1
  }
}

const openAddModal = (): void => {
  resetNewLearning()
  showAddModal.value = true
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
          <IconBook :size="16" />
        </div>
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">Skills to Learn</h3>
      </div>
      <button
        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
        @click="openAddModal"
      >
        <IconPlus :size="14" />
        Add Skill
      </button>
    </div>

    <div
      v-if="sortedLearnings.length === 0"
      class="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center"
    >
      <IconBook :size="32" class="mx-auto mb-2 text-slate-300" />
      <p class="text-xs text-slate-400 font-medium">No skills configured yet</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="(learning, index) in sortedLearnings"
        :key="index"
        class="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
      >
        <div class="flex items-center gap-3 flex-1">
          <div class="flex items-center gap-2">
            <label class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lv</label>
            <input
              :value="learning.level"
              type="number"
              min="1"
              max="99"
              class="w-16 px-2 py-1 text-sm font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
              @input="
                (e) =>
                  updateLearning(index, 'level', parseInt((e.target as HTMLInputElement).value))
              "
            />
          </div>

          <div class="text-slate-300">→</div>

          <select
            :value="learning.skillId"
            class="flex-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            @change="
              (e) =>
                updateLearning(index, 'skillId', parseInt((e.target as HTMLSelectElement).value))
            "
          >
            <option v-for="skill in db.skills" :key="skill.id" :value="skill.id">
              {{ skill.name }}
            </option>
          </select>
        </div>

        <button
          class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
          @click="removeLearning(index)"
        >
          <IconTrash :size="16" />
        </button>
      </div>
    </div>

    <!-- Add Learning Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showAddModal = false"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-slate-900">Add Skill Learning</h3>
          <button
            class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            @click="showAddModal = false"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Level</label>
            <input
              v-model.number="newLearning.level"
              type="number"
              min="1"
              max="99"
              class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            />
          </div>

          <div class="space-y-2">
            <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Skill</label>
            <select
              v-model.number="newLearning.skillId"
              class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            >
              <option v-for="skill in db.skills" :key="skill.id" :value="skill.id">
                {{ skill.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex gap-3 justify-end pt-4 border-t border-slate-100">
          <button
            class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            @click="showAddModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            @click="addLearning"
          >
            Add Skill
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
