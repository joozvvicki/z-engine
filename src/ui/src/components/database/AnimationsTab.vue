<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IconPlus,
  IconSearch,
  IconMovie,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlayerTrackNext,
  IconClock
} from '@tabler/icons-vue'

const mockAnims = ref([
  { id: 1, name: 'Hit Physical', frames: 5, asset: 'Hit1' },
  { id: 2, name: 'Hit Special', frames: 8, asset: 'Hit2' },
  { id: 3, name: 'Fireball', frames: 12, asset: 'Fire1' },
  { id: 4, name: 'Ice Needle', frames: 10, asset: 'Ice1' },
  { id: 5, name: 'Heal One', frames: 15, asset: 'Light1' }
])

const selectedId = ref(1)
const searchQuery = ref('')
const isPlaying = ref(false)
const currentFrame = ref(1)

const filteredAnims = computed(() => {
  if (!searchQuery.value) return mockAnims.value
  return mockAnims.value.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const selectedAnim = computed(() => mockAnims.value.find((a) => a.id === selectedId.value))

const togglePlay = (): void => {
  isPlaying.value = !isPlaying.value
}
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">VFX Library</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-orange-500 hover:text-white text-slate-500 transition-all"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>
        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search FX..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="anim in filteredAnims"
          :key="anim.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === anim.id
              ? 'bg-white border-orange-200 shadow-md shadow-orange-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = anim.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100 text-orange-500"
          >
            <IconMovie :size="20" stroke-width="1.5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === anim.id ? 'text-orange-700' : 'text-slate-700'"
                >{{ anim.name }}</span
              >
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded"
                >ID:{{ anim.id }}</span
              >
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] text-slate-400 truncate"
                >{{ anim.frames }} frames &bull; {{ anim.asset }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedAnim" class="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div
        class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-lg font-black text-slate-900">{{ selectedAnim.name }}</h1>
          <div class="h-6 w-px bg-slate-200"></div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
              >Asset:</span
            >
            <select
              class="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none"
            >
              <option>{{ selectedAnim.asset }}</option>
              <option>Fire2</option>
              <option>Ice2</option>
            </select>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            Adjust Alignment
          </button>
          <button
            class="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-bold transition-colors"
          >
            SE & Flash
          </button>
        </div>
      </div>

      <div class="flex-1 relative bg-slate-900 overflow-hidden flex items-center justify-center">
        <div
          class="absolute inset-0 opacity-10 pointer-events-none"
          style="
            background-image:
              linear-gradient(#ffffff 1px, transparent 1px),
              linear-gradient(90deg, #ffffff 1px, transparent 1px);
            background-size: 32px 32px;
          "
        ></div>

        <div
          class="relative w-16 h-32 bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center"
        >
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Target</span>
        </div>

        <div
          class="absolute w-32 h-32 border border-orange-500/50 bg-orange-500/10 flex items-center justify-center rounded-full animate-pulse"
        >
          <IconMovie :size="32" class="text-orange-400 opacity-50" />
        </div>

        <div
          class="absolute bottom-6 flex items-center gap-2 bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-2xl"
        >
          <button
            class="p-2 text-white hover:text-orange-400 transition-colors"
            @click="togglePlay"
          >
            <component
              :is="isPlaying ? IconPlayerStop : IconPlayerPlay"
              :size="20"
              class="fill-current"
            />
          </button>
          <div class="h-6 w-px bg-white/20 mx-1"></div>
          <div class="text-xs font-mono font-bold text-white px-2">
            {{ String(currentFrame).padStart(2, '0') }} /
            {{ String(selectedAnim.frames).padStart(2, '0') }}
          </div>
          <button class="p-2 text-white/50 hover:text-white transition-colors">
            <IconPlayerTrackNext :size="16" />
          </button>
        </div>
      </div>

      <div class="h-48 bg-white border-t border-slate-200 flex flex-col shrink-0">
        <div
          class="h-8 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
        >
          <IconClock :size="12" /> Timeline
        </div>

        <div class="flex-1 overflow-x-auto overflow-y-hidden p-4">
          <div class="relative min-w-max space-y-2">
            <div class="flex gap-1 mb-2">
              <div
                v-for="i in 20"
                :key="i"
                class="w-8 text-center text-[9px] font-mono text-slate-300 select-none"
              >
                {{ i }}
              </div>
            </div>

            <div class="flex gap-1">
              <div
                v-for="i in selectedAnim.frames"
                :key="i"
                class="w-8 h-6 bg-orange-100 border border-orange-200 rounded cursor-pointer hover:bg-orange-200"
                :class="
                  currentFrame === i
                    ? 'bg-orange-500 border-orange-600 shadow-md ring-2 ring-orange-200'
                    : ''
                "
                @click="currentFrame = i"
              ></div>
            </div>

            <div class="flex gap-1">
              <div
                v-for="i in selectedAnim.frames"
                :key="i"
                class="w-8 h-6 bg-slate-50 border border-slate-100 rounded opacity-50"
              ></div>
              <div
                class="absolute left-16 top-0 w-8 h-6 bg-blue-100 border border-blue-200 rounded flex items-center justify-center text-[8px] text-blue-600 font-bold"
              >
                SE
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
