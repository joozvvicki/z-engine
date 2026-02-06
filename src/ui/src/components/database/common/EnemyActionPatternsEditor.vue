<script setup lang="ts">
import { ZEnemyAction } from '@engine/types'
import { useDatabaseStore } from '@ui/stores/database'
import { IconPlus, IconTrash, IconBolt, IconClock, IconHeart, IconFlask } from '@tabler/icons-vue'

interface Props {
  modelValue?: ZEnemyAction[]
}

interface Emits {
  (e: 'update:modelValue', value: ZEnemyAction[]): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})
const emit = defineEmits<Emits>()

const db = useDatabaseStore()

const conditionTypes = [
  { value: 0, label: 'Always', icon: IconBolt, needsParams: false },
  {
    value: 1,
    label: 'Turn',
    icon: IconClock,
    needsParams: true,
    param1Label: 'Turn #',
    param2Label: 'Every X'
  },
  {
    value: 2,
    label: 'HP %',
    icon: IconHeart,
    needsParams: true,
    param1Label: 'Min %',
    param2Label: 'Max %'
  },
  {
    value: 3,
    label: 'MP %',
    icon: IconFlask,
    needsParams: true,
    param1Label: 'Min %',
    param2Label: 'Max %'
  },
  {
    value: 4,
    label: 'State',
    icon: IconFlask,
    needsParams: true,
    param1Label: 'State ID',
    param2Label: ''
  },
  {
    value: 5,
    label: 'Party Lvl',
    icon: IconBolt,
    needsParams: true,
    param1Label: 'Min Lvl',
    param2Label: ''
  },
  {
    value: 6,
    label: 'Switch',
    icon: IconBolt,
    needsParams: true,
    param1Label: 'Switch ID',
    param2Label: ''
  }
]

const getSkillName = (skillId: number): string => {
  const skill = db.skills.find((s) => s.id === skillId)
  return skill?.name || `Skill #${skillId}`
}

const getConditionType = (type: number) => {
  return conditionTypes.find((c) => c.value === type) || conditionTypes[0]
}

const addAction = (): void => {
  const newAction: ZEnemyAction = {
    skillId: db.skills[0]?.id || 1,
    conditionType: 0,
    conditionParam1: 0,
    conditionParam2: 0,
    rating: 5
  }
  emit('update:modelValue', [...props.modelValue, newAction])
}

const removeAction = (index: number): void => {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

const updateAction = (index: number, field: keyof ZEnemyAction, value: number): void => {
  const updated = [...props.modelValue]
  updated[index] = { ...updated[index], [field]: value }

  // Reset params when condition type changes
  if (field === 'conditionType') {
    updated[index].conditionParam1 = 0
    updated[index].conditionParam2 = 0
  }

  emit('update:modelValue', updated)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Actions List -->
    <div v-if="modelValue.length > 0" class="space-y-2">
      <div
        v-for="(action, index) in modelValue"
        :key="index"
        class="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
      >
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-purple-50 text-purple-600"
          >
            <component :is="getConditionType(action.conditionType).icon" :size="16" />
          </div>

          <!-- Action Details -->
          <div class="flex-1 space-y-2">
            <!-- Header -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">{{
                getSkillName(action.skillId)
              }}</span>
              <button
                class="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                @click="removeAction(index)"
              >
                <IconTrash :size="14" />
              </button>
            </div>

            <!-- Selectors Grid -->
            <div class="grid grid-cols-2 gap-2">
              <!-- Skill -->
              <div>
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1"
                  >Skill</label
                >
                <select
                  :value="action.skillId"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-purple-400 outline-none"
                  @change="
                    updateAction(
                      index,
                      'skillId',
                      Number(($event.target as HTMLSelectElement).value)
                    )
                  "
                >
                  <option v-for="skill in db.skills" :key="skill.id" :value="skill.id">
                    {{ skill.name }}
                  </option>
                </select>
              </div>

              <!-- Condition Type -->
              <div>
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1"
                  >Condition</label
                >
                <select
                  :value="action.conditionType"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-purple-400 outline-none"
                  @change="
                    updateAction(
                      index,
                      'conditionType',
                      Number(($event.target as HTMLSelectElement).value)
                    )
                  "
                >
                  <option v-for="cond in conditionTypes" :key="cond.value" :value="cond.value">
                    {{ cond.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Condition Parameters (if needed) -->
            <div
              v-if="getConditionType(action.conditionType).needsParams"
              class="grid grid-cols-2 gap-2"
            >
              <div v-if="getConditionType(action.conditionType).param1Label">
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1">{{
                  getConditionType(action.conditionType).param1Label
                }}</label>
                <input
                  :value="action.conditionParam1"
                  type="number"
                  min="0"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-purple-400 outline-none"
                  @input="
                    updateAction(
                      index,
                      'conditionParam1',
                      Number(($event.target as HTMLInputElement).value)
                    )
                  "
                />
              </div>
              <div v-if="getConditionType(action.conditionType).param2Label">
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1">{{
                  getConditionType(action.conditionType).param2Label
                }}</label>
                <input
                  :value="action.conditionParam2"
                  type="number"
                  min="0"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-purple-400 outline-none"
                  @input="
                    updateAction(
                      index,
                      'conditionParam2',
                      Number(($event.target as HTMLInputElement).value)
                    )
                  "
                />
              </div>
            </div>

            <!-- Rating Slider -->
            <div>
              <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1"
                >Priority: {{ action.rating }}</label
              >
              <input
                :value="action.rating"
                type="range"
                min="1"
                max="10"
                class="priority-slider w-full"
                @input="
                  updateAction(index, 'rating', Number(($event.target as HTMLInputElement).value))
                "
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Action Button -->
    <button
      class="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-purple-700"
      @click="addAction"
    >
      <IconPlus :size="16" />
      Add Action Pattern
    </button>
  </div>
</template>

<style scoped>
.priority-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #a855f7 0%, #7c3aed 100%);
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.priority-slider:hover {
  opacity: 1;
}

.priority-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 3px solid #7c3aed;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.priority-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(124, 58, 237, 0.3);
}

.priority-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 3px solid #7c3aed;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.priority-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(124, 58, 237, 0.3);
}
</style>
