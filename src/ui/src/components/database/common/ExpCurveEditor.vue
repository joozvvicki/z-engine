<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ZClass } from '@engine/types'
import { IconX } from '@tabler/icons-vue'

interface Props {
  modelValue: ZClass
}

interface Emits {
  (e: 'update:modelValue', value: ZClass): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const curveNames = ['Standard', 'Fast', 'Slow', 'Very Fast', 'Very Slow', 'Custom']
const selectedCurve = ref(props.modelValue.expCurve || 0)

// Custom curve parameters
const customParams = ref({
  base: props.modelValue.expParams?.base || 30,
  extra: props.modelValue.expParams?.extra || 20,
  acceleration: props.modelValue.expParams?.acceleration || 30
})

// Preset parameters for calculation
const presetParams = [
  { base: 30, extra: 20, acceleration: 30 }, // Standard
  { base: 25, extra: 15, acceleration: 25 }, // Fast
  { base: 35, extra: 25, acceleration: 35 }, // Slow
  { base: 20, extra: 10, acceleration: 20 }, // Very Fast
  { base: 40, extra: 30, acceleration: 40 } // Very Slow
]

const currentParams = computed(() => {
  if (selectedCurve.value === 5) {
    return customParams.value
  }
  return presetParams[selectedCurve.value] || presetParams[0]
})

// Calculate EXP for a given level
const calculateExpForLevel = (level: number): number => {
  const { base, extra, acceleration } = currentParams.value
  return Math.floor(base * Math.pow(level - 1, 0.9 + acceleration / 250) * (level + extra))
}

// Generate EXP table
const expTable = computed(() => {
  const table: { level: number; exp: number; cumulative: number }[] = []
  let cumulative = 0

  for (let level = 1; level <= 99; level++) {
    const exp = level === 1 ? 0 : calculateExpForLevel(level)
    cumulative += exp
    table.push({ level, exp, cumulative })
  }

  return table
})

const totalExpToMax = computed(() => {
  return expTable.value[expTable.value.length - 1]?.cumulative || 0
})

// SVG path for curve visualization
const curvePath = computed(() => {
  const points: string[] = []
  const width = 192
  const height = 128
  const maxLevel = 99
  const maxExp = expTable.value[maxLevel - 1]?.cumulative || 1

  for (let level = 1; level <= maxLevel; level += 2) {
    const x = (level / maxLevel) * width
    const exp = expTable.value[level - 1]?.cumulative || 0
    const y = height - (exp / maxExp) * height
    points.push(`${x},${y}`)
  }

  return `M0,${height} L${points.join(' L')}`
})

const selectCurve = (index: number): void => {
  selectedCurve.value = index
  updateClass()
}

const updateClass = (): void => {
  const updated = {
    ...props.modelValue,
    expCurve: selectedCurve.value,
    expParams: selectedCurve.value === 5 ? { ...customParams.value } : undefined
  }
  emit('update:modelValue', updated)
}

watch(
  customParams,
  () => {
    if (selectedCurve.value === 5) {
      updateClass()
    }
  },
  { deep: true }
)
</script>

<template>
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
    >
      <!-- Compact Header -->
      <div
        class="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50"
      >
        <h3 class="text-base font-black text-slate-900">EXP Curve</h3>
        <button
          class="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          @click="emit('close')"
        >
          <IconX :size="18" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <!-- Grid Layout: Left = Settings, Right = Preview + Table -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Left Column: Curve Selection + Parameters -->
          <div class="space-y-4">
            <!-- Curve Selection - Compact -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Type</h4>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="(name, index) in curveNames"
                  :key="index"
                  class="px-2 py-1.5 rounded-lg border transition-all text-xs font-bold"
                  :class="
                    selectedCurve === index
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  "
                  @click="selectCurve(index)"
                >
                  {{ name }}
                </button>
              </div>
            </div>

            <!-- Custom Parameters - Compact -->
            <div
              v-if="selectedCurve === 5"
              class="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Parameters</h4>

              <div class="space-y-2">
                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Base</label>
                    <span class="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded">{{
                      customParams.base
                    }}</span>
                  </div>
                  <input
                    v-model.number="customParams.base"
                    type="range"
                    min="10"
                    max="50"
                    step="1"
                    class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Extra</label>
                    <span class="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded">{{
                      customParams.extra
                    }}</span>
                  </div>
                  <input
                    v-model.number="customParams.extra"
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div class="flex justify-between items-center mb-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Accel</label>
                    <span class="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded">{{
                      customParams.acceleration
                    }}</span>
                  </div>
                  <input
                    v-model.number="customParams.acceleration"
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>

            <!-- Quick Stats -->
            <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div class="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">
                Total to Lv99
              </div>
              <div class="text-lg font-black text-blue-900">
                {{ totalExpToMax.toLocaleString() }}
              </div>
            </div>
          </div>

          <!-- Right Column: Preview + Table -->
          <div class="space-y-4">
            <!-- Curve Preview - Compact -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Preview</h4>
              <div class="bg-slate-900 rounded-lg p-3 relative overflow-hidden">
                <svg class="w-full h-24" viewBox="0 0 192 128" preserveAspectRatio="none">
                  <path :d="`${curvePath} L192,128 L0,128 Z`" fill="rgb(59 130 246 / 0.2)" />
                  <path :d="curvePath" fill="none" stroke="rgb(96 165 250)" stroke-width="2" />
                </svg>
              </div>
            </div>

            <!-- EXP Table - Compact -->
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wide">Requirements</h4>
              <div class="bg-slate-50 rounded-lg border border-slate-200 max-h-64 overflow-y-auto">
                <table class="w-full text-[10px]">
                  <thead class="sticky top-0 bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th class="text-left px-2 py-1 font-bold text-slate-600">Lv</th>
                      <th class="text-right px-2 py-1 font-bold text-slate-600">To Next</th>
                      <th class="text-right px-2 py-1 font-bold text-slate-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in expTable.slice(0, 99)"
                      :key="row.level"
                      class="border-b border-slate-100 hover:bg-white transition-colors"
                    >
                      <td class="px-2 py-1 font-bold text-slate-700">{{ row.level }}</td>
                      <td class="px-2 py-1 text-right text-slate-600">
                        {{ row.exp.toLocaleString() }}
                      </td>
                      <td class="px-2 py-1 text-right text-slate-600">
                        {{ row.cumulative.toLocaleString() }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Compact Footer -->
      <div class="flex justify-end px-4 py-2 border-t border-slate-200 bg-slate-50">
        <button
          class="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          @click="emit('close')"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>
