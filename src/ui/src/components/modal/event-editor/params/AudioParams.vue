<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 241 (BGM), 250 (SE), 242 (FadeOut) etc.
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const audioFile = ref('')
const audioVolume = ref(90)
const audioPitch = ref(100)
const audioDuration = ref(1)

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    if (
      [ZCommandCode.PlayBGM, ZCommandCode.PlayBGS, ZCommandCode.PlaySE].includes(
        props.initialCommand.code
      )
    ) {
      const config = params[0] as { name: string; volume: number; pitch: number }
      audioFile.value = config.name
      audioVolume.value = config.volume
      audioPitch.value = config.pitch
    } else if (
      [ZCommandCode.FadeOutBGM, ZCommandCode.FadeOutBGS].includes(props.initialCommand.code)
    ) {
      audioDuration.value = Number(params[0] || 1)
    }
  }
}

onMounted(initialize)

// Expose data for parent
defineExpose({
  getCommandData: () => {
    let finalParams: unknown[] = []
    if ([ZCommandCode.PlayBGM, ZCommandCode.PlayBGS, ZCommandCode.PlaySE].includes(props.type)) {
      finalParams = [{ name: audioFile.value, volume: audioVolume.value, pitch: audioPitch.value }]
    } else if ([ZCommandCode.FadeOutBGM, ZCommandCode.FadeOutBGS].includes(props.type)) {
      finalParams = [audioDuration.value]
    } else if (props.type === ZCommandCode.StopSE) {
      finalParams = []
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
    <!-- Play BGM/BGS/SE -->
    <template
      v-if="
        [241, 245, 250].includes(type) // 241=BGM, 245=BGS, 250=SE
      "
    >
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">
          Audio File
        </label>
        <input v-model="audioFile" type="text" class="docs-input" placeholder="e.g. Theme1.mp3" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">
            Volume %
          </label>
          <input
            v-model.number="audioVolume"
            type="range"
            min="0"
            max="100"
            class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
          />
          <div class="text-right text-xs font-black">{{ audioVolume }}%</div>
        </div>
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"> Pitch % </label>
          <input
            v-model.number="audioPitch"
            type="range"
            min="50"
            max="150"
            class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
          />
          <div class="text-right text-xs font-black">{{ audioPitch }}%</div>
        </div>
      </div>
    </template>

    <!-- Fadeout BGM/BGS -->
    <template v-else-if="[242, 246].includes(type)">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">
          Duration (Seconds)
        </label>
        <input v-model.number="audioDuration" type="number" min="1" class="docs-input" />
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
