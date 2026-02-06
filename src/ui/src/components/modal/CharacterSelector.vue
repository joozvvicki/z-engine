<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { IconCheck, IconLoader2, IconSettings, IconPhoto } from '@tabler/icons-vue'
import { ProjectService } from '../../services/ProjectService'

const props = defineProps<{
  initialTilesetId?: string | null
  initialX?: number
  initialY?: number
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
    files.value = rawFiles.map((f: { name: string; isDirectory: boolean }) => {
      const filename = typeof f === 'string' ? f : f.name
      return {
        name: filename,
        url: ProjectService.resolveAssetUrl(`img/characters/${filename}`)
      }
    })

    if (props.initialTilesetId) {
      const targetName = props.initialTilesetId.split('/').pop()
      const found = files.value.find((f) => f.name === targetName)
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

const selectedX = ref(props.initialX ?? 0)
const selectedY = ref(props.initialY ?? 0)

const selectBlock = (tx: number, ty: number): void => {
  selectedX.value = tx
  selectedY.value = ty
}

const confirm = (): void => {
  emit('select', {
    tilesetId: `img/characters/${selectedFile.value.name}`,
    x: selectedX.value,
    y: selectedY.value,
    w: 1,
    h: 1,
    pixelX: selectedX.value * frameWidth.value,
    pixelY: selectedY.value * frameHeight.value,
    pixelW: frameWidth.value,
    pixelH: frameHeight.value,
    divW: Math.round(texWidth.value / frameWidth.value) || 1,
    divH: Math.round(texHeight.value / frameHeight.value) || 1
  })
}

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
    class="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 md:p-12"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)] w-full max-w-6xl h-[85vh] flex overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-300"
    >
      <aside class="w-80 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 bg-white border-b border-slate-200 space-y-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100"
            >
              <IconPhoto size="20" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                Asset Picker
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Characters & Sprites</p>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest"
            >
              <IconSettings size="14" /> Frame Configuration
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 ml-1">Width (px)</span>
                <input
                  v-model.number="frameWidth"
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 ml-1">Height (px)</span>
                <input
                  v-model.number="frameHeight"
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-1 relative no-scrollbar">
          <div
            v-if="isLoadingFiles"
            class="absolute inset-0 flex items-center justify-center bg-slate-50/50"
          >
            <IconLoader2 class="w-6 h-6 animate-spin text-indigo-500" />
          </div>

          <button
            v-for="file in files"
            :key="file.name"
            class="w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all border border-transparent flex items-center gap-3 group"
            :class="
              selectedFile.name === file.name
                ? 'bg-white text-indigo-600 border-slate-200 shadow-sm'
                : 'text-slate-500 hover:bg-white hover:border-slate-100 hover:text-slate-700'
            "
            @click="selectedFile = file"
          >
            <div
              :class="[
                'w-2 h-2 rounded-full transition-all',
                selectedFile.name === file.name
                  ? 'bg-indigo-500 scale-125'
                  : 'bg-slate-300 group-hover:bg-slate-400'
              ]"
            />
            <span className="truncate">{{ file.name }}</span>
          </button>
        </div>
      </aside>

      <div class="flex-1 bg-slate-100 flex flex-col relative overflow-hidden">
        <div class="flex-1 overflow-auto p-8 md:p-20 flex min-h-0 custom-scrollbar">
          <div
            class="relative m-auto shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden bg-white border border-slate-300"
          >
            <div className="absolute inset-0 checkerboard opacity-[0.05]" />

            <img
              :src="selectedFile.url"
              class="relative block pixelated pointer-events-none"
              draggable="false"
              @load="onImageLoad"
            />

            <div
              class="absolute inset-0 grid-overlay cursor-crosshair"
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
              <div
                class="absolute border-2 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3),inset_0_0_0_1px_rgba(255,255,255,0.4)] pointer-events-none transition-all duration-150 rounded-sm"
                :style="selectionStyle"
              >
                <div
                  className="absolute -top-6 left-0 bg-indigo-600 text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase whitespace-nowrap"
                >
                  Selected Frame
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer
          class="bg-white border-t border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]"
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >Active Selection</span
              >
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700"
                >
                  {{ selectedX }} : {{ selectedY }}
                </span>
                <span
                  className="px-3 py-1 bg-indigo-50 rounded-lg text-xs font-mono font-bold text-indigo-600"
                >
                  {{ frameWidth }}x{{ frameHeight }}px
                </span>
              </div>
            </div>
          </div>

          <div class="flex gap-3 w-full md:w-auto">
            <button
              class="flex-1 md:flex-none px-8 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
              @click="emit('close')"
            >
              Cancel
            </button>
            <button
              class="flex-1 md:flex-none px-8 py-3 bg-slate-900 hover:bg-black text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 shadow-slate-200"
              @click="confirm"
            >
              <IconCheck size="18" /> Use Character
            </button>
          </div>
        </footer>
      </div>
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

.grid-overlay {
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
}

.grid-overlay:hover {
  background-image:
    linear-gradient(to right, rgba(79, 70, 229, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(79, 70, 229, 0.1) 1px, transparent 1px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
