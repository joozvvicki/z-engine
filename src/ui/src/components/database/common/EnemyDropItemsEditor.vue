<script setup lang="ts">
import { ZEnemyDropItem } from '@engine/types'
import { useDatabaseStore } from '@ui/stores/database'
import { IconPlus, IconTrash, IconPackage, IconSword, IconShield } from '@tabler/icons-vue'

interface Props {
  modelValue?: ZEnemyDropItem[]
}

interface Emits {
  (e: 'update:modelValue', value: ZEnemyDropItem[]): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})
const emit = defineEmits<Emits>()

const db = useDatabaseStore()

const kindOptions = [
  { value: 1, label: 'Item', icon: IconPackage, color: 'amber' },
  { value: 2, label: 'Weapon', icon: IconSword, color: 'red' },
  { value: 3, label: 'Armor', icon: IconShield, color: 'blue' }
]

const getItemName = (itemId: number, kind: number): string => {
  if (kind === 1) {
    const item = db.items.find((i) => i.id === itemId)
    return item?.name || `Item #${itemId}`
  } else if (kind === 2) {
    const weapon = db.weapons.find((w) => w.id === itemId)
    return weapon?.name || `Weapon #${itemId}`
  } else if (kind === 3) {
    const armor = db.armors.find((a) => a.id === itemId)
    return armor?.name || `Armor #${itemId}`
  }
  return 'Unknown'
}

const getAvailableItems = (kind: number) => {
  if (kind === 1) return db.items
  if (kind === 2) return db.weapons
  if (kind === 3) return db.armors
  return []
}

const getKindOption = (kind: number) => {
  return kindOptions.find((k) => k.value === kind) || kindOptions[0]
}

const addDropItem = (): void => {
  const newDrop: ZEnemyDropItem = {
    itemId: db.items[0]?.id || 1,
    kind: 1,
    denominator: 10
  }
  emit('update:modelValue', [...props.modelValue, newDrop])
}

const removeDropItem = (index: number): void => {
  const updated = [...props.modelValue]
  updated.splice(index, 1)
  emit('update:modelValue', updated)
}

const updateDropItem = (index: number, field: keyof ZEnemyDropItem, value: number): void => {
  const updated = [...props.modelValue]
  updated[index] = { ...updated[index], [field]: value }

  // When kind changes, reset itemId to first available item
  if (field === 'kind') {
    const availableItems = getAvailableItems(value)
    if (availableItems.length > 0) {
      updated[index].itemId = availableItems[0].id
    }
  }

  emit('update:modelValue', updated)
}

const getDropRatePercent = (denominator: number): string => {
  return ((1 / denominator) * 100).toFixed(1)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Drop Items List -->
    <div v-if="modelValue.length > 0" class="space-y-2">
      <div
        v-for="(drop, index) in modelValue"
        :key="index"
        class="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
      >
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            :class="`bg-${getKindOption(drop.kind).color}-50 text-${getKindOption(drop.kind).color}-600`"
          >
            <component :is="getKindOption(drop.kind).icon" :size="16" />
          </div>

          <!-- Drop Details -->
          <div class="flex-1 space-y-2">
            <!-- Header -->
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700">{{
                getItemName(drop.itemId, drop.kind)
              }}</span>
              <button
                class="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                @click="removeDropItem(index)"
              >
                <IconTrash :size="14" />
              </button>
            </div>

            <!-- Selectors Grid -->
            <div class="grid grid-cols-3 gap-2">
              <!-- Kind -->
              <div>
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1">Type</label>
                <select
                  :value="drop.kind"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-purple-400 outline-none"
                  @change="
                    updateDropItem(
                      index,
                      'kind',
                      Number(($event.target as HTMLSelectElement).value)
                    )
                  "
                >
                  <option v-for="kind in kindOptions" :key="kind.value" :value="kind.value">
                    {{ kind.label }}
                  </option>
                </select>
              </div>

              <!-- Item -->
              <div>
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1">Item</label>
                <select
                  :value="drop.itemId"
                  class="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded text-slate-900 focus:border-purple-400 outline-none"
                  @change="
                    updateDropItem(
                      index,
                      'itemId',
                      Number(($event.target as HTMLSelectElement).value)
                    )
                  "
                >
                  <option
                    v-for="item in getAvailableItems(drop.kind)"
                    :key="item.id"
                    :value="item.id"
                  >
                    {{ item.name }}
                  </option>
                </select>
              </div>

              <!-- Drop Rate -->
              <div>
                <label class="text-[9px] font-bold text-slate-400 uppercase block mb-1"
                  >Rate ({{ getDropRatePercent(drop.denominator) }}%)</label
                >
                <input
                  :value="drop.denominator"
                  type="range"
                  min="1"
                  max="100"
                  class="drop-rate-slider w-full"
                  @input="
                    updateDropItem(
                      index,
                      'denominator',
                      Number(($event.target as HTMLInputElement).value)
                    )
                  "
                />
                <div class="text-[9px] text-slate-400 text-center mt-0.5">
                  1/{{ drop.denominator }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Drop Item Button -->
    <button
      class="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/30 transition-all flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-purple-700"
      @click="addDropItem"
    >
      <IconPlus :size="16" />
      Add Drop Item
    </button>
  </div>
</template>

<style scoped>
.drop-rate-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #a855f7 0%, #7c3aed 100%);
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.drop-rate-slider:hover {
  opacity: 1;
}

.drop-rate-slider::-webkit-slider-thumb {
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

.drop-rate-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(124, 58, 237, 0.3);
}

.drop-rate-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 3px solid #7c3aed;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.drop-rate-slider::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(124, 58, 237, 0.3);
}
</style>
