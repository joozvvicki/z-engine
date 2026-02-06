<script setup lang="ts">
defineProps<{
  type: number // 241 (BGM), 250 (SE), 242 (FadeOut) etc.
}>()

const audioFile = defineModel<string>('audioFile')
const audioVolume = defineModel<number>('audioVolume')
const audioPitch = defineModel<number>('audioPitch')
const audioDuration = defineModel<number>('audioDuration')
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
