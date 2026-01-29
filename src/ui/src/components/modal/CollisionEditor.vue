<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { IconDeviceFloppy, IconX } from '@tabler/icons-vue'

const props = defineProps<{
  tilesetUrl: string // Renamed from tilesetId to be explicit
  tileX: number
  tileY: number
  imageUrl: string
}>()

const emit = defineEmits(['close'])

const store = useEditorStore()
const GRID_SIZE = 48
const SCALE = 8 // Zoom factor for pixel editing

const canvasRef = ref<HTMLCanvasElement | null>(null)

// We need to load existing collision mask if it exists
// or create a new one (48x48 bits)
// For now, let's use a simple boolean array [48*48]
const mask = ref<boolean[]>(new Array(GRID_SIZE * GRID_SIZE).fill(false))
const sortYOffset = ref(0) // Default 0
const dirBlock = ref(0) // Bitmask

const initMask = (): void => {
  const config = store.tilesetConfigs[props.tilesetUrl]?.[`${props.tileX}_${props.tileY}`]
  if (config?.collisionMask) {
    mask.value = [...config.collisionMask]
  } else if (config?.isSolid) {
    mask.value.fill(true)
  }
  if (config?.sortYOffset !== undefined) {
    sortYOffset.value = config.sortYOffset
  }
  if (config?.dirBlock !== undefined) {
    dirBlock.value = config.dirBlock
  }
}

// Toggle Direction Bit
const toggleDir = (bit: number): void => {
  dirBlock.value ^= bit
}

const isDirBlocked = (bit: number): boolean => {
  return (dirBlock.value & bit) === bit
}

// Draw logic
const handlePixelClick = (e: MouseEvent): void => {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = Math.floor((e.clientX - rect.left) / SCALE)
  const y = Math.floor((e.clientY - rect.top) / SCALE)

  if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
    const idx = y * GRID_SIZE + x
    mask.value[idx] = !mask.value[idx] // Toggle
  }
}

const save = (): void => {
  store.updateTileConfig(props.tilesetUrl, props.tileX, props.tileY, {
    collisionMask: mask.value,
    sortYOffset: sortYOffset.value,
    dirBlock: dirBlock.value
  })
  emit('close')
}

initMask()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
    <div
      class="bg-white border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
    >
      <div class="p-4 border-b border-black/10 flex justify-between items-center">
        <h3 class="text-black font-bold">Edit Collision & Pivot</h3>
        <button class="text-black/50 hover:text-black" @click="$emit('close')">
          <IconX />
        </button>
      </div>

      <div class="p-8 flex gap-8">
        <!-- Preview Original & Controls -->
        <div class="flex flex-col gap-4 w-[200px]">
          <!-- Interactive Preview Area -->
          <div class="flex flex-col gap-2">
            <!-- Preview Container -->
            <div
              class="relative border border-black/10 bg-white overflow-visible"
              :style="{ width: `${GRID_SIZE * 4}px`, height: `${GRID_SIZE * 4}px` }"
            >
              <!-- Calculate Z-Index layers dynamically -->

              <!-- 2. The Tile Itself -->
              <div class="absolute inset-0 pixelated pointer-events-none z-10 overflow-hidden">
                <!-- Render scaled up tile -->
                <div
                  class="absolute w-[48px] h-[48px] pixelated origin-top-left"
                  :style="{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundPosition: `-${tileX * 48}px -${tileY * 48}px`,
                    transform: 'scale(4)'
                  }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Y-Sort Pivot Control -->
          <div class="flex flex-col gap-2 p-2 bg-white rounded-lg border border-white/10">
            <span class="text-xs text-black/50 uppercase font-bold">Z-Index Offset</span>
            <div class="flex items-center gap-2">
              <input
                v-model.number="sortYOffset"
                type="range"
                min="-24"
                max="24"
                class="flex-1 accent-purple-500 h-1 bg-black/10 rounded-lg appearance-none cursor-pointer"
              />
              <span class="text-xs font-mono w-8 text-right">{{ sortYOffset }}</span>
            </div>
            <p class="text-[10px] text-black/30 leading-tight">
              Negative: Sorts Higher (Behind)<br />
              Positive: Sorts Lower (Front)
            </p>
          </div>

          <!-- Directional Blocking -->
          <div class="flex flex-col gap-2 p-2 bg-white rounded-lg border border-white/10">
            <span class="text-xs text-black/50 uppercase font-bold">Edge Blocking</span>
            <div class="grid grid-cols-3 gap-1 w-max mx-auto">
              <div></div>
              <button
                class="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 border transition-colors"
                :class="
                  isDirBlocked(1) ? 'bg-red-100 border-red-500 text-red-600' : 'border-black/10'
                "
                @click="toggleDir(1)"
              >
                ▲
              </button>
              <div></div>

              <button
                class="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 border transition-colors"
                :class="
                  isDirBlocked(8) ? 'bg-red-100 border-red-500 text-red-600' : 'border-black/10'
                "
                @click="toggleDir(8)"
              >
                ◀
              </button>
              <div class="w-8 h-8 flex items-center justify-center text-xs text-black/20">DIR</div>
              <button
                class="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 border transition-colors"
                :class="
                  isDirBlocked(2) ? 'bg-red-100 border-red-500 text-red-600' : 'border-black/10'
                "
                @click="toggleDir(2)"
              >
                ▶
              </button>

              <div></div>
              <button
                class="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 border transition-colors"
                :class="
                  isDirBlocked(4) ? 'bg-red-100 border-red-500 text-red-600' : 'border-black/10'
                "
                @click="toggleDir(4)"
              >
                ▼
              </button>
              <div></div>
            </div>
          </div>
        </div>

        <!-- Canvas Grid -->
        <div class="flex flex-col gap-2">
          <span class="text-xs text-white/50">Collision Mask (Left Click to Toggle)</span>
          <div
            ref="canvasRef"
            class="relative border border-white/20 cursor-crosshair overflow-hidden"
            :style="{ width: `${GRID_SIZE * SCALE}px`, height: `${GRID_SIZE * SCALE}px` }"
            @mousedown="handlePixelClick"
          >
            <!-- We render pixels via v-for for now or Canvas? Canvas is better for 48x48xSCALE -->
            <!-- But DOM is easier to prototype. Using template for loop to avoid v-for/v-if mix -->
            <template v-for="(bit, idx) in mask" :key="idx">
              <div
                v-if="bit"
                class="absolute bg-red-500/50 pointer-events-none"
                :style="{
                  left: `${(idx % GRID_SIZE) * SCALE}px`,
                  top: `${Math.floor(idx / GRID_SIZE) * SCALE}px`,
                  width: `${SCALE}px`,
                  height: `${SCALE}px`
                }"
              ></div>
            </template>

            <!-- Grid Lines Overlay -->
            <div
              class="absolute inset-0 pointer-events-none opacity-20"
              :style="{
                backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
                backgroundSize: `${SCALE}px ${SCALE}px`
              }"
            ></div>

            <!-- Pivot Line Indicator -->
            <div
              class="absolute left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,1)] pointer-events-none z-10 flex items-center"
              :style="{
                bottom: `${sortYOffset * -1 * SCALE}px` /* Offset is added to Bottom Y, so here we visualize it relative to bottom */
              }"
            >
              <div
                class="absolute left-0 right-0 -top-4 text-[10px] text-blue-300 text-center font-bold font-mono"
              >
                Z-Flip Line
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-black/10 flex justify-end gap-2">
        <button
          class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold text-xs"
          @click="save"
        >
          <IconDeviceFloppy class="w-4 h-4" />
          Save Mask
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
</style>
