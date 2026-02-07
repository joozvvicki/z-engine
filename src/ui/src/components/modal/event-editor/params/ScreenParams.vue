<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number
  initialCommand?: ZEventCommand | null
}>()

// Tint / Flash state
const red = ref(255)
const green = ref(255)
const blue = ref(255)
const gray = ref(0) // For Tint
const intensity = ref(255) // For Flash
const duration = ref(60)
const waitForCompletion = ref(true)

// Shake state
const shakePower = ref(5)
const shakeSpeed = ref(5)

// Weather state
const weatherType = ref('none')
const weatherPower = ref(5)

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    if (props.type === ZCommandCode.TintScreen || props.type === ZCommandCode.FlashScreen) {
      const color = (params[0] as number[]) || [255, 255, 255, 0]
      red.value = color[0]
      green.value = color[1]
      blue.value = color[2]
      if (props.type === ZCommandCode.TintScreen) gray.value = color[3]
      else intensity.value = color[3]

      duration.value = Number(params[1] || 60)
      waitForCompletion.value = params[2] !== 0
    } else if (props.type === ZCommandCode.ShakeScreen) {
      shakePower.value = Number(params[0] || 5)
      shakeSpeed.value = Number(params[1] || 5)
      duration.value = Number(params[2] || 60)
      waitForCompletion.value = params[3] !== 0
    } else if (props.type === ZCommandCode.SetWeather) {
      weatherType.value = String(params[0] || 'none')
      weatherPower.value = Number(params[1] || 5)
      duration.value = Number(params[2] || 60)
      waitForCompletion.value = params[3] !== 0
    }
  }
}

onMounted(initialize)

defineExpose({
  getCommandData: () => {
    let params: unknown[] = []
    if (props.type === ZCommandCode.TintScreen) {
      params = [
        [red.value, green.value, blue.value, gray.value],
        duration.value,
        waitForCompletion.value ? 1 : 0
      ]
    } else if (props.type === ZCommandCode.FlashScreen) {
      params = [
        [red.value, green.value, blue.value, intensity.value],
        duration.value,
        waitForCompletion.value ? 1 : 0
      ]
    } else if (props.type === ZCommandCode.ShakeScreen) {
      params = [shakePower.value, shakeSpeed.value, duration.value, waitForCompletion.value ? 1 : 0]
    } else if (props.type === ZCommandCode.SetWeather) {
      params = [
        weatherType.value,
        weatherPower.value,
        duration.value,
        waitForCompletion.value ? 1 : 0
      ]
    } else if (
      props.type === ZCommandCode.FadeInScreen ||
      props.type === ZCommandCode.FadeOutScreen
    ) {
      params = []
    }

    return {
      code: props.type,
      parameters: params
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Tint & Flash -->
    <template v-if="type === ZCommandCode.TintScreen || type === ZCommandCode.FlashScreen">
      <div class="space-y-4">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Color Settings</label
        >

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <div class="flex justify-between text-[10px] font-bold">
              <span class="text-red-500">RED</span>
              <span class="text-slate-400">{{ red }}</span>
            </div>
            <input
              v-model.number="red"
              type="range"
              min="0"
              max="255"
              class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-[10px] font-bold">
              <span class="text-green-500">GREEN</span>
              <span class="text-slate-400">{{ green }}</span>
            </div>
            <input
              v-model.number="green"
              type="range"
              min="0"
              max="255"
              class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-[10px] font-bold">
              <span class="text-blue-500">BLUE</span>
              <span class="text-slate-400">{{ blue }}</span>
            </div>
            <input
              v-model.number="blue"
              type="range"
              min="0"
              max="255"
              class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          <div v-if="type === ZCommandCode.TintScreen" class="space-y-2">
            <div class="flex justify-between text-[10px] font-bold">
              <span class="text-slate-500">GRAY</span>
              <span class="text-slate-400">{{ gray }}</span>
            </div>
            <input
              v-model.number="gray"
              type="range"
              min="0"
              max="255"
              class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-500"
            />
          </div>
          <div v-else class="space-y-2">
            <div class="flex justify-between text-[10px] font-bold">
              <span class="text-indigo-500">INTENSITY</span>
              <span class="text-slate-400">{{ intensity }}</span>
            </div>
            <input
              v-model.number="intensity"
              type="range"
              min="0"
              max="255"
              class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        <!-- Preview Circle -->
        <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div
            class="w-12 h-12 rounded-full border-4 border-white shadow-inner"
            :style="{
              backgroundColor: `rgb(${red}, ${green}, ${blue})`,
              filter: type === ZCommandCode.TintScreen ? `grayscale(${gray / 255})` : 'none',
              opacity: type === ZCommandCode.FlashScreen ? intensity / 255 : 1
            }"
          ></div>
          <div class="text-[10px] font-bold text-slate-400 uppercase">Color Preview</div>
        </div>
      </div>
    </template>

    <!-- Shake -->
    <template v-else-if="type === ZCommandCode.ShakeScreen">
      <div class="grid grid-cols-2 gap-6">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Power</label>
          <input v-model.number="shakePower" type="number" min="1" max="9" class="docs-input" />
        </div>
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Speed</label>
          <input v-model.number="shakeSpeed" type="number" min="1" max="9" class="docs-input" />
        </div>
      </div>
    </template>

    <!-- Weather -->
    <template v-else-if="type === ZCommandCode.SetWeather">
      <div class="space-y-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Weather Type</label
          >
          <div class="segmented-control">
            <button
              v-for="w in [
                { id: 'none', label: 'None' },
                { id: 'rain', label: 'Rain' },
                { id: 'storm', label: 'Storm' },
                { id: 'snow', label: 'Snow' }
              ]"
              :key="w.id"
              :class="{ active: weatherType === w.id }"
              @click="weatherType = w.id"
            >
              {{ w.label }}
            </button>
          </div>
        </div>
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Intensity / Power</label
          >
          <input
            v-model.number="weatherPower"
            type="range"
            min="1"
            max="9"
            class="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </template>

    <!-- Common: Duration & Wait -->
    <template v-if="![ZCommandCode.FadeInScreen, ZCommandCode.FadeOutScreen].includes(type)">
      <div class="pt-6 border-t border-slate-100 space-y-6">
        <div class="grid grid-cols-2 gap-6">
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
              >Duration (Frames)</label
            >
            <input v-model.number="duration" type="number" min="1" class="docs-input" />
          </div>
          <div class="flex items-end pb-3">
            <label class="flex items-center gap-2 cursor-pointer group">
              <input
                v-model="waitForCompletion"
                type="checkbox"
                class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span
                class="text-[10px] font-bold uppercase text-slate-500 group-hover:text-slate-700 transition-colors"
                >Wait for Completion</span
              >
            </label>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="py-10 text-center">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        No Parameters Required
      </p>
    </div>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10;
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
