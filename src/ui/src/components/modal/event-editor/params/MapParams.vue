<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown } from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand, type ZEvent } from '@engine/types'
import { directionsList, speedsList, infoTypes } from './config'

const props = defineProps<{
  type: number // 204 (Scroll Map) or 202 (Get Location Info) or 203 (Set Event Location)
  variables: string[]
  events: ZEvent[]
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const direction = ref(2) // 2: Down, 4: Left, 6: Right, 8: Up
const distance = ref(1)
const speed = ref(4)

// Get Location Info state
const locationVarId = ref('1')
const getLocInfoType = ref(0)
const coordType = ref(0) // 0: Constant, 1: Variable
const x = ref(0)
const y = ref(0)
const varX = ref('1')
const varY = ref('1')

// Set Event Location state
const setLocEventId = ref(0) // 0: This Event, >0: Event ID
const setLocType = ref(0) // 0: Constant, 1: Variable, 2: Exchange
const setLocX = ref(0)
const setLocY = ref(0)
const setLocVarX = ref('1')
const setLocVarY = ref('1')
const setLocTargetEventId = ref('1')
const setLocDirection = ref(2)

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    if (props.type === ZCommandCode.ScrollMap) {
      direction.value = Number(params[0] ?? 2)
      distance.value = Number(params[1] ?? 1)
      speed.value = Number(params[2] ?? 4)
    } else if (props.type === ZCommandCode.GetLocationInfo) {
      locationVarId.value = String(params[0] || '1')
      getLocInfoType.value = Number(params[1] || 0)
      coordType.value = Number(params[2] || 0)
      if (coordType.value === 0) {
        x.value = Number(params[3] || 0)
        y.value = Number(params[4] || 0)
      } else {
        varX.value = String(params[3] || '1')
        varY.value = String(params[4] || '1')
      }
    } else if (props.type === ZCommandCode.SetEventLocation) {
      setLocEventId.value = Number(params[0] ?? 0)
      setLocType.value = Number(params[1] ?? 0)
      if (setLocType.value === 0) {
        setLocX.value = Number(params[2] || 0)
        setLocY.value = Number(params[3] || 0)
      } else if (setLocType.value === 1) {
        setLocVarX.value = String(params[2] || '1')
        setLocVarY.value = String(params[3] || '1')
      } else {
        setLocTargetEventId.value = String(params[2] || '1')
      }
      setLocDirection.value = Number(params[4] || 2)
    }
  }
}

onMounted(initialize)

// Expose data for parent
defineExpose({
  getCommandData: () => {
    let finalParams: unknown[] = []
    if (props.type === ZCommandCode.ScrollMap) {
      finalParams = [direction.value, distance.value, speed.value]
    } else if (props.type === ZCommandCode.GetLocationInfo) {
      finalParams = [
        locationVarId.value,
        getLocInfoType.value,
        coordType.value,
        coordType.value === 0 ? x.value : varX.value,
        coordType.value === 0 ? y.value : varY.value
      ]
    } else if (props.type === ZCommandCode.SetEventLocation) {
      const p2 =
        setLocType.value === 0
          ? setLocX.value
          : setLocType.value === 1
            ? setLocVarX.value
            : setLocTargetEventId.value
      const p3 =
        setLocType.value === 0 ? setLocY.value : setLocType.value === 1 ? setLocVarY.value : 0
      finalParams = [setLocEventId.value, setLocType.value, p2, p3, setLocDirection.value]
    }
    return {
      code: props.type,
      parameters: finalParams
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Scroll Map -->
    <template v-if="type === ZCommandCode.ScrollMap">
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

    <!-- Get Location Info -->
    <template v-else-if="type === ZCommandCode.GetLocationInfo">
      <div class="space-y-4">
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

        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Information Type</label
          >
          <div class="relative">
            <select v-model="getLocInfoType" class="docs-input appearance-none">
              <option v-for="t in infoTypes" :key="t.val" :value="t.val">{{ t.label }}</option>
            </select>
            <IconArrowDown
              size="14"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

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

    <!-- Set Event Location -->
    <template v-else-if="type === ZCommandCode.SetEventLocation">
      <div class="space-y-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Target Event</label
          >
          <div class="relative">
            <select v-model="setLocEventId" class="docs-input appearance-none">
              <option :value="0">This Event</option>
              <option
                v-for="e in events.filter((ev) => ev.name !== 'PlayerStart')"
                :key="e.id"
                :value="Number(e.id)"
              >
                ID {{ e.id }}: {{ e.name }}
              </option>
            </select>
            <IconArrowDown
              size="14"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        <div class="space-y-3 pt-4 border-t border-slate-100">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Appointment Type</label
          >
          <div class="segmented-control">
            <button :class="{ active: setLocType === 0 }" @click="setLocType = 0">Constant</button>
            <button :class="{ active: setLocType === 1 }" @click="setLocType = 1">Variable</button>
            <button :class="{ active: setLocType === 2 }" @click="setLocType = 2">Exchange</button>
          </div>
        </div>

        <div class="animate-in fade-in slide-in-from-top-1 duration-200">
          <!-- Constant Coordinates -->
          <div v-if="setLocType === 0" class="grid grid-cols-2 gap-4">
            <div class="space-y-3">
              <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                >X Coordinate</label
              >
              <input v-model.number="setLocX" type="number" class="docs-input" />
            </div>
            <div class="space-y-3">
              <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                >Y Coordinate</label
              >
              <input v-model.number="setLocY" type="number" class="docs-input" />
            </div>
          </div>

          <!-- Variable Coordinates -->
          <div v-else-if="setLocType === 1" class="grid grid-cols-2 gap-4">
            <div class="space-y-3">
              <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                >X From Variable</label
              >
              <div class="relative">
                <select v-model="setLocVarX" class="docs-input appearance-none">
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
            <div class="space-y-3">
              <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                >Y From Variable</label
              >
              <div class="relative">
                <select v-model="setLocVarY" class="docs-input appearance-none">
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
          </div>

          <!-- Exchange Position -->
          <div v-else-if="setLocType === 2" class="space-y-3">
            <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
              >Exchange With</label
            >
            <div class="relative">
              <select v-model="setLocTargetEventId" class="docs-input appearance-none">
                <option
                  v-for="e in events.filter((ev) => ev.name !== 'PlayerStart')"
                  :key="e.id"
                  :value="e.id"
                >
                  ID {{ e.id }}: {{ e.name }}
                </option>
              </select>
              <IconArrowDown
                size="14"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <div class="space-y-3 pt-4 border-t border-slate-100">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Direction After Move</label
          >
          <div class="relative">
            <select v-model="setLocDirection" class="docs-input appearance-none">
              <option :value="0">Retain</option>
              <option v-for="d in directionsList" :key="d.val" :value="d.val">{{ d.label }}</option>
            </select>
            <IconArrowDown
              size="14"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
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
.segmented-control {
  @apply flex p-1 bg-slate-100 rounded-xl gap-1;
}
.segmented-control button {
  @apply flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all border border-transparent flex items-center justify-center gap-2;
}
.segmented-control button.active {
  @apply bg-white text-slate-800 shadow-sm border-slate-200/50;
}
.segmented-control button:hover:not(.active) {
  @apply text-slate-600;
}
</style>
