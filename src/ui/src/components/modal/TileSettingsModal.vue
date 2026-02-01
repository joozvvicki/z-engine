<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import {
  IconDeviceFloppy,
  IconX,
  IconCircle,
  IconX as IconWall,
  IconStar,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight
} from '@tabler/icons-vue'

const props = defineProps<{
  tilesetUrl: string
  tileX: number
  tileY: number
  imageUrl: string
}>()

const emit = defineEmits(['close'])

const store = useEditorStore()
const GRID_SIZE = 48

const sortYOffset = ref(0)
const dirBlock = ref(0)
const isSolid = ref(false)
const isHighPriority = ref(false)

const initSettings = (): void => {
  const config = store.getTileConfig(props.tilesetUrl, props.tileX, props.tileY)
  if (config) {
    isSolid.value = !!config.isSolid
    isHighPriority.value = !!config.isHighPriority
    sortYOffset.value = config.sortYOffset || 0
    dirBlock.value = config.dirBlock || 0
  }
}

const toggleDir = (bit: number): void => {
  dirBlock.value ^= bit
}

const isDirBlocked = (bit: number): boolean => {
  return (dirBlock.value & bit) === bit
}

const setPassability = (type: 'open' | 'solid' | 'star'): void => {
  if (type === 'open') {
    isSolid.value = false
    isHighPriority.value = false
  } else if (type === 'solid') {
    isSolid.value = true
    isHighPriority.value = false
  } else if (type === 'star') {
    isSolid.value = false
    isHighPriority.value = true
  }
}

const save = (): void => {
  store.updateTileConfig(props.tilesetUrl, props.tileX, props.tileY, {
    isSolid: isSolid.value,
    isHighPriority: isHighPriority.value,
    sortYOffset: sortYOffset.value,
    dirBlock: dirBlock.value
  })
  emit('close')
}

initSettings()
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-all"
  >
    <div
      class="bg-white border border-black/5 rounded-3xl shadow-2xl overflow-hidden flex flex-col w-[460px] animate-in fade-in zoom-in duration-200"
    >
      <!-- Header -->
      <div class="p-6 border-b border-black/5 flex justify-between items-center bg-black/[0.02]">
        <div class="flex flex-col">
          <h3 class="text-sm font-black uppercase tracking-widest text-black">Tile Settings</h3>
          <span class="text-[10px] font-bold text-black/30 uppercase tracking-tighter"
            >Coord: {{ tileX }}, {{ tileY }}</span
          >
        </div>
        <button
          class="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
          @click="$emit('close')"
        >
          <IconX :size="18" />
        </button>
      </div>

      <div class="p-8 space-y-8">
        <!-- Visual Preview & Pivot -->
        <div class="flex gap-8 items-start">
          <div class="relative group">
            <div
              class="w-32 h-32 rounded-2xl overflow-hidden border-2 border-black/5 bg-slate-50 relative shadow-inner"
            >
              <div
                class="absolute inset-0 pixelated transition-transform duration-500 group-hover:scale-110"
                :style="{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundPosition: `-${tileX * 48}px -${tileY * 48}px`,
                  backgroundSize: '800%', // 48 * 8 = 384, but we want it to fill 128 (48*2.66)
                  imageRendering: 'pixelated'
                }"
              ></div>

              <!-- Pivot visualization -->
              <div
                class="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] z-20 pointer-events-none"
                :style="{ bottom: `${(GRID_SIZE / 2 + sortYOffset) * (128 / GRID_SIZE)}px` }"
              >
                <div
                  class="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-blue-500 uppercase"
                >
                  Sort Pivot
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 space-y-4">
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-black/40"
                >Z-Index Offset</label
              >
              <div class="flex items-center gap-3">
                <input
                  v-model.number="sortYOffset"
                  type="range"
                  min="-24"
                  max="24"
                  class="flex-1 accent-black h-1 bg-black/5 rounded-full appearance-none cursor-pointer"
                />
                <span class="text-xs font-black min-w-8 text-right tabular-nums">{{
                  sortYOffset
                }}</span>
              </div>
              <p class="text-[9px] font-bold text-black/30 leading-tight uppercase tracking-tight">
                Adjusts when objects appear in front of or behind the player.
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-8">
          <!-- Passability -->
          <div class="space-y-4">
            <label class="text-[10px] font-black uppercase tracking-widest text-black/40"
              >Passability</label
            >
            <div class="grid grid-cols-1 gap-2">
              <button
                class="flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer"
                :class="[
                  !isSolid && !isHighPriority
                    ? 'bg-black text-white border-black shadow-lg shadow-black/10'
                    : 'hover:bg-black/5 border-black/5 text-black/60'
                ]"
                @click="setPassability('open')"
              >
                <IconCircle :size="16" stroke-width="3" />
                <span class="text-xs font-black uppercase tracking-tight">Passable</span>
              </button>
              <button
                class="flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer"
                :class="[
                  isSolid
                    ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20'
                    : 'hover:bg-black/5 border-black/5 text-black/60'
                ]"
                @click="setPassability('solid')"
              >
                <IconWall :size="16" stroke-width="3" />
                <span class="text-xs font-black uppercase tracking-tight">Solid</span>
              </button>
              <button
                class="flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer"
                :class="[
                  isHighPriority
                    ? 'bg-yellow-400 text-black border-yellow-500 shadow-lg shadow-yellow-400/20'
                    : 'hover:bg-black/5 border-black/5 text-black/60'
                ]"
                @click="setPassability('star')"
              >
                <IconStar :size="16" stroke-width="3" class="fill-current" />
                <span class="text-xs font-black uppercase tracking-tight">Priority</span>
              </button>
            </div>
          </div>

          <!-- Directional Blocking -->
          <div class="space-y-4">
            <label class="text-[10px] font-black uppercase tracking-widest text-black/40"
              >Edge Blocking</label
            >
            <div class="relative w-32 h-32 mx-auto">
              <!-- Center Indicator -->
              <div class="absolute inset-0 flex items-center justify-center opacity-10">
                <IconCircle :size="24" />
              </div>

              <!-- Direction Buttons -->
              <button
                class="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95"
                :class="[
                  isDirBlocked(1)
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-white border-black/5 text-black/20 hover:text-black hover:border-black/20 font-black'
                ]"
                @click="toggleDir(1)"
              >
                <IconArrowUp :size="20" stroke-width="3" />
              </button>
              <button
                class="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95"
                :class="[
                  isDirBlocked(2)
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-white border-black/5 text-black/20 hover:text-black hover:border-black/20 font-black'
                ]"
                @click="toggleDir(2)"
              >
                <IconArrowRight :size="20" stroke-width="3" />
              </button>
              <button
                class="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95"
                :class="[
                  isDirBlocked(4)
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-white border-black/5 text-black/20 hover:text-black hover:border-black/20 font-black'
                ]"
                @click="toggleDir(4)"
              >
                <IconArrowDown :size="20" stroke-width="3" />
              </button>
              <button
                class="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95"
                :class="[
                  isDirBlocked(8)
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-white border-black/5 text-black/20 hover:text-black hover:border-black/20 font-black'
                ]"
                @click="toggleDir(8)"
              >
                <IconArrowLeft :size="20" stroke-width="3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-black/5 bg-black/[0.02] flex justify-end gap-3">
        <button
          class="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-black/40 hover:text-black transition-colors cursor-pointer"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          class="flex items-center gap-3 px-8 py-3 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-black/10 active:scale-95 cursor-pointer"
          @click="save"
        >
          <IconDeviceFloppy :size="16" stroke-width="3" />
          Apply Settings
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: -moz-crisp-edges;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: pixelated;
  image-rendering: optimize-speed;
}

@keyframes zoom-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
