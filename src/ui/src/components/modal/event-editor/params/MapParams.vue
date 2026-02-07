<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown } from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 204 (Scroll Map), 202 (Get Location)
  variables: string[]
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const direction = ref(2) // 2: Down, 4: Left, 6: Right, 8: Up
const distance = ref(1)
const speed = ref(4)

// Get Location Info state
const locationVarId = ref('1')
const infoType = ref(0) // 0: Terrain Tag, 1: Event ID, 2: Tile ID (Layer 1), 3: Tile ID (Layer 2), 4: Tile ID (Layer 3), 5: Region ID
const coordType = ref(0) // 0: Constant, 1: Variable
const x = ref(0)
const y = ref(0)
const varX = ref('1')
const varY = ref('1')

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    if (props.type === ZCommandCode.ScrollMap) {
      direction.value = Number(params[0] ?? 2)
      distance.value = Number(params[1] ?? 1)
      speed.value = Number(params[2] ?? 4)
    } else if (props.type === ZCommandCode.GetLocationInfo) {
      locationVarId.value = String(params[0] || '1')
      infoType.value = Number(params[1] || 0)
      coordType.value = Number(params[2] || 0)
      if (coordType.value === 0) {
        x.value = Number(params[3] || 0)
        y.value = Number(params[4] || 0)
      } else {
        varX.value = String(params[3] || '1')
        varY.value = String(params[4] || '1')
      }
    }
  }
}

onMounted(initialize)

defineExpose({
  getCommandData: () => {
    let params: unknown[] = []
    if (props.type === ZCommandCode.ScrollMap) {
      params = [direction.value, distance.value, speed.value]
    } else {
      params = [
        locationVarId.value,
        infoType.value,
        coordType.value,
        coordType.value === 0 ? x.value : varX.value,
        coordType.value === 0 ? y.value : varY.value
      ]
    }
    return {
      code: props.type,
      parameters: params
    }
  }
})

const directionsList = [
  { val: 2, label: 'Down' },
  { val: 4, label: 'Left' },
  { val: 6, label: 'Right' },
  { val: 8, label: 'Up' }
]

const speedsList = [
  { val: 1, label: '1: Slowest' },
  { val: 2, label: '2: Slower' },
  { val: 3, label: '3: Slow' },
  { val: 4, label: '4: Normal' },
  { val: 5, label: '5: Fast' },
  { val: 6, label: '6: Fastest' }
]

const infoTypes = [
  { val: 0, label: 'Terrain Tag' },
  { val: 1, label: 'Event ID' },
  { val: 2, label: 'Tile ID (Layer 1)' },
  { val: 3, label: 'Tile ID (Layer 2)' },
  { val: 4, label: 'Tile ID (Layer 3)' },
  { val: 5, label: 'Region ID' }
]
</script>

<template>
  <div class="space-y-6">
    <template v-if="type === ZCommandCode.ScrollMap">
      <!-- ... (existing ScrollMap code) ... -->
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Direction</label>
        <div class="relative">
          <select v-model="direction" class="docs-input appearance-none">
            <option v-for="d in directionsList" :key="d.val" :value="d.val">{{ d.label }}</option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Distance (Tiles)</label
        >
        <input v-model.number="distance" type="number" min="1" class="docs-input" />
      </div>

      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Scroll Speed</label
        >
        <div class="relative">
          <select v-model="speed" class="docs-input appearance-none">
            <option v-for="s in speedsList" :key="s.val" :value="s.val">{{ s.label }}</option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>
    </template>

    <template v-else-if="type === ZCommandCode.GetLocationInfo">
      <div class="space-y-4">
        <!-- Target Variable -->
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Save info to</label
          >
          <div class="relative">
            <select v-model="locationVarId" class="docs-input appearance-none pl-10">
              <option v-for="(_, i) in variables" :key="i" :value="String(i + 1)">
                Variable #{{ String(i + 1).padStart(4, '0') }}: {{ variables[i] || '(None)' }}
              </option>
            </select>
            <div
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-100 rounded flex items-center justify-center text-[10px] font-black text-slate-400"
            >
              #
            </div>
            <IconArrowDown
              size="14"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        <!-- Info Type -->
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Information Type</label
          >
          <div class="relative">
            <select v-model="infoType" class="docs-input appearance-none">
              <option v-for="t in infoTypes" :key="t.val" :value="t.val">{{ t.label }}</option>
            </select>
            <IconArrowDown
              size="14"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        <!-- Coordinates -->
        <div class="pt-4 border-t border-slate-100 space-y-4">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Location</label>
          <div class="segmented-control">
            <button :class="{ active: coordType === 0 }" @click="coordType = 0">Constant</button>
            <button :class="{ active: coordType === 1 }" @click="coordType = 1">Variable</button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <template v-if="coordType === 0">
              <div class="space-y-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase ml-1">X</span>
                <input v-model.number="x" type="number" class="docs-input" />
              </div>
              <div class="space-y-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase ml-1">Y</span>
                <input v-model.number="y" type="number" class="docs-input" />
              </div>
            </template>
            <template v-else>
              <div class="space-y-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase ml-1">X Variable</span>
                <div class="relative">
                  <select v-model="varX" class="docs-input appearance-none">
                    <option v-for="(_, i) in variables" :key="i" :value="String(i + 1)">
                      #{{ String(i + 1).padStart(4, '0') }}
                    </option>
                  </select>
                  <IconArrowDown
                    size="14"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div class="space-y-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase ml-1">Y Variable</span>
                <div class="relative">
                  <select v-model="varY" class="docs-input appearance-none">
                    <option v-for="(_, i) in variables" :key="i" :value="String(i + 1)">
                      #{{ String(i + 1).padStart(4, '0') }}
                    </option>
                  </select>
                  <IconArrowDown
                    size="14"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300;
}
</style>
