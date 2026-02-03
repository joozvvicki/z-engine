<script setup lang="ts">
import { reactive, watch, ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { ProjectService } from '@ui/services/ProjectService'
import {
  IconMapPlus,
  IconX,
  IconDimensions,
  IconTextCaption,
  IconMusic,
  IconNote,
  IconEye,
  IconVolume,
  IconSettings,
  IconSquare,
  IconDisc
} from '@tabler/icons-vue'
import type { ZAudioConfig } from '@engine/types'

const store = useEditorStore()
const emit = defineEmits(['close'])

const props = defineProps<{
  isOpen: boolean
  editMode?: boolean
  mapId?: number | null
  parentId?: number
}>()

const TILESET_SLOTS = ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'Roofs']

const form = reactive({
  name: 'Nowa Mapa',
  displayName: '',
  width: 20,
  height: 15,
  tilesetConfig: {} as Record<string, string>,
  bgm: { name: '', volume: 90, pitch: 100 },
  bgs: { name: '', volume: 90, pitch: 100 },
  parallax: {
    name: '',
    loopX: false,
    loopY: false,
    scrollX: 0,
    scrollY: 0
  },
  note: '',
  disableAutoshadow: false
})

const activeTab = ref('general')
const bgmFiles = ref<string[]>([])
const bgsFiles = ref<string[]>([])
const parallaxFiles = ref<string[]>([])

const tabs = [
  { id: 'general', label: 'Ogólne' },
  { id: 'tilesets', label: 'Tilesety' },
  { id: 'background', label: 'Tło / Parallax' },
  { id: 'music', label: 'Muzyka' },
  { id: 'notes', label: 'Notatki' }
]

// Initialize form when opening
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      store.refreshTilesetList() // Refresh file list from project

      // Fetch other asset lists
      ProjectService.getProjectFiles('audio/bgm').then(
        (files) => (bgmFiles.value = files.filter((f) => f.match(/\.(mp3|ogg|wav)$/i)))
      )
      ProjectService.getProjectFiles('audio/bgs').then(
        (files) => (bgsFiles.value = files.filter((f) => f.match(/\.(mp3|ogg|wav)$/i)))
      )
      ProjectService.getProjectFiles('img/parallaxes').then(
        (files) => (parallaxFiles.value = files.filter((f) => f.match(/\.(png|jpe?g)$/i)))
      )

      // Clear/Reset the config object with all slots
      const cleanConfig: Record<string, string> = {}
      TILESET_SLOTS.forEach((slot) => (cleanConfig[slot] = ''))

      if (props.editMode && props.mapId) {
        const map = store.maps.find((m) => m.id === props.mapId)
        if (map) {
          form.name = map.name
          form.displayName = map.displayName || ''
          form.width = map.width
          form.height = map.height
          form.note = map.note || ''
          form.disableAutoshadow = map.disableAutoshadow || false

          const defaultAudio: ZAudioConfig = { name: '', volume: 90, pitch: 100 }
          form.bgm = { ...defaultAudio, ...(map.bgm || {}) }
          form.bgs = { ...defaultAudio, ...(map.bgs || {}) }

          form.parallax = {
            name: map.parallax?.name || '',
            loopX: map.parallax?.loopX || false,
            loopY: map.parallax?.loopY || false,
            scrollX: map.parallax?.scrollX || 0,
            scrollY: map.parallax?.scrollY || 0
          }

          // Merge existing config into our clean slate
          if (map.tilesetConfig) {
            Object.entries(map.tilesetConfig).forEach(([key, value]) => {
              if (value) {
                // Use robust normalization from ProjectService
                cleanConfig[key] = ProjectService.getRelativePath(value)
              }
            })
          }
        }
      } else {
        form.name = 'Nowa Mapa'
        form.displayName = ''
        form.width = 20
        form.height = 15
        form.note = ''
        form.disableAutoshadow = false
        form.bgm = { name: '', volume: 90, pitch: 100 }
        form.bgs = { name: '', volume: 90, pitch: 100 }
        form.parallax = { name: '', loopX: false, loopY: false, scrollX: 0, scrollY: 0 }
      }
      form.tilesetConfig = cleanConfig
      activeTab.value = 'general'
    }
  }
)

const handleSave = (): void => {
  if (form.name.trim() && form.width > 0 && form.height > 0) {
    const finalConfig: Record<string, string> = {}
    Object.entries(form.tilesetConfig).forEach(([slot, url]) => {
      if (url) finalConfig[slot] = url
    })

    const payload = {
      name: form.name,
      displayName: form.displayName,
      width: form.width,
      height: form.height,
      tilesetConfig: finalConfig,
      bgm: form.bgm.name ? form.bgm : undefined,
      bgs: form.bgs.name ? form.bgs : undefined,
      parallax: form.parallax.name ? form.parallax : undefined,
      note: form.note,
      disableAutoshadow: form.disableAutoshadow
    }

    if (props.editMode && props.mapId) {
      store.updateMapProperties(props.mapId, payload)
    } else {
      store.createMap(form.name, form.width, form.height, props.parentId || 0, finalConfig, {
        displayName: form.displayName,
        bgm: form.bgm.name ? form.bgm : undefined,
        bgs: form.bgs.name ? form.bgs : undefined,
        parallax: form.parallax.name ? form.parallax : undefined,
        note: form.note,
        disableAutoshadow: form.disableAutoshadow
      })
    }
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 transition-all duration-300"
    >
      <div
        class="w-full max-w-4xl bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[85vh] border border-black/5 animate-in fade-in zoom-in duration-300"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-5 border-b border-black/5 bg-gray-50/50 shrink-0"
        >
          <div class="flex items-center gap-3">
            <div class="p-2 bg-black text-white rounded-lg shadow-lg shadow-black/10">
              <IconMapPlus size="20" />
            </div>
            <div>
              <h2 class="font-black uppercase tracking-[0.15em] text-xs text-black">
                {{ editMode ? 'Właściwości Mapy' : 'Konfiguracja Nowej Mapy' }}
              </h2>
              <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                ID: {{ mapId || 'NEW' }}
              </p>
            </div>
          </div>
          <button
            class="p-2 hover:bg-black/5 rounded-full text-gray-400 hover:text-black transition-all cursor-pointer"
            @click="emit('close')"
          >
            <IconX size="18" />
          </button>
        </div>

        <div class="flex flex-1 min-h-0">
          <!-- Sidebar Tabs -->
          <aside
            class="w-[200px] border-r border-black/5 bg-gray-50/30 flex flex-col p-3 gap-1 shrink-0"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group"
              :class="
                activeTab === tab.id
                  ? 'bg-black text-white shadow-lg shadow-black/10 translate-x-1'
                  : 'text-gray-400 hover:text-black hover:bg-black/5'
              "
              @click="activeTab = tab.id"
            >
              <div
                class="w-1.5 h-1.5 rounded-full transition-all"
                :class="
                  activeTab === tab.id
                    ? 'bg-white scale-125'
                    : 'bg-transparent group-hover:bg-gray-300'
                "
              ></div>
              <span class="text-[10px] font-black uppercase tracking-widest truncate">{{
                tab.label
              }}</span>
            </button>
          </aside>

          <!-- Content Area -->
          <main class="flex-1 overflow-y-auto custom-scrollbar bg-white p-8">
            <Transition name="fade-slide-up" mode="out-in">
              <!-- General Tab -->
              <div v-if="activeTab === 'general'" class="space-y-8 max-w-lg">
                <div class="space-y-6">
                  <div class="grid grid-cols-1 gap-6">
                    <div class="space-y-2">
                      <label
                        class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <IconTextCaption size="12" /> Nazwa Edytora
                      </label>
                      <input
                        v-model="form.name"
                        type="text"
                        class="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs font-medium focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all placeholder:text-gray-300"
                        placeholder="np. Karczma 'Pod Smokiem'..."
                      />
                    </div>
                    <div class="space-y-2">
                      <label
                        class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <IconEye size="12" /> Nazwa Wyświetlana
                      </label>
                      <input
                        v-model="form.displayName"
                        type="text"
                        class="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs font-medium focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all placeholder:text-gray-300"
                        placeholder="np. Złocista Karczma"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-6">
                    <div class="space-y-2">
                      <label
                        class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <IconDimensions size="12" /> Szerokość
                      </label>
                      <input
                        v-model.number="form.width"
                        type="number"
                        class="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs font-medium focus:border-black outline-none transition-all"
                      />
                    </div>
                    <div class="space-y-2">
                      <label
                        class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <IconDimensions size="12" /> Wysokość
                      </label>
                      <input
                        v-model.number="form.height"
                        type="number"
                        class="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs font-medium focus:border-black outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div
                    class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-black/5"
                  >
                    <IconSettings size="18" class="text-gray-400" />
                    <div class="flex-1">
                      <p class="text-[10px] font-black uppercase tracking-tight">
                        Opcje renderowania
                      </p>
                      <p class="text-[9px] text-gray-400 font-medium">
                        Ustawienia specyficzne dla wyświetlania mapy.
                      </p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        v-model="form.disableAutoshadow"
                        type="checkbox"
                        class="sr-only peer"
                      />
                      <div
                        class="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"
                      ></div>
                      <span class="ml-3 text-[10px] font-bold text-gray-600 uppercase"
                        >Wyłącz Autoshadow</span
                      >
                    </label>
                  </div>
                </div>
              </div>

              <!-- Tilesets Tab -->
              <div v-else-if="activeTab === 'tilesets'" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    v-for="slot in TILESET_SLOTS"
                    :key="slot"
                    class="group bg-gray-50 rounded-2xl p-4 border border-black/5 hover:border-black/10 transition-all"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <label class="text-[9px] font-black text-black uppercase tracking-tighter">{{
                        slot
                      }}</label>
                      <span
                        v-if="form.tilesetConfig[slot]"
                        class="text-[8px] font-bold text-green-500 uppercase"
                        >Active</span
                      >
                    </div>
                    <div class="flex gap-3 items-center">
                      <select
                        v-model="form.tilesetConfig[slot]"
                        class="flex-1 bg-white border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-medium text-gray-600 outline-none focus:border-black transition-all appearance-none cursor-pointer"
                      >
                        <option value="">(Brak / Domyślny)</option>
                        <option
                          v-for="file in store.tilesetFileList"
                          :key="file.relativePath"
                          :value="file.relativePath"
                        >
                          {{ file.name }}
                        </option>
                      </select>
                      <div
                        class="w-12 h-12 rounded-xl border border-black/5 overflow-hidden bg-white shrink-0 shadow-sm flex items-center justify-center relative group-hover:scale-110 transition-transform cursor-zoom-in"
                      >
                        <img
                          v-if="form.tilesetConfig[slot]"
                          :src="ProjectService.resolveAssetUrl(form.tilesetConfig[slot])"
                          class="w-full h-full object-cover pixelated"
                        />
                        <IconDisc v-else size="18" class="text-gray-100" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Background Tab -->
              <div v-else-if="activeTab === 'background'" class="space-y-8 max-w-lg">
                <div class="space-y-6">
                  <div class="space-y-2">
                    <label
                      class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"
                    >
                      <IconSquare size="12" /> Grafika Parallax (Tło)
                    </label>
                    <div class="flex gap-4">
                      <select
                        v-model="form.parallax.name"
                        class="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-xs font-medium focus:border-black outline-none"
                      >
                        <option value="">(Brak tła)</option>
                        <option
                          v-for="file in parallaxFiles"
                          :key="file"
                          :value="'img/parallaxes/' + file"
                        >
                          {{ file }}
                        </option>
                      </select>
                      <button
                        class="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                      >
                        Wybierz...
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-8">
                    <div class="space-y-4">
                      <p
                        class="text-[10px] font-black text-black uppercase tracking-wider border-b border-black/5 pb-2"
                      >
                        Przewijanie Poziome
                      </p>
                      <div class="flex items-center gap-3">
                        <input
                          v-model="form.parallax.loopX"
                          type="checkbox"
                          class="w-4 h-4 rounded border-black/10 text-black focus:ring-black"
                        />
                        <span class="text-[10px] font-bold text-gray-600 uppercase"
                          >Zapętlaj (X)</span
                        >
                      </div>
                      <div v-if="form.parallax.loopX" class="space-y-2">
                        <span class="text-[9px] font-black text-gray-300 uppercase"
                          >Szybkość X</span
                        >
                        <input
                          v-model.number="form.parallax.scrollX"
                          type="number"
                          class="w-full bg-gray-50 border border-black/5 rounded-lg px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                    <div class="space-y-4">
                      <p
                        class="text-[10px] font-black text-black uppercase tracking-wider border-b border-black/5 pb-2"
                      >
                        Przewijanie Pionowe
                      </p>
                      <div class="flex items-center gap-3">
                        <input
                          v-model="form.parallax.loopY"
                          type="checkbox"
                          class="w-4 h-4 rounded border-black/10 text-black focus:ring-black"
                        />
                        <span class="text-[10px] font-bold text-gray-600 uppercase"
                          >Zapętlaj (Y)</span
                        >
                      </div>
                      <div v-if="form.parallax.loopY" class="space-y-2">
                        <span class="text-[9px] font-black text-gray-300 uppercase"
                          >Szybkość Y</span
                        >
                        <input
                          v-model.number="form.parallax.scrollY"
                          type="number"
                          class="w-full bg-gray-50 border border-black/5 rounded-lg px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Music Tab -->
              <div v-else-if="activeTab === 'music'" class="space-y-12 max-w-lg">
                <!-- BGM -->
                <div class="space-y-4">
                  <div class="flex items-center gap-2 mb-2">
                    <IconMusic size="16" />
                    <h3 class="text-[10px] font-black uppercase tracking-widest">
                      Background Music (BGM)
                    </h3>
                  </div>
                  <div class="bg-gray-50 rounded-2xl p-6 border border-black/3 space-y-4">
                    <div class="flex gap-4">
                      <select
                        v-model="form.bgm.name"
                        class="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-xs"
                      >
                        <option value="">(Brak muzyki)</option>
                        <option v-for="file in bgmFiles" :key="file" :value="'audio/bgm/' + file">
                          {{ file }}
                        </option>
                      </select>
                      <button
                        class="p-3 bg-black text-white rounded-xl hover:scale-105 transition-transform"
                      >
                        <IconVolume size="18" />
                      </button>
                    </div>
                    <div class="grid grid-cols-2 gap-6">
                      <div class="space-y-2">
                        <label
                          class="text-[9px] font-black text-gray-300 uppercase flex justify-between"
                          >Głośność <span>{{ form.bgm.volume }}%</span></label
                        >
                        <input
                          v-model.number="form.bgm.volume"
                          type="range"
                          min="0"
                          max="100"
                          class="w-full accent-black"
                        />
                      </div>
                      <div class="space-y-2">
                        <label
                          class="text-[9px] font-black text-gray-300 uppercase flex justify-between"
                          >Tempo <span>{{ form.bgm.pitch }}%</span></label
                        >
                        <input
                          v-model.number="form.bgm.pitch"
                          type="range"
                          min="50"
                          max="150"
                          class="w-full accent-black"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- BGS -->
                <div class="space-y-4">
                  <div class="flex items-center gap-2 mb-2">
                    <IconVolume size="16" />
                    <h3 class="text-[10px] font-black uppercase tracking-widest">
                      Background Sound (BGS)
                    </h3>
                  </div>
                  <div class="bg-gray-50 rounded-2xl p-6 border border-black/3 space-y-4">
                    <div class="flex gap-4">
                      <select
                        v-model="form.bgs.name"
                        class="flex-1 bg-white border border-black/10 rounded-xl px-4 py-3 text-xs"
                      >
                        <option value="">(Brak dźwięku tła)</option>
                        <option v-for="file in bgsFiles" :key="file" :value="'audio/bgs/' + file">
                          {{ file }}
                        </option>
                      </select>
                      <button
                        class="p-3 bg-black text-white rounded-xl hover:scale-105 transition-transform"
                      >
                        <IconVolume size="18" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notes Tab -->
              <div v-else-if="activeTab === 'notes'" class="h-full flex flex-col">
                <div class="space-y-2 flex-1 flex flex-col min-h-[300px]">
                  <label
                    class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"
                  >
                    <IconNote size="12" /> Notatki Projektowe (Metadata)
                  </label>
                  <textarea
                    v-model="form.note"
                    class="flex-1 w-full bg-gray-50 border border-black/5 rounded-2xl p-6 text-[11px] font-medium leading-relaxed focus:bg-white focus:border-black outline-none transition-all resize-none placeholder:text-gray-300"
                    placeholder="Wpisz metadane mapy lub notatki dla skryptów..."
                  ></textarea>
                  <p class="text-[9px] text-gray-300 font-bold uppercase mt-2">
                    Działa jak pole 'Note' w RPG Makerze.
                  </p>
                </div>
              </div>
            </Transition>
          </main>
        </div>

        <!-- Footer Actions -->
        <div class="p-6 bg-gray-50 border-t border-black/5 flex gap-4 shrink-0">
          <button
            class="flex-1 px-8 py-3.5 text-[10px] font-black text-gray-400 hover:text-black hover:bg-black/5 rounded-xl transition-all uppercase tracking-[0.2em] cursor-pointer"
            @click="emit('close')"
          >
            Anuluj
          </button>
          <button
            class="flex-2 px-8 py-3.5 text-[10px] font-black bg-black hover:bg-gray-800 text-white rounded-xl transition-all shadow-xl shadow-black/10 uppercase tracking-[0.2em] cursor-pointer active:scale-95 translate-z-0"
            @click="handleSave"
          >
            {{ editMode ? 'Zapisz Właściwości' : 'Utwórz Nową Mapę' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
}

/* Animations */
.fade-slide-up-enter-active,
.fade-slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-up-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-up-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@keyframes animate-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-in {
  animation: animate-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
```
