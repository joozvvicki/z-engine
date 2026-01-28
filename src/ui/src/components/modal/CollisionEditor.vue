<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { IconDeviceFloppy, IconX } from '@tabler/icons-vue'

const props = defineProps<{
  tilesetId: string
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

const initMask = () => {
  const config = store.tilesetConfigs[props.tilesetId]?.[`${props.tileX}_${props.tileY}`]
  if (config?.collisionMask) {
    mask.value = [...config.collisionMask]
  } else if (config?.isSolid) {
    // If fully solid, pre-fill?
    mask.value.fill(true)
  }
}

// Draw logic
const handlePixelClick = (e: MouseEvent) => {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = Math.floor((e.clientX - rect.left) / SCALE)
  const y = Math.floor((e.clientY - rect.top) / SCALE)

  if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
    const idx = y * GRID_SIZE + x
    mask.value[idx] = !mask.value[idx] // Toggle
  }
}

const save = () => {
  // Save mask to store
  // We need to update updateTileConfig to accept mask
  store.updateTileConfig(props.tilesetId, props.tileX, props.tileY, {
    collisionMask: mask.value
  } as any)
  emit('close')
}

initMask()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div
      class="bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
    >
      <div class="p-4 border-b border-white/10 flex justify-between items-center">
        <h3 class="text-white font-bold">Edit Collision Mask</h3>
        <button class="text-white/50 hover:text-white" @click="$emit('close')">
          <IconX />
        </button>
      </div>

      <div class="p-8 flex gap-8">
        <!-- Preview Original -->
        <div class="flex flex-col gap-2">
          <span class="text-xs text-white/50">Original Tile</span>
          <div
            class="w-[96px] h-[96px] bg-white/5 border border-white/10 pixelated"
            :style="{
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: `-${tileX * 48 * 2}px -${tileY * 48 * 2}px`,
              backgroundSize: '200%'
            }"
          ></div>
        </div>

        <!-- Canvas Grid -->
        <div class="flex flex-col gap-2">
          <span class="text-xs text-white/50">Collision Mask (Left Click to Toggle)</span>
          <div
            ref="canvasRef"
            class="relative border border-white/20 cursor-crosshair"
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
                backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
                backgroundSize: `${SCALE}px ${SCALE}px`
              }"
            ></div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-white/10 flex justify-end gap-2">
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
