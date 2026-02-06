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
    <Transition name="modal-fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      >
        <div
          class="w-full max-w-5xl bg-white rounded-[24px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col max-h-[90vh] border border-slate-200/60 transition-all duration-500"
        >
          <header
            class="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0"
          >
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 -rotate-2"
              >
                <IconMapPlus size="24" />
              </div>
              <div>
                <h2 class="text-lg font-bold text-slate-800 tracking-tight">
                  {{ editMode ? 'Właściwości Mapy' : 'Nowa Mapa' }}
                </h2>
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider"
                  >
                    ID: {{ mapId || 'Nowy obiekt' }}
                  </span>
                </div>
              </div>
            </div>
            <button
              class="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              @click="emit('close')"
            >
              <IconX size="20" />
            </button>
          </header>

          <div class="flex flex-1 min-h-0">
            <nav
              class="w-[240px] border-r border-slate-50 bg-slate-50/30 flex flex-col p-4 gap-1.5 shrink-0"
            >
              <button
                v-for="tab in tabs"
                :key="tab.id"
                class="flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group"
                :class="
                  activeTab === tab.id
                    ? 'bg-white shadow-md shadow-slate-200/50 text-indigo-600'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                "
                @click="activeTab = tab.id"
              >
                <span class="text-sm font-semibold tracking-tight">{{ tab.label }}</span>
                <IconChevronRight
                  size="14"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  :class="{ 'opacity-100': activeTab === tab.id }"
                />
              </button>
            </nav>

            <main class="flex-1 overflow-y-auto custom-scrollbar bg-white p-10">
              <Transition name="page-fade" mode="out-in">
                <div v-if="activeTab === 'general'" class="space-y-10 animate-slide-in">
                  <section class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-3">
                      <label
                        class="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <IconTextCaption size="14" class="text-indigo-500" /> Nazwa Edytora
                      </label>
                      <input
                        v-model="form.name"
                        type="text"
                        class="docs-input"
                        placeholder="np. Karczma 'Pod Smokiem'..."
                      />
                    </div>
                    <div class="space-y-3">
                      <label
                        class="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <IconEye size="14" class="text-indigo-500" /> Nazwa Wyświetlana
                      </label>
                      <input
                        v-model="form.displayName"
                        type="text"
                        class="docs-input"
                        placeholder="np. Złocista Karczma"
                      />
                    </div>
                  </section>

                  <section class="grid grid-cols-2 gap-8">
                    <div class="space-y-3">
                      <label
                        class="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <IconDimensions size="14" class="text-indigo-500" /> Szerokość (Tiles)
                      </label>
                      <input v-model.number="form.width" type="number" class="docs-input" />
                    </div>
                    <div class="space-y-3">
                      <label
                        class="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"
                      >
                        <IconDimensions size="14" class="text-indigo-500" /> Wysokość (Tiles)
                      </label>
                      <input v-model.number="form.height" type="number" class="docs-input" />
                    </div>
                  </section>

                  <div
                    class="p-6 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 flex items-center justify-between"
                  >
                    <div class="flex items-center gap-4">
                      <div
                        class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"
                      >
                        <IconSettings size="20" />
                      </div>
                      <div>
                        <p class="text-sm font-bold text-indigo-900">Autoshadowing</p>
                        <p class="text-xs text-indigo-600/60 font-medium">
                          Automatyczne generowanie cieni ścian.
                        </p>
                      </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input
                        v-model="form.disableAutoshadow"
                        type="checkbox"
                        class="sr-only peer"
                      />
                      <div
                        class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full shadow-inner"
                      ></div>
                    </label>
                  </div>
                </div>

                <div
                  v-else-if="activeTab === 'tilesets'"
                  class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-in"
                >
                  <div
                    v-for="slot in TILESET_SLOTS"
                    :key="slot"
                    class="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-slate-200/40 transition-all group"
                  >
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-[10px] font-black text-indigo-500 uppercase tracking-widest"
                        >Slot {{ slot }}</span
                      >
                    </div>
                    <div class="flex gap-4 items-center">
                      <div
                        class="w-14 h-14 rounded-xl border border-slate-200 bg-white shadow-inner flex items-center justify-center overflow-hidden shrink-0"
                      >
                        <img
                          v-if="form.tilesetConfig[slot]"
                          :src="ProjectService.resolveAssetUrl(form.tilesetConfig[slot])"
                          class="w-full h-full object-cover pixelated"
                        />
                        <IconDisc v-else size="20" class="text-slate-200" />
                      </div>
                      <select
                        v-model="form.tilesetConfig[slot]"
                        class="flex-1 bg-transparent border-none text-sm font-semibold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="">Brak / Domyślny</option>
                        <option
                          v-for="file in store.tilesetFileList"
                          :key="file.relativePath"
                          :value="file.relativePath"
                        >
                          {{ file.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div v-else-if="activeTab === 'music'" class="space-y-12 animate-slide-in max-w-xl">
                  <div v-for="type in ['bgm', 'bgs']" :key="type" class="space-y-6">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"
                      >
                        <component :is="type === 'bgm' ? IconMusic : IconVolume" size="18" />
                      </div>
                      <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {{ type.toUpperCase() }} — Audio tła
                      </h3>
                    </div>

                    <div class="bg-slate-50 border border-slate-100 rounded-3xl p-8 space-y-8">
                      <select v-model="form[type].name" class="docs-input bg-white">
                        <option value="">Wyciszony</option>
                        <option
                          v-for="file in type === 'bgm' ? bgmFiles : bgsFiles"
                          :key="file"
                          :value="`audio/${type}/${file}`"
                        >
                          {{ file }}
                        </option>
                      </select>

                      <div class="grid grid-cols-1 gap-8">
                        <div class="space-y-4">
                          <div class="flex justify-between items-center">
                            <span
                              class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                              >Głośność</span
                            >
                            <span class="text-sm font-bold text-slate-700"
                              >{{ form[type].volume }}%</span
                            >
                          </div>
                          <input
                            v-model.number="form[type].volume"
                            type="range"
                            class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else-if="activeTab === 'notes'" class="h-full animate-slide-in">
                  <div class="h-full flex flex-col gap-4">
                    <label
                      class="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"
                    >
                      <IconNote size="14" class="text-indigo-500" /> Metadane Mapy
                    </label>
                    <textarea
                      v-model="form.note"
                      class="docs-input flex-1 min-h-[300px] py-6 resize-none leading-relaxed"
                      placeholder="Wpisz tagi, skrypty lub notatki..."
                    ></textarea>
                  </div>
                </div>
              </Transition>
            </main>
          </div>

          <footer
            class="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-4 shrink-0"
          >
            <button
              class="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
              @click="emit('close')"
            >
              Anuluj
            </button>
            <button
              class="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest"
              @click="handleSave"
            >
              {{ editMode ? 'Zapisz zmiany' : 'Stwórz mapę' }}
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>

.docs-input {
  @apply w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition-all duration-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-slate-300;
}

.pixelated {
  image-rendering: pixelated;
}

/* Scrollbar Customization */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.page-fade-enter-active {
  transition: all 0.3s ease-out;
}
.page-fade-leave-active {
  transition: all 0.2s ease-in;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.animate-slide-in {
  animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
