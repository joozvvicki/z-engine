<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import {
  IconDeviceFloppy,
  IconX,
  IconCircle,
  IconCircleX,
  IconStar,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconSettings2
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
const PREVIEW_SIZE = 160 // Rozmiar okna podglądu

const sortYOffset = ref(0)
const dirBlock = ref(0)
const isSolid = ref(false)
const isHighPriority = ref(false)

const textureWidth = ref(0)
const zoom = computed(() => PREVIEW_SIZE / GRID_SIZE)

const initSettings = (): void => {
  const config = store.getTileConfig(props.tilesetUrl, props.tileX, props.tileY)
  if (config) {
    isSolid.value = !!config.isSolid
    isHighPriority.value = !!config.isHighPriority
    sortYOffset.value = config.sortYOffset || 0
    dirBlock.value = config.dirBlock || 0
  }

  // Pobieramy wymiary tekstury dla poprawnego renderowania
  const img = new Image()
  img.src = props.imageUrl
  img.onload = () => {
    textureWidth.value = img.naturalWidth
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
    class="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)] border border-slate-200 w-full max-w-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col"
    >
      <header class="p-8 pb-6 border-b border-slate-100 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div
            class="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100"
          >
            <IconSettings2 size="20" />
          </div>
          <div>
            <h3 class="text-lg font-black text-slate-900 tracking-tight uppercase">Tile Config</h3>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Index: {{ tileX }}, {{ tileY }}
            </p>
          </div>
        </div>
        <button
          class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors"
          @click="emit('close')"
        >
          <IconX size="20" />
        </button>
      </header>

      <div class="p-8 space-y-10">
        <div class="flex gap-8 items-center">
          <div class="relative">
            <div
              class="w-[160px] h-[160px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative shadow-inner flex items-center justify-center"
            >
              <div class="absolute inset-0 checkerboard opacity-[0.03]" />

              <div
                class="relative pixelated transition-transform duration-500 hover:scale-105"
                :style="{
                  width: `${PREVIEW_SIZE}px`,
                  height: `${PREVIEW_SIZE}px`,
                  backgroundImage: `url(${imageUrl})`,
                  backgroundPosition: `-${tileX * GRID_SIZE * zoom}px -${tileY * GRID_SIZE * zoom}px`,
                  backgroundSize: `${textureWidth * zoom}px auto`
                }"
              ></div>

              <div
                class="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)] z-20 pointer-events-none"
                :style="{ bottom: `${(GRID_SIZE / 2 + sortYOffset) * zoom}px` }"
              >
                <div
                  class="absolute -top-4 right-2 text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-white/80 px-1 rounded"
                >
                  Sorting Pivot
                </div>
              </div>
            </div>
          </div>

          <div class="flex-1 space-y-4">
            <div class="space-y-3">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                >Y-Offset (Z-Sorting)</label
              >
              <div class="flex items-center gap-4">
                <input
                  v-model.number="sortYOffset"
                  type="range"
                  min="-24"
                  max="24"
                  class="flex-1 accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                />
                <span
                  class="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg min-w-[40px] text-center"
                >
                  {{ sortYOffset > 0 ? '+' + sortYOffset : sortYOffset }}
                </span>
              </div>
              <p class="text-[9px] font-medium text-slate-400 leading-tight">
                Zmienia moment, w którym postać chowa się za tym kaflem.
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-8">
          <div class="space-y-4">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >Behavior</label
            >
            <div class="space-y-2">
              <button
                v-for="btn in [
                  {
                    id: 'open',
                    label: 'Passable',
                    icon: IconCircle,
                    active: !isSolid && !isHighPriority,
                    color: 'indigo'
                  },
                  {
                    id: 'solid',
                    label: 'Obstacle',
                    icon: IconCircleX,
                    active: isSolid,
                    color: 'rose'
                  },
                  {
                    id: 'star',
                    label: 'Priority',
                    icon: IconStar,
                    active: isHighPriority,
                    color: 'amber'
                  }
                ]"
                :key="btn.id"
                :class="[
                  'w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all font-bold text-xs uppercase tracking-tight',
                  btn.active
                    ? `bg-${btn.color}-50 border-${btn.color}-500 text-${btn.color}-600 shadow-sm`
                    : 'bg-white border-slate-50 text-slate-400 hover:border-slate-100'
                ]"
                @click="setPassability(btn.id as any)"
              >
                <component :is="btn.icon" size="16" stroke-width="3" />
                {{ btn.label }}
              </button>
            </div>
          </div>

          <div class="space-y-4">
            <label
              class="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center block"
              >Edge Blocking</label
            >
            <div class="relative w-32 h-32 mx-auto">
              <div
                class="absolute inset-0 m-auto w-10 h-10 bg-slate-50 rounded-full border border-slate-100 flex items-center justify-center"
              >
                <div class="w-1.5 h-1.5 rounded-full bg-slate-200" />
              </div>

              <button
                v-for="dir in [
                  { bit: 1, icon: IconArrowUp, pos: 'top-0 left-1/2 -translate-x-1/2' },
                  { bit: 2, icon: IconArrowRight, pos: 'right-0 top-1/2 -translate-y-1/2' },
                  { bit: 4, icon: IconArrowDown, pos: 'bottom-0 left-1/2 -translate-x-1/2' },
                  { bit: 8, icon: IconArrowLeft, pos: 'left-0 top-1/2 -translate-y-1/2' }
                ]"
                :key="dir.bit"
                :class="[
                  'absolute w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all active:scale-90',
                  isDirBlocked(dir.bit)
                    ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-200'
                    : 'bg-white border-slate-100 text-slate-300 hover:text-slate-500 hover:border-slate-200',
                  dir.pos
                ]"
                :style="{ [dir.pos.split(' ')[0]]: 0 }"
                @click="toggleDir(dir.bit)"
              >
                <component :is="dir.icon" size="18" stroke-width="3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer class="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
        <button
          class="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="flex items-center gap-3 px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95"
          @click="save"
        >
          <IconDeviceFloppy size="16" stroke-width="3" />
          Save Changes
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}

.checkerboard {
  background-image: conic-gradient(#000 90deg, #fff 90deg 180deg, #000 180deg 270deg, #fff 270deg);
  background-size: 20px 20px;
}

/* Ukrywamy domyślny wygląd range dla Webkit */
input[type='range']::-webkit-slider-runnable-track {
  border-radius: 10px;
}

/* Klasy pomocnicze dla dynamicznych kolorów tailwinda (jeśli nie masz ich w safelist) */
.bg-rose-50 {
  background-color: #fff1f2;
}
.border-rose-500 {
  border-color: #f43f5e;
}
.text-rose-600 {
  color: #e11d48;
}

.bg-amber-50 {
  background-color: #fffbeb;
}
.border-amber-500 {
  border-color: #f59e0b;
}
.text-amber-600 {
  color: #d97706;
}

.bg-indigo-50 {
  background-color: #eef2ff;
}
.border-indigo-500 {
  border-color: #6366f1;
}
.text-indigo-600 {
  color: #4f46e5;
}
</style>
