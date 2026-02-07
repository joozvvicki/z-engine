<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown, IconPhoto } from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 231 (Show), 232 (Move), 235 (Erase)
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const pictureId = ref(1)
const filename = ref('')
const origin = ref(0) // 0: Top-Left, 1: Center
const x = ref(0)
const y = ref(0)
const scaleX = ref(100)
const scaleY = ref(100)
const opacity = ref(255)
const blendMode = ref(0) // 0: Normal, 1: Add, 2: Multiply, 3: Screen
const duration = ref(60)
const wait = ref(true)

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    pictureId.value = Number(params[0] ?? 1)

    if (props.type === ZCommandCode.ShowPicture || props.type === ZCommandCode.MovePicture) {
      if (props.type === ZCommandCode.ShowPicture) {
        filename.value = String(params[1] ?? '')
      }

      const paramOffset = props.type === ZCommandCode.ShowPicture ? 0 : -1

      origin.value = Number(params[2 + paramOffset] ?? 0)
      x.value = Number(params[4 + paramOffset] ?? 0)
      y.value = Number(params[5 + paramOffset] ?? 0)
      scaleX.value = Number(params[6 + paramOffset] ?? 100)
      scaleY.value = Number(params[7 + paramOffset] ?? 100)
      opacity.value = Number(params[8 + paramOffset] ?? 255)
      blendMode.value = Number(params[9 + paramOffset] ?? 0)

      if (props.type === ZCommandCode.MovePicture) {
        duration.value = Number(params[10] ?? 60)
        wait.value = params[11] !== false
      }
    }
  }
}

onMounted(initialize)

defineExpose({
  getCommandData: () => {
    let params: unknown[] = []

    if (props.type === ZCommandCode.ShowPicture) {
      params = [
        pictureId.value,
        filename.value,
        origin.value,
        0, // Constant designation
        x.value,
        y.value,
        scaleX.value,
        scaleY.value,
        opacity.value,
        blendMode.value
      ]
    } else if (props.type === ZCommandCode.MovePicture) {
      params = [
        pictureId.value,
        0, // Reserved?
        origin.value,
        0, // Constant designation
        x.value,
        y.value,
        scaleX.value,
        scaleY.value,
        opacity.value,
        blendMode.value,
        duration.value,
        wait.value
      ]
    } else if (props.type === ZCommandCode.ErasePicture) {
      params = [pictureId.value]
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
    <!-- Picture ID -->
    <div class="space-y-3">
      <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Picture ID</label>
      <input v-model.number="pictureId" type="number" min="1" max="100" class="docs-input" />
    </div>

    <template v-if="type === ZCommandCode.ShowPicture || type === ZCommandCode.MovePicture">
      <!-- File selection (Show only) -->
      <div v-if="type === ZCommandCode.ShowPicture" class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Image File</label>
        <div class="relative">
          <input
            v-model="filename"
            type="text"
            class="docs-input pl-10"
            placeholder="picture_name"
          />
          <IconPhoto size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <!-- Position & Origin -->
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Origin</label>
          <div class="segmented-control">
            <button :class="{ active: origin === 0 }" @click="origin = 0">Top-Left</button>
            <button :class="{ active: origin === 1 }" @click="origin = 1">Center</button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >X Position</label
          >
          <input v-model.number="x" type="number" class="docs-input" />
        </div>
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Y Position</label
          >
          <input v-model.number="y" type="number" class="docs-input" />
        </div>
      </div>

      <!-- Scaling & Opacity -->
      <div class="grid grid-cols-3 gap-3">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Scale X %</label>
          <input v-model.number="scaleX" type="number" class="docs-input" />
        </div>
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Scale Y %</label>
          <input v-model.number="scaleY" type="number" class="docs-input" />
        </div>
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Opacity</label>
          <input v-model.number="opacity" type="number" min="0" max="255" class="docs-input" />
        </div>
      </div>

      <!-- Blend Mode -->
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Blend Mode</label>
        <div class="relative">
          <select v-model="blendMode" class="docs-input appearance-none">
            <option :value="0">Normal</option>
            <option :value="1">Additive</option>
            <option :value="2">Multiply</option>
            <option :value="3">Screen</option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <!-- Duration (Move only) -->
      <div v-if="type === ZCommandCode.MovePicture" class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Duration (Frames)</label
        >
        <div class="flex items-center gap-4">
          <input v-model.number="duration" type="number" min="1" class="docs-input" />
          <div class="flex items-center gap-2 whitespace-nowrap">
            <input
              v-model="wait"
              type="checkbox"
              class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span
              class="text-[10px] font-bold uppercase text-slate-500 cursor-pointer select-none"
              @click="wait = !wait"
              >Wait</span
            >
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
</style>
