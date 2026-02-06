<script setup lang="ts">
import { ref, computed } from 'vue'
import { ZTrait, ZTraitCode } from '@engine/types'
import {
  IconPlus,
  IconTrash,
  IconFlame,
  IconShield,
  IconSword,
  IconBook,
  IconSettings
} from '@tabler/icons-vue'

interface Props {
  modelValue?: ZTrait[]
}

interface Emits {
  (e: 'update:modelValue', value: ZTrait[]): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})
const emit = defineEmits<Emits>()

const showAddModal = ref(false)
const selectedCategory = ref<'rates' | 'params' | 'attack' | 'skills' | 'equip' | 'other'>('rates')
const newTrait = ref<ZTrait>({
  code: ZTraitCode.ElementRate,
  dataId: 1,
  value: 100
})

const traitCategories = [
  { id: 'rates', name: 'Rates', icon: IconShield },
  { id: 'params', name: 'Parameters', icon: IconSettings },
  { id: 'attack', name: 'Attack', icon: IconSword },
  { id: 'skills', name: 'Skills', icon: IconBook },
  { id: 'equip', name: 'Equipment', icon: IconSettings },
  { id: 'other', name: 'Other', icon: IconSettings }
]

const traitTypesByCategory = computed(() => ({
  rates: [
    { code: ZTraitCode.ElementRate, name: 'Element Rate' },
    { code: ZTraitCode.DebuffRate, name: 'Debuff Rate' },
    { code: ZTraitCode.StateRate, name: 'State Rate' },
    { code: ZTraitCode.StateResist, name: 'State Resist' }
  ],
  params: [
    { code: ZTraitCode.Param, name: 'Parameter' },
    { code: ZTraitCode.XParam, name: 'Ex-Parameter' },
    { code: ZTraitCode.SParam, name: 'Sp-Parameter' }
  ],
  attack: [
    { code: ZTraitCode.AttackElement, name: 'Attack Element' },
    { code: ZTraitCode.AttackState, name: 'Attack State' },
    { code: ZTraitCode.AttackSpeed, name: 'Attack Speed' },
    { code: ZTraitCode.AttackTimes, name: 'Attack Times +' }
  ],
  skills: [
    { code: ZTraitCode.AddSkillType, name: 'Add Skill Type' },
    { code: ZTraitCode.SealSkillType, name: 'Seal Skill Type' },
    { code: ZTraitCode.AddSkill, name: 'Add Skill' },
    { code: ZTraitCode.SealSkill, name: 'Seal Skill' }
  ],
  equip: [
    { code: ZTraitCode.EquipWeapon, name: 'Equip Weapon' },
    { code: ZTraitCode.EquipArmor, name: 'Equip Armor' },
    { code: ZTraitCode.LockEquip, name: 'Lock Equip' },
    { code: ZTraitCode.SealEquip, name: 'Seal Equip' },
    { code: ZTraitCode.SlotType, name: 'Slot Type' }
  ],
  other: [
    { code: ZTraitCode.ActionTimes, name: 'Action Times +' },
    { code: ZTraitCode.SpecialFlag, name: 'Special Flag' },
    { code: ZTraitCode.CollapseEffect, name: 'Collapse Effect' },
    { code: ZTraitCode.PartyAbility, name: 'Party Ability' }
  ]
}))

const elementNames = [
  'Physical',
  'Fire',
  'Ice',
  'Thunder',
  'Water',
  'Earth',
  'Wind',
  'Light',
  'Dark'
]
const paramNames = ['MHP', 'MMP', 'ATK', 'DEF', 'MAT', 'MDF', 'AGI', 'LUK']

const getTraitDescription = (trait: ZTrait): string => {
  const traitType = Object.values(traitTypesByCategory.value)
    .flat()
    .find((t) => t.code === trait.code)

  if (!traitType) return 'Unknown Trait'

  let dataName = `#${trait.dataId}`
  let valueSuffix = ''

  switch (trait.code) {
    case ZTraitCode.ElementRate:
    case ZTraitCode.DebuffRate:
    case ZTraitCode.StateRate:
      dataName = elementNames[trait.dataId] || dataName
      valueSuffix = `${trait.value}%`
      break
    case ZTraitCode.Param:
      dataName = paramNames[trait.dataId] || dataName
      valueSuffix = `${trait.value > 0 ? '+' : ''}${trait.value}%`
      break
    case ZTraitCode.AttackElement:
      dataName = elementNames[trait.dataId] || dataName
      break
    case ZTraitCode.AttackSpeed:
    case ZTraitCode.AttackTimes:
      valueSuffix = `${trait.value > 0 ? '+' : ''}${trait.value}`
      break
    default:
      valueSuffix = trait.value.toString()
  }

  return `${traitType.name}: ${dataName} ${valueSuffix}`.trim()
}

const addTrait = (): void => {
  const traits = [...(props.modelValue || []), { ...newTrait.value }]
  emit('update:modelValue', traits)
  showAddModal.value = false
  resetNewTrait()
}

const removeTrait = (index: number): void => {
  const traits = (props.modelValue || []).filter((_, i) => i !== index)
  emit('update:modelValue', traits)
}

const resetNewTrait = (): void => {
  newTrait.value = {
    code: ZTraitCode.ElementRate,
    dataId: 1,
    value: 100
  }
  selectedCategory.value = 'rates'
}

const openAddModal = (): void => {
  resetNewTrait()
  showAddModal.value = true
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">
        Traits & Resistances
      </h3>
      <button
        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
        @click="openAddModal"
      >
        <IconPlus :size="14" />
        Add Trait
      </button>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center"
    >
      <IconFlame :size="32" class="mx-auto mb-2 text-slate-300" />
      <p class="text-xs text-slate-400 font-medium">No traits configured yet</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="(trait, index) in modelValue"
        :key="index"
        class="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
      >
        <span class="text-sm font-medium text-slate-700">{{ getTraitDescription(trait) }}</span>
        <button
          class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
          @click="removeTrait(index)"
        >
          <IconTrash :size="16" />
        </button>
      </div>
    </div>

    <!-- Add Trait Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showAddModal = false"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-black text-slate-900">Add New Trait</h3>
          <button
            class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            @click="showAddModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Category Selection -->
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="category in traitCategories"
            :key="category.id"
            class="p-3 rounded-lg border-2 transition-all text-left"
            :class="
              selectedCategory === category.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 hover:border-slate-300 text-slate-600'
            "
            @click="selectedCategory = category.id as any"
          >
            <component :is="category.icon" :size="20" class="mb-1" />
            <div class="text-xs font-bold">{{ category.name }}</div>
          </button>
        </div>

        <!-- Trait Type Selection -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >Trait Type</label
          >
          <select
            v-model="newTrait.code"
            class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          >
            <option
              v-for="type in traitTypesByCategory[selectedCategory]"
              :key="type.code"
              :value="type.code"
            >
              {{ type.name }}
            </option>
          </select>
        </div>

        <!-- Data ID -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >Target / ID</label
          >
          <input
            v-model.number="newTrait.dataId"
            type="number"
            min="0"
            class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          />
        </div>

        <!-- Value -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Value</label>
          <input
            v-model.number="newTrait.value"
            type="number"
            class="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-lg px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
          />
        </div>

        <!-- Actions -->
        <div class="flex gap-3 justify-end pt-4 border-t border-slate-100">
          <button
            class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            @click="showAddModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            @click="addTrait"
          >
            Add Trait
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
