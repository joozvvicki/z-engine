<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { IconCheck, IconLoader2 } from '@tabler/icons-vue'
import { ProjectService } from '../../services/ProjectService'

const props = defineProps<{
  initialTilesetId?: string | null
  initialX?: number // Tile index X
  initialY?: number // Tile index Y
  initialPixelW?: number
  initialPixelH?: number
}>()

const emit = defineEmits(['close', 'select'])

// Frame Size Config
const frameWidth = ref(props.initialPixelW || 48)
const frameHeight = ref(props.initialPixelH || 48)

const files = ref<{ name: string; url: string }[]>([])
const isLoadingFiles = ref(true)

const loadProjectCharacters = async (): Promise<void> => {
  isLoadingFiles.value = true
  try {
    const rawFiles = await ProjectService.getProjectFiles('img/characters')
    files.value = rawFiles.map((filename) => ({
      name: filename,
      url: ProjectService.resolveAssetUrl(`img/characters/${filename}`)
    }))

    // Update selected file after loading list
    if (props.initialTilesetId) {
      const found = files.value.find((f) => f.name === props.initialTilesetId)
      if (found) selectedFile.value = found
    } else if (files.value.length > 0) {
      selectedFile.value = files.value[0]
    }
  } catch (e) {
    console.error('Failed to load character files', e)
  } finally {
    isLoadingFiles.value = false
  }
}

onMounted(() => {
  loadProjectCharacters()
})

const selectedFile = ref<{ name: string; url: string }>({ name: 'None', url: '' })

const texWidth = ref(0)
const texHeight = ref(0)

const onImageLoad = (e: Event): void => {
  const img = e.target as HTMLImageElement
  texWidth.value = img.naturalWidth
  texHeight.value = img.naturalHeight
}

const selectedX = ref(props.initialX || 0)
const selectedY = ref(props.initialY || 0)

const selectBlock = (tx: number, ty: number): void => {
  selectedX.value = tx
  selectedY.value = ty
}

const confirm = (): void => {
  // We return both index-based (legacy/compat) and pixel-based values
  emit('select', {
    tilesetId: selectedFile.value.name,
    x: selectedX.value,
    y: selectedY.value,
    w: 1,
    h: 1,
    // New pixel props
    pixelX: selectedX.value * frameWidth.value,
    pixelY: selectedY.value * frameHeight.value,
    pixelW: frameWidth.value,
    pixelH: frameHeight.value,
    // Division info for "Smart" detection fallback
    divW: Math.round(texWidth.value / frameWidth.value) || 1,
    divH: Math.round(texHeight.value / frameHeight.value) || 1
  })
}

// Dynamic styles for grid
const gridStyle = computed(() => ({
  backgroundSize: `${frameWidth.value}px ${frameHeight.value}px`
}))

const selectionStyle = computed(() => ({
  left: `${selectedX.value * frameWidth.value}px`,
  top: `${selectedY.value * frameHeight.value}px`,
  width: `${frameWidth.value}px`,
  height: `${frameHeight.value}px`
}))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-8"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[75vh] flex overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Sidebar: File List & Settings -->
      <div class="w-72 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div class="p-4 border-b border-slate-200 bg-white space-y-4">
          <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500">
            Character Sheet
          </h3>

          <div class="space-y-2">
            <label class="text-[10px] font-bold uppercase text-slate-400">Frame Size</label>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">Width</label>
                <input
                  v-model.number="frameWidth"
                  type="number"
                  min="1"
                  class="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                />
              </div>
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">Height</label>
                <input
                  v-model.number="frameHeight"
                  type="number"
                  min="1"
                  class="w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-2 space-y-1 relative">
          <div v-if="isLoadingFiles" class="absolute inset-0 flex items-center justify-center">
            <IconLoader2 class="w-6 h-6 animate-spin text-slate-300" />
          </div>
          <button
            v-for="file in files"
            :key="file.name"
            class="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent truncate"
            :class="
              selectedFile.name === file.name
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            "
            @click="selectedFile = file"
          >
            {{ file.name }}
          </button>
        </div>
      </div>

      <!-- Main: Preview & Grid -->
      <div class="flex-1 bg-slate-200/50 flex flex-col relative overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center overflow-auto p-8">
          <div class="relative bg-white shadow-xl border border-slate-300 select-none">
            <!-- Image -->
            <img
              ref="imageEl"
              :src="selectedFile.url"
              class="block pixelated pointer-events-none"
              draggable="false"
              @load="onImageLoad"
            />

            <!-- Grid Overlay -->
            <div
              class="absolute inset-0 grid-overlay cursor-pointer"
              :style="gridStyle"
              @click="
                (e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const x = Math.floor((e.clientX - rect.left) / frameWidth)
                  const y = Math.floor((e.clientY - rect.top) / frameHeight)
                  selectBlock(x, y)
                }
              "
            >
              <!-- Selection Highlight -->
              <div
                class="absolute border-2 border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)] pointer-events-none transition-all duration-75 start-frame-marker"
                :style="selectionStyle"
              ></div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-between items-center shadow-lg"
        >
          <div class="text-xs text-slate-500 font-mono">
            {{ selectedFile.name }} [{{ selectedX }}, {{ selectedY }}] ({{ frameWidth }}x{{
              frameHeight
            }})
          </div>
          <div class="flex gap-3">
            <button
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase rounded-lg transition-colors"
              @click="emit('close')"
            >
              Cancel
            </button>
            <button
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              @click="confirm"
            >
              <IconCheck size="16" /> Select Character
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}

.grid-overlay {
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
}

.grid-overlay:hover {
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.2) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 1px, transparent 1px);
}
</style>
