<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { ref, computed, onMounted, watch } from 'vue'
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconMusic,
  IconStar,
  IconPlayerPlay,
  IconSettings
} from '@tabler/icons-vue'
import { useDatabaseStore } from '@ui/stores/database'
import { ProjectService } from '../../services/ProjectService'

const store = useEditorStore()
const db = useDatabaseStore()

// --- SWITCHES & VARIABLES LOGIC ---
const maxSwitches = ref(50)
const maxVariables = ref(50)
const searchSwitches = ref('')
const searchVariables = ref('')

const ensureSize = (arr: string[], size: number): void => {
  if (arr.length < size) {
    const originalLength = arr.length
    arr.length = size
    arr.fill('', originalLength)
  }
}

// Ensure initial sizes
ensureSize(store.systemSwitches, maxSwitches.value)
ensureSize(store.systemVariables, maxVariables.value)

const onResize = (): void => {
  ensureSize(store.systemSwitches, maxSwitches.value)
  ensureSize(store.systemVariables, maxVariables.value)
}

const loadMoreSwitches = (): void => {
  maxSwitches.value += 20
  onResize()
}

const loadMoreVariables = (): void => {
  maxVariables.value += 20
  onResize()
}

const filteredSwitches = computed(() => {
  const query = searchSwitches.value.toLowerCase()
  return store.systemSwitches
    .map((name, index) => ({ name, index }))
    .filter((item) => {
      if (!query) return true
      const idStr = String(item.index + 1)
      return idStr.includes(query) || item.name.toLowerCase().includes(query)
    })
})

const filteredVariables = computed(() => {
  const query = searchVariables.value.toLowerCase()
  return store.systemVariables
    .map((name, index) => ({ name, index }))
    .filter((item) => {
      if (!query) return true
      const idStr = String(item.index + 1)
      return idStr.includes(query) || item.name.toLowerCase().includes(query)
    })
})

// --- STARTING PARTY LOGIC ---
const addPartyMember = (): void => {
  const firstActor = db.actors[0]
  if (firstActor) {
    store.systemStartingParty.push(firstActor.id)
  }
}

const removePartyMember = (index: number): void => {
  store.systemStartingParty.splice(index, 1)
}

// --- AUDIO LOGIC ---
const bgmFiles = ref<string[]>([])
const seFiles = ref<string[]>([])

const loadAudioFiles = async (): Promise<void> => {
  bgmFiles.value = await ProjectService.getProjectFiles('audio/bgm')
  seFiles.value = await ProjectService.getProjectFiles('audio/se')
}

type SoundKey = keyof typeof store.systemSounds
const audioCategories: Record<SoundKey, { label: string; type: 'bgm' | 'se' }> = {
  cursor: { label: 'Cursor Movement', type: 'se' },
  ok: { label: 'Decision (OK)', type: 'se' },
  cancel: { label: 'Cancelation', type: 'se' },
  buzzer: { label: 'Buzzer (Error)', type: 'se' },
  save: { label: 'Save Game', type: 'se' },
  load: { label: 'Load Game', type: 'se' },
  titleBGM: { label: 'Title Screen', type: 'bgm' },
  battleBGM: { label: 'Battle Theme', type: 'bgm' }
}

const playPreview = (key: SoundKey): void => {
  const sound = store.systemSounds[key]
  if (!sound || !sound.name) return

  const folder = audioCategories[key].type === 'bgm' ? 'audio/bgm' : 'audio/se'
  const url = ProjectService.resolveAssetUrl(`${folder}/${sound.name}`)

  const audio = new Audio(url)
  audio.volume = sound.volume / 100
  audio.playbackRate = sound.pitch / 100
  audio.play().catch((err) => {
    console.warn(`[SystemTab] Failed to play preview for ${key}:`, err)
  })
}

watch(
  () => store.isProjectLoaded,
  (loaded) => {
    if (loaded) loadAudioFiles()
  }
)

onMounted(() => {
  if (store.isProjectLoaded) loadAudioFiles()
})
</script>

<template>
  <div
    class="w-full h-full flex flex-col overflow-hidden text-[13px] text-gray-800 bg-white select-none"
  >
    <!-- Header -->
    <div
      class="px-8 py-6 border-b border-gray-100 bg-white/50 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between"
    >
      <div>
        <h2 class="text-2xl font-bold text-gray-900 tracking-tight">System Configuration</h2>
        <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">
          Starting conditions & system feedback settings
        </p>
      </div>
      <div class="flex gap-3">
        <div
          class="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-2"
        >
          <span
            class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]"
          ></span>
          <span class="text-[10px] font-black uppercase tracking-widest text-slate-500"
            >Auto-Saving Enabled</span
          >
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-hidden flex">
      <!-- Left Column: General & Party -->
      <div
        class="w-[380px] flex flex-col border-r border-gray-100 bg-gray-50/30 overflow-y-auto scrollbar-thin"
      >
        <!-- General Section -->
        <section class="p-8 space-y-8 border-b border-gray-100">
          <div class="flex items-center gap-2 mb-2">
            <div
              class="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shadow-lg shadow-black/10"
            >
              <IconSettings size="18" />
            </div>
            <h3 class="font-black text-gray-900 uppercase tracking-widest text-[11px]">
              General Settings
            </h3>
          </div>

          <div class="grid grid-cols-1 gap-6">
            <div class="space-y-4">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Player Start Map</label
                >
                <div class="flex items-center gap-3">
                  <input
                    v-model.number="store.systemStartMapId"
                    type="number"
                    class="flex-1 px-4 py-2.5 bg-white border border-slate-100 rounded-xl focus:border-black/20 outline-none transition-all"
                    placeholder="Map ID"
                  />
                  <div
                    class="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black"
                  >
                    #{{ store.systemStartMapId }}
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >Spawn X</label
                  >
                  <input
                    v-model.number="store.systemStartX"
                    type="number"
                    class="px-4 py-2.5 bg-white border border-slate-100 rounded-xl focus:border-black/20 outline-none transition-all"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >Spawn Y</label
                  >
                  <input
                    v-model.number="store.systemStartY"
                    type="number"
                    class="px-4 py-2.5 bg-white border border-slate-100 rounded-xl focus:border-black/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div class="space-y-2 pt-4">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Screen Properties</label
                >
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <span class="text-[10px] text-slate-500 font-medium ml-1">Width</span>
                    <input
                      v-model.number="store.systemScreenWidth"
                      type="number"
                      class="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl outline-none"
                    />
                  </div>
                  <div class="space-y-1">
                    <span class="text-[10px] text-slate-500 font-medium ml-1">Height</span>
                    <input
                      v-model.number="store.systemScreenHeight"
                      type="number"
                      class="w-full px-4 py-2 bg-white border border-slate-100 rounded-xl outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Starting Party Section -->
        <section class="p-8 flex-1">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shadow-lg shadow-black/10"
              >
                <IconStar size="18" />
              </div>
              <h3 class="font-black text-gray-900 uppercase tracking-widest text-[11px]">
                Starting Party
              </h3>
            </div>
            <button
              class="p-1.5 bg-slate-900 text-white rounded-lg hover:scale-110 active:scale-95 transition-all"
              @click="addPartyMember"
            >
              <IconPlus size="14" stroke-width="3" />
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="(_, index) in store.systemStartingParty"
              :key="index"
              class="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between group hover:border-black/10 hover:shadow-sm transition-all"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-mono text-[10px] font-black text-slate-400 border border-slate-50 group-hover:bg-black group-hover:text-white transition-colors"
                >
                  {{ index + 1 }}
                </div>
                <select
                  v-model="store.systemStartingParty[index]"
                  class="bg-transparent border-none p-0 pr-4 text-[13px] font-bold text-slate-900 outline-none appearance-none cursor-pointer"
                >
                  <option v-for="actor in db.actors" :key="actor.id" :value="actor.id">
                    {{ actor.name }}
                  </option>
                </select>
              </div>
              <button
                class="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                @click="removePartyMember(index)"
              >
                <IconTrash size="16" />
              </button>
            </div>

            <div
              v-if="store.systemStartingParty.length === 0"
              class="py-12 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 opacity-60"
            >
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                No members assigned
              </p>
              <span class="text-[11px] text-slate-400 mt-1">Starting party will be empty.</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Center Column: Audio Settings -->
      <div class="flex-1 flex flex-col bg-white overflow-hidden">
        <div class="p-8 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shadow-lg shadow-black/10"
            >
              <IconMusic size="18" />
            </div>
            <h3 class="font-black text-gray-900 uppercase tracking-widest text-[11px]">
              System Audio
            </h3>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-8 scrollbar-thin">
          <div class="grid grid-cols-2 gap-6">
            <div
              v-for="(config, key) in audioCategories"
              :key="key"
              class="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-black/5 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all group"
            >
              <div class="flex items-center justify-between mb-6">
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">{{
                  config.label
                }}</span>
                <div class="flex gap-1.5">
                  <button
                    class="w-8 h-8 flex items-center justify-center bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-black hover:border-black/20 transition-all active:scale-90"
                    @click="playPreview(key as SoundKey)"
                  >
                    <IconPlayerPlay size="14" />
                  </button>
                </div>
              </div>

              <!-- File Selector -->
              <div class="space-y-4">
                <div class="relative">
                  <select
                    v-if="store.systemSounds[key as SoundKey]"
                    v-model="store.systemSounds[key as SoundKey].name"
                    class="w-full pl-4 pr-10 py-3 bg-white border border-slate-100 rounded-2xl text-[13px] font-bold text-slate-900 appearance-none outline-none focus:border-black/10 transition-all cursor-pointer"
                  >
                    <option value="">None</option>
                    <option
                      v-for="file in config.type === 'bgm' ? bgmFiles : seFiles"
                      :key="file"
                      :value="file"
                    >
                      {{ file }}
                    </option>
                  </select>
                  <IconMusic
                    size="16"
                    class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                  />
                </div>

                <!-- Volume Slider -->
                <div class="space-y-2">
                  <div
                    class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest"
                  >
                    <span class="text-slate-400">Volume</span>
                    <span class="text-slate-900"
                      >{{ store.systemSounds[key as SoundKey].volume }}%</span
                    >
                  </div>
                  <input
                    v-model.number="store.systemSounds[key as SoundKey].volume"
                    type="range"
                    min="0"
                    max="100"
                    class="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                <!-- Pitch Slider -->
                <div class="space-y-2">
                  <div
                    class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest"
                  >
                    <span class="text-slate-400">Pitch</span>
                    <span class="text-slate-900"
                      >{{ store.systemSounds[key as SoundKey].pitch }}%</span
                    >
                  </div>
                  <input
                    v-model.number="store.systemSounds[key as SoundKey].pitch"
                    type="range"
                    min="50"
                    max="150"
                    class="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Switches & Variables -->
      <div class="w-[480px] flex overflow-hidden border-l border-gray-100 divide-x divide-gray-100">
        <!-- Switches -->
        <div class="flex-1 flex flex-col bg-white">
          <div class="p-4 border-b border-gray-100 sticky top-0 z-10 bg-white/80 backdrop-blur">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-900">
                Switches
              </h4>
              <span class="text-[9px] font-mono text-slate-400"
                >#{{ store.systemSwitches.length }}</span
              >
            </div>
            <div class="relative">
              <IconSearch
                size="14"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                v-model="searchSwitches"
                type="text"
                placeholder="Search..."
                class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border-none rounded-lg text-[11px] outline-none focus:bg-slate-100 transition-all font-medium"
              />
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
            <div
              v-for="item in filteredSwitches"
              :key="item.index"
              class="flex items-center gap-3 p-1 rounded-lg hover:bg-slate-50 transition-all group"
            >
              <span
                class="w-8 text-right font-mono text-[10px] text-slate-300 group-hover:text-slate-900 transition-colors"
                >{{ String(item.index + 1).padStart(3, '0') }}</span
              >
              <input
                v-model="store.systemSwitches[item.index]"
                class="flex-1 bg-transparent border-none p-0 text-[12px] font-bold text-slate-600 focus:text-slate-900 focus:ring-0 outline-none"
                placeholder="Unnamed Switch"
              />
            </div>
            <button
              v-if="!searchSwitches"
              class="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors pt-4 border-t border-slate-50"
              @click="loadMoreSwitches"
            >
              Load More
            </button>
          </div>
        </div>

        <!-- Variables -->
        <div class="flex-1 flex flex-col bg-white">
          <div class="p-4 border-b border-gray-100 sticky top-0 z-10 bg-white/80 backdrop-blur">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-900">
                Variables
              </h4>
              <span class="text-[9px] font-mono text-slate-400"
                >#{{ store.systemVariables.length }}</span
              >
            </div>
            <div class="relative">
              <IconSearch
                size="14"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                v-model="searchVariables"
                type="text"
                placeholder="Search..."
                class="w-full pl-9 pr-3 py-1.5 bg-slate-50 border-none rounded-lg text-[11px] outline-none focus:bg-slate-100 transition-all font-medium"
              />
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
            <div
              v-for="item in filteredVariables"
              :key="item.index"
              class="flex items-center gap-3 p-1 rounded-lg hover:bg-slate-50 transition-all group"
            >
              <span
                class="w-8 text-right font-mono text-[10px] text-slate-300 group-hover:text-slate-900 transition-colors"
                >{{ String(item.index + 1).padStart(3, '0') }}</span
              >
              <input
                v-model="store.systemVariables[item.index]"
                class="flex-1 bg-transparent border-none p-0 text-[12px] font-bold text-slate-600 focus:text-slate-900 focus:ring-0 outline-none"
                placeholder="Unnamed Var"
              />
            </div>
            <button
              v-if="!searchVariables"
              class="w-full py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-black transition-colors pt-4 border-t border-slate-50"
              @click="loadMoreVariables"
            >
              Load More
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scrollbar Stylings */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* Range Input Styling */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: black;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: -4px;
}

input[type='range']::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #f1f5f9;
  border-radius: 2px;
}

select {
  background-image: none !important;
}
</style>
