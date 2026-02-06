<script setup lang="ts">
import { ref } from 'vue'
import { ZSkillEffect } from '@engine/types'
import {
  IconPlus,
  IconTrash,
  IconFlame,
  IconHeart,
  IconShield,
  IconSparkles
} from '@tabler/icons-vue'

interface Props {
  modelValue?: ZSkillEffect[]
}

interface Emits {
  (e: 'update:modelValue', value: ZSkillEffect[]): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})
const emit = defineEmits<Emits>()

const effectTypes = [
  { code: 11, name: 'HP Damage', icon: IconFlame, color: 'red' },
  { code: 12, name: 'MP Damage', icon: IconFlame, color: 'purple' },
  { code: 13, name: 'HP Recover', icon: IconHeart, color: 'green' },
  { code: 14, name: 'MP Recover', icon: IconHeart, color: 'blue' },
  { code: 21, name: 'Add State', icon: IconSparkles, color: 'orange' },
  { code: 22, name: 'Remove State', icon: IconShield, color: 'cyan' },
  { code: 31, name: 'Add Buff', icon: IconSparkles, color: 'emerald' },
  { code: 32, name: 'Add Debuff', icon: IconSparkles, color: 'rose' }
]

const showAddMenu = ref(false)

const getEffectType = (
  code: number
): { code: number; name: string; icon: unknown; color: string } => {
  return effectTypes.find((t) => t.code === code) || effectTypes[0]
}

const addEffect = (code: number): void => {
  const newEffect: ZSkillEffect = {
    code,
    dataId: 0,
    value1: 0,
    value2: 0
  }
  emit('update:modelValue', [...props.modelValue, newEffect])
  showAddMenu.value = false
}

const removeEffect = (index: number): void => {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

const updateEffect = (index: number, field: keyof ZSkillEffect, value: number): void => {
  const updated = [...props.modelValue]
  updated[index] = { ...updated[index], [field]: value }
  emit('update:modelValue', updated)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Effects List -->
    <div v-if="modelValue.length > 0" class="space-y-2">
      <div
        v-for="(effect, index) in modelValue"
        :key="index"
        class="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
      >
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            :class="`bg-${getEffectType(effect.code).color}-50 text-${getEffectType(effect.code).color}-600`"
          >
            <component :is="getEffectType(effect.code).icon" :size="16" />
          </div>

          <!-- Effect Details -->
          <div class="flex-1 space-y-2">
            <!-- Type -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">{{
                getEffectType(effect.code).name
              }}</span>
              <button
                class="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                @click="removeEffect(index)"
              >
                <IconTrash :size="14" />
              </button>
            </div>

            <!-- Parameters Grid -->
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1"
                  >Data ID</label
                >
                <input
                  :value="effect.dataId"
                  type="number"
                  min="0"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-cyan-400 outline-none"
                  @input="
                    updateEffect(index, 'dataId', Number(($event.target as HTMLInputElement).value))
                  "
                />
              </div>
              <div>
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1"
                  >Value 1</label
                >
                <input
                  :value="effect.value1"
                  type="number"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-cyan-400 outline-none"
                  @input="
                    updateEffect(index, 'value1', Number(($event.target as HTMLInputElement).value))
                  "
                />
              </div>
              <div>
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1"
                  >Value 2</label
                >
                <input
                  :value="effect.value2"
                  type="number"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-cyan-400 outline-none"
                  @input="
                    updateEffect(index, 'value2', Number(($event.target as HTMLInputElement).value))
                  "
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Effect Button -->
    <div class="relative">
      <button
        class="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-cyan-300 hover:bg-cyan-50/30 transition-all flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-cyan-700"
        @click="showAddMenu = !showAddMenu"
      >
        <IconPlus :size="16" />
        Add Effect
      </button>

      <!-- Add Menu Dropdown -->
      <div
        v-if="showAddMenu"
        class="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden"
      >
        <button
          v-for="type in effectTypes"
          :key="type.code"
          class="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          @click="addEffect(type.code)"
        >
          <div
            class="w-6 h-6 rounded flex items-center justify-center"
            :class="`bg-${type.color}-50 text-${type.color}-600`"
          >
            <component :is="type.icon" :size="14" />
          </div>
          <span class="text-xs font-bold text-slate-700">{{ type.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
