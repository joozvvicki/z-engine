<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { useDatabaseStore } from '@ui/stores/database'
import { ProjectService } from '../services/ProjectService'
import { ref, watch, onMounted } from 'vue'
import {
  IconSettings,
  IconUsers,
  IconMusic,
  IconDatabase,
  IconDeviceGamepad,
  IconMapPin,
  IconPlus,
  IconX,
  IconPlayerPlay,
  IconVolume,
  IconSearch,
  IconDeviceFloppy
} from '@tabler/icons-vue'

const store = useEditorStore()
const db = useDatabaseStore()

// --- NAVIGATION ---
type SystemTab = 'general' | 'party' | 'audio' | 'data'
const activeTab = ref<SystemTab>('general')

const menuItems = [
  {
    id: 'general',
    label: 'General Settings',
    icon: IconSettings,
    desc: 'Title, Resolution, Start'
  },
  { id: 'party', label: 'Starting Party', icon: IconUsers, desc: 'Initial actors & inventory' },
  { id: 'audio', label: 'Audio System', icon: IconMusic, desc: 'BGM and Sound Effects' },
  { id: 'data', label: 'Game Data', icon: IconDatabase, desc: 'Switches & Variables' }
]

// --- PARTY LOGIC ---
const addPartyMember = (): void => {
  if (db.actors.length > 0) store.systemStartingParty.push(db.actors[0].id)
}
const removePartyMember = (index: number): void => {
  store.systemStartingParty.splice(index, 1)
}
const getActorFace = (actorId: number): string | null => {
  const actor = db.actors.find((a) => a.id === actorId)
  if (!actor?.face) return null
  return ProjectService.resolveAssetUrl(actor.face)
}
const getActorFacePos = (actorId: number): { x: number; y: number } => {
  const actor = db.actors.find((a) => a.id === actorId)
  return { x: actor?.faceSrcX || 0, y: actor?.faceSrcY || 0 }
}

// --- AUDIO LOGIC ---
const bgmFiles = ref<string[]>([])
const seFiles = ref<string[]>([])

const loadAudioFiles = async (): Promise<void> => {
  bgmFiles.value = await ProjectService.getProjectFiles('audio/bgm')
  seFiles.value = await ProjectService.getProjectFiles('audio/se')
}

const playPreview = (key: string, type: 'bgm' | 'se'): void => {
  const sound = store.systemSounds[key]
  if (!sound?.name) return
  const folder = type === 'bgm' ? 'audio/bgm' : 'audio/se'
  const url = ProjectService.resolveAssetUrl(`${folder}/${sound.name}`)
  const audio = new Audio(url)
  audio.volume = sound.volume / 100
  audio.play()
}

// --- DATA LOGIC (Switches/Vars) ---
const dataSearch = ref('')
const maxDataItems = ref(50)

const ensureSize = (arr: string[]): void => {
  if (arr.length < maxDataItems.value) {
    const originalLength = arr.length
    arr.length = maxDataItems.value
    arr.fill('', originalLength)
  }
}

const loadMoreData = (): void => {
  maxDataItems.value += 20
  ensureSize(store.systemSwitches)
  ensureSize(store.systemVariables)
}

const filterList = (source: string[]): { name: string; idx: number }[] => {
  const query = dataSearch.value.toLowerCase()
  return source
    .map((name, idx) => ({ name, idx }))
    .filter((item) => {
      if (!query) return true
      return String(item.idx + 1).includes(query) || item.name.toLowerCase().includes(query)
    })
}

// Watchers & Mount
watch(
  () => store.isProjectLoaded,
  (loaded) => {
    if (loaded) loadAudioFiles()
  }
)
watch(maxDataItems, () => {
  ensureSize(store.systemSwitches)
  ensureSize(store.systemVariables)
})
onMounted(() => {
  if (store.isProjectLoaded) loadAudioFiles()
  ensureSize(store.systemSwitches)
  ensureSize(store.systemVariables)
})
</script>

<template>
  <div class="flex w-full h-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
    <div class="w-64 flex flex-col bg-white border-r border-slate-200">
      <div class="p-6 pb-2">
        <h2 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">
          Configuration
        </h2>
        <nav class="space-y-1">
          <button
            v-for="item in menuItems"
            :key="item.id"
            class="w-full text-left px-3 py-3 rounded-xl transition-all group relative overflow-hidden"
            :class="
              activeTab === item.id
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            "
            @click="activeTab = item.id as SystemTab"
          >
            <div class="flex items-center gap-3 relative z-10">
              <component
                :is="item.icon"
                :size="20"
                :stroke-width="activeTab === item.id ? 2 : 1.5"
                :class="
                  activeTab === item.id
                    ? 'text-blue-400'
                    : 'text-slate-400 group-hover:text-slate-600'
                "
              />
              <div>
                <div class="text-sm font-bold leading-none">{{ item.label }}</div>
                <div
                  class="text-[10px] mt-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  :class="activeTab === item.id ? 'text-slate-400 opacity-100' : 'text-slate-400'"
                >
                  {{ item.desc }}
                </div>
              </div>
            </div>
          </button>
        </nav>
      </div>

      <div class="mt-auto p-6 border-t border-slate-100">
        <div class="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
          <IconDeviceFloppy class="text-blue-600 shrink-0" :size="20" />
          <div>
            <h4 class="text-xs font-bold text-blue-900">Auto-Save</h4>
            <p class="text-[10px] text-blue-700/70 mt-0.5 leading-tight">
              System settings are saved automatically on change.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-hidden relative">
      <div class="absolute inset-0 overflow-y-auto custom-scrollbar p-10">
        <div class="max-w-4xl mx-auto space-y-12 pb-20">
          <div v-if="activeTab === 'general'" class="animate-fade-in space-y-8">
            <div>
              <h1 class="text-2xl font-black text-slate-900 mb-2">General Settings</h1>
              <p class="text-slate-500 text-sm">Basic configuration for your game project.</p>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label
                class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block"
                >Game Title</label
              >
              <input
                v-model="store.systemProjectName"
                type="text"
                class="w-full text-3xl font-black text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-200 focus:ring-0 p-0"
                placeholder="Enter Game Title"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
              >
                <div class="absolute top-0 right-0 p-6 opacity-5">
                  <IconDeviceGamepad :size="100" />
                </div>
                <h3 class="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <IconDeviceGamepad :size="18" class="text-blue-500" /> Screen Resolution
                </h3>
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Width</label>
                    <input
                      v-model.number="store.systemScreenWidth"
                      type="number"
                      class="input-base"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Height</label>
                    <input
                      v-model.number="store.systemScreenHeight"
                      type="number"
                      class="input-base"
                    />
                  </div>
                </div>
              </div>

              <div
                class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
              >
                <div class="absolute top-0 right-0 p-6 opacity-5">
                  <IconMapPin :size="100" />
                </div>
                <h3 class="font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <IconMapPin :size="18" class="text-red-500" /> Starting Position
                </h3>
                <div class="flex gap-3 items-end">
                  <div class="space-y-1 flex-1">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Map ID</label>
                    <div
                      class="h-10 flex items-center px-3 bg-slate-50 rounded-lg border border-slate-200 font-mono font-bold text-slate-700"
                    >
                      #{{ store.systemStartMapId }}
                    </div>
                  </div>
                  <div class="space-y-1 w-20">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">X</label>
                    <input
                      v-model.number="store.systemStartX"
                      type="number"
                      class="input-base text-center"
                    />
                  </div>
                  <div class="space-y-1 w-20">
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Y</label>
                    <input
                      v-model.number="store.systemStartY"
                      type="number"
                      class="input-base text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'party'" class="animate-fade-in space-y-8">
            <div class="flex justify-between items-end">
              <div>
                <h1 class="text-2xl font-black text-slate-900 mb-2">Starting Party</h1>
                <p class="text-slate-500 text-sm">Define who the player starts with.</p>
              </div>
              <button
                class="btn-primary flex items-center gap-2"
                :disabled="store.systemStartingParty.length >= 4"
                @click="addPartyMember"
              >
                <IconPlus :size="16" /> Add Member
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              <div
                v-for="(actorId, index) in store.systemStartingParty"
                :key="index"
                class="relative group bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-6 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div
                  class="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 relative border border-slate-100"
                >
                  <div
                    v-if="getActorFace(actorId)"
                    class="w-full h-full pixelated"
                    :style="{
                      backgroundImage: `url('${getActorFace(actorId)}')`,
                      backgroundPosition: `-${getActorFacePos(actorId).x}px -${getActorFacePos(actorId).y}px`
                    }"
                  ></div>
                  <IconUsers v-else class="absolute inset-0 m-auto text-slate-300" :size="32" />

                  <div
                    class="absolute top-1 left-1 bg-black/80 text-white text-[9px] font-bold px-1.5 rounded"
                  >
                    {{ index + 1 }}
                  </div>
                </div>

                <div class="flex-1">
                  <label
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block"
                    >Actor</label
                  >
                  <div class="relative">
                    <select
                      v-model="store.systemStartingParty[index]"
                      class="w-full bg-slate-50 border-none rounded-lg font-bold text-slate-900 py-2 px-3 appearance-none outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option v-for="actor in db.actors" :key="actor.id" :value="actor.id">
                        {{ actor.name }}
                      </option>
                    </select>
                    <div
                      class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <button
                  class="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                  @click="removePartyMember(index)"
                >
                  <IconX :size="16" />
                </button>
              </div>

              <div
                v-if="store.systemStartingParty.length === 0"
                class="col-span-2 py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"
              >
                <IconUsers class="text-slate-300 mb-2" :size="32" />
                <p class="text-xs font-bold text-slate-400">No party members selected</p>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'audio'" class="animate-fade-in space-y-8">
            <div>
              <h1 class="text-2xl font-black text-slate-900 mb-2">Audio System</h1>
              <p class="text-slate-500 text-sm">Configure background music and sound effects.</p>
            </div>

            <div class="grid grid-cols-1 gap-12">
              <section>
                <h3
                  class="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900 mb-6"
                >
                  <div class="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <IconMusic :size="16" />
                  </div>
                  Background Music
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div v-for="key in ['titleBGM', 'battleBGM']" :key="key" class="audio-card">
                    <div class="flex justify-between items-center mb-3">
                      <span class="text-xs font-bold text-slate-500">{{
                        key === 'titleBGM' ? 'Title Screen' : 'Battle Theme'
                      }}</span>
                      <button class="play-btn" @click="playPreview(key, 'bgm')">
                        <IconPlayerPlay :size="14" class="fill-current" />
                      </button>
                    </div>
                    <div class="space-y-4">
                      <select
                        v-if="store.systemSounds[key]"
                        v-model="store.systemSounds[key].name"
                        class="select-base"
                      >
                        <option value="">(None)</option>
                        <option v-for="f in bgmFiles" :key="f" :value="f">{{ f }}</option>
                      </select>
                      <div class="flex gap-4">
                        <div class="flex-1 space-y-1">
                          <div class="flex justify-between text-[9px] font-bold text-slate-400">
                            <span>VOL</span><span>{{ store.systemSounds[key].volume }}</span>
                          </div>
                          <input
                            v-model.number="store.systemSounds[key].volume"
                            type="range"
                            class="range-slider"
                          />
                        </div>
                        <div class="flex-1 space-y-1">
                          <div class="flex justify-between text-[9px] font-bold text-slate-400">
                            <span>PITCH</span><span>{{ store.systemSounds[key].pitch }}</span>
                          </div>
                          <input
                            v-model.number="store.systemSounds[key].pitch"
                            type="range"
                            min="50"
                            max="150"
                            class="range-slider"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3
                  class="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-900 mb-6"
                >
                  <div class="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                    <IconVolume :size="16" />
                  </div>
                  Sound Effects
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div
                    v-for="key in ['cursor', 'ok', 'cancel', 'buzzer', 'save', 'load']"
                    :key="key"
                    class="audio-card"
                  >
                    <div class="flex justify-between items-center mb-3">
                      <span class="text-xs font-bold text-slate-500 capitalize">{{ key }}</span>
                      <button class="play-btn" @click="playPreview(key, 'se')">
                        <IconPlayerPlay :size="14" class="fill-current" />
                      </button>
                    </div>
                    <select
                      v-if="store.systemSounds[key]"
                      v-model="store.systemSounds[key].name"
                      class="select-base mb-3"
                    >
                      <option value="">(None)</option>
                      <option v-for="f in seFiles" :key="f" :value="f">{{ f }}</option>
                    </select>
                    <div class="flex gap-3">
                      <div class="flex-1">
                        <input
                          v-model.number="store.systemSounds[key].volume"
                          type="range"
                          class="range-slider"
                          title="Volume"
                        />
                      </div>
                      <div class="flex-1">
                        <input
                          v-model.number="store.systemSounds[key].pitch"
                          type="range"
                          min="50"
                          max="150"
                          class="range-slider"
                          title="Pitch"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div v-if="activeTab === 'data'" class="animate-fade-in flex flex-col h-full">
            <div class="flex justify-between items-end mb-6">
              <div>
                <h1 class="text-2xl font-black text-slate-900 mb-2">Game Data</h1>
                <p class="text-slate-500 text-sm">Global switches and variables used in events.</p>
              </div>
              <div class="relative">
                <IconSearch
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  :size="16"
                />
                <input
                  v-model="dataSearch"
                  type="text"
                  placeholder="Search ID or Name..."
                  class="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none w-64"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-8 h-full">
              <div
                class="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px]"
              >
                <div
                  class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"
                >
                  <h3 class="text-xs font-black uppercase tracking-widest text-blue-600">
                    Switches
                  </h3>
                  <span
                    class="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-400"
                    >{{ store.systemSwitches.length }}</span
                  >
                </div>
                <div class="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
                  <div
                    v-for="item in filterList(store.systemSwitches)"
                    :key="`s-${item.idx}`"
                    class="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-50 group"
                  >
                    <span class="font-mono text-[10px] text-slate-300 w-8 text-right">{{
                      String(item.idx + 1).padStart(3, '0')
                    }}</span>
                    <input
                      v-model="store.systemSwitches[item.idx]"
                      class="input-ghost"
                      placeholder="Unnamed Switch"
                    />
                  </div>
                  <button
                    class="w-full py-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    @click="loadMoreData"
                  >
                    Load More...
                  </button>
                </div>
              </div>

              <div
                class="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[600px]"
              >
                <div
                  class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"
                >
                  <h3 class="text-xs font-black uppercase tracking-widest text-emerald-600">
                    Variables
                  </h3>
                  <span
                    class="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-400"
                    >{{ store.systemVariables.length }}</span
                  >
                </div>
                <div class="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
                  <div
                    v-for="item in filterList(store.systemVariables)"
                    :key="`v-${item.idx}`"
                    class="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-50 group"
                  >
                    <span class="font-mono text-[10px] text-slate-300 w-8 text-right">{{
                      String(item.idx + 1).padStart(3, '0')
                    }}</span>
                    <input
                      v-model="store.systemVariables[item.idx]"
                      class="input-ghost"
                      placeholder="Unnamed Variable"
                    />
                  </div>
                  <button
                    class="w-full py-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    @click="loadMoreData"
                  >
                    Load More...
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-base {
  @apply w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-400 transition-all;
}
.input-ghost {
  @apply flex-1 bg-transparent text-xs font-bold text-slate-600 placeholder:text-slate-200 outline-none border-b border-transparent focus:border-blue-200 focus:text-blue-700 transition-all py-1;
}
.select-base {
  @apply w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-3 py-2 appearance-none outline-none focus:bg-white focus:border-blue-400 cursor-pointer;
}
.btn-primary {
  @apply px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-black hover:scale-105 active:scale-95 transition-all;
}
.audio-card {
  @apply bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all;
}
.play-btn {
  @apply w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-400 rounded-full hover:bg-blue-500 hover:text-white transition-all;
}
.range-slider {
  @apply w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded;
}
.pixelated {
  image-rendering: pixelated;
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
