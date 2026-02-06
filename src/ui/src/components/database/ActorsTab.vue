<script setup lang="ts">
import { ref, computed, watch, CSSProperties } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import {
  IconPlus,
  IconSearch,
  IconStar,
  IconUser,
  IconTrash,
  IconId,
  IconChartBar,
  IconPhoto
} from '@tabler/icons-vue'
import { ProjectService } from '../../services/ProjectService'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import CharacterSelector from '../modal/CharacterSelector.vue'

const db = useDatabaseStore()
const selectedId = ref<number>(db.actors[0]?.id || 0)
const searchQuery = ref('')
const showCharacterSelector = ref(false)
const characterSelectType = ref<'character' | 'face'>('character')

// --- PREVIEW STATE ---
const previewMetadata = ref({
  frameW: 48,
  frameH: 48,
  idleCol: 0,
  isLoaded: false
})

// --- COMPUTED ---
const filteredActors = computed(() => {
  if (!searchQuery.value) return db.actors
  const query = searchQuery.value.toLowerCase()
  return db.actors.filter((a) => a.name.toLowerCase().includes(query))
})

const selectedActor = computed(() => db.actors.find((a) => a.id === selectedId.value))
const selectedClass = computed(() => db.classes.find((c) => c.id === selectedActor.value?.classId))

// --- ACTIONS ---
const handleAdd = (): void => {
  db.addActor()
  const last = db.actors[db.actors.length - 1]
  if (last) selectedId.value = last.id
}

const handleDelete = (): void => {
  if (confirm('Are you sure you want to delete this actor?')) {
    db.deleteActor(selectedId.value)
    if (db.actors.length > 0) selectedId.value = db.actors[0].id
  }
}

// --- STATS LOGIC ---
const paramNames = ['MHP', 'MMP', 'ATK', 'DEF', 'MAT', 'MDF', 'AGI', 'LUK']
// Limity do wizualizacji pasków (tylko wizualne)
const paramLimits = [9999, 9999, 999, 999, 999, 999, 999, 999]

const getInheritedStat = (index: number): number => {
  const classStat = selectedClass.value?.params[index] || 0
  const bonus = selectedActor.value?.baseParams[index] || 0
  return classStat + bonus
}

const updateBaseParam = (index: number, value: number): void => {
  if (selectedActor.value) {
    selectedActor.value.baseParams[index] = value
    db.save('Actors.json', db.actors)
  }
}

// --- ASSET HELPERS ---
const getCharacterUrl = (filename: string): string => ProjectService.resolveAssetUrl(filename)

const openCharacterSelector = (type: 'character' | 'face'): void => {
  characterSelectType.value = type
  showCharacterSelector.value = true
}

const onSelectCharacter = (selection: any): void => {
  if (!selectedActor.value) return

  if (characterSelectType.value === 'character') {
    selectedActor.value.character = `img/characters/${selection.tilesetId}`
    const snapX = selection.divW % 3 === 0 ? 3 : selection.divW % 4 === 0 ? 4 : 1
    const snapY = selection.divH % 4 === 0 ? 4 : 1
    selectedActor.value.characterX = Math.floor((selection.x || 0) / snapX) * snapX
    selectedActor.value.characterY = Math.floor((selection.y || 0) / snapY) * snapY
    selectedActor.value.characterSrcX = selection.pixelX
    selectedActor.value.characterSrcY = selection.pixelY
    selectedActor.value.characterSrcW = selection.pixelW
    selectedActor.value.characterSrcH = selection.pixelH
  } else {
    selectedActor.value.face = `${selection.tilesetId}`
    selectedActor.value.faceX = selection.x || 0
    selectedActor.value.faceY = selection.y || 0
    selectedActor.value.faceSrcX = selection.pixelX
    selectedActor.value.faceSrcY = selection.pixelY
    selectedActor.value.faceSrcW = selection.pixelW
    selectedActor.value.faceSrcH = selection.pixelH
  }
  db.save('Actors.json', db.actors)
  showCharacterSelector.value = false
}

// --- SPRITE PREVIEW LOGIC ---
watch(
  () => [
    selectedActor.value?.character,
    selectedActor.value?.characterX,
    selectedActor.value?.characterY
  ],
  async ([char]) => {
    if (!char) {
      previewMetadata.value.isLoaded = false
      return
    }
    try {
      const url = getCharacterUrl(char as string)
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })

      const { frameW, frameH, divW } = SpriteUtils.getFrameRect(
        {
          assetId: char as string,
          group: 'character',
          x: selectedActor.value!.characterX,
          y: selectedActor.value!.characterY,
          w: 0,
          h: 0,
          srcW: selectedActor.value!.characterSrcW,
          srcH: selectedActor.value!.characterSrcH
        },
        { width: img.naturalWidth, height: img.naturalHeight }
      )

      previewMetadata.value = {
        frameW,
        frameH,
        idleCol: SpriteUtils.getIdleFrameIndex(divW),
        isLoaded: true
      }
    } catch {
      previewMetadata.value.isLoaded = false
    }
  },
  { immediate: true }
)

const characterPreviewStyle = computed(() => {
  if (!selectedActor.value?.character || !previewMetadata.value.isLoaded) return {}
  const actor = selectedActor.value
  const meta = previewMetadata.value
  const srcX = (actor.characterX + meta.idleCol) * meta.frameW
  const srcY = actor.characterY * meta.frameH

  return {
    width: `${meta.frameW}px`,
    height: `${meta.frameH}px`,
    backgroundImage: `url('${getCharacterUrl(actor.character)}')`,
    backgroundPosition: `-${srcX}px -${srcY}px`,
    transform: 'scale(1.5)',
    imageRendering: 'pixelated' as const
  }
})

// Obliczanie wycinka twarzy dla listy (Sidebar)
const getFaceStyle = (actor: any): CSSProperties => {
  if (!actor.face) return {}
  const url = getCharacterUrl(actor.face)
  return {
    backgroundImage: `url('${url}')`,
    backgroundPosition: `-${actor.faceSrcX || 0}px -${actor.faceSrcY || 0}px`,
    backgroundSize: 'auto', // Kluczowe, bo używamy spritesheet
    width: '100%',
    height: '100%'
  }
}
</script>

<template>
  <div class="flex h-full bg-white text-slate-900">
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Roster</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-500 transition-all"
            title="Add Actor"
            @click="handleAdd"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>

        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Filter actors..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="actor in filteredActors"
          :key="actor.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === actor.id
              ? 'bg-white border-blue-200 shadow-md shadow-blue-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = actor.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-100 relative shadow-inner"
          >
            <div
              v-if="actor.face"
              class="w-full h-full pixelated"
              :style="getFaceStyle(actor)"
            ></div>
            <IconUser v-else :size="20" class="absolute inset-0 m-auto text-slate-400 opacity-50" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === actor.id ? 'text-blue-700' : 'text-slate-700'"
              >
                {{ actor.name || 'Unnamed' }}
              </span>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                ID:{{ actor.id }}
              </span>
            </div>
            <div class="text-[10px] text-slate-400 truncate">
              {{ db.classes.find((c) => c.id === actor.classId)?.name || 'No Class' }}
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-200 bg-slate-50/50">
        <button
          class="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
          @click="handleDelete"
        >
          <IconTrash :size="14" />
          Delete Actor
        </button>
      </div>
    </div>

    <div v-if="selectedActor" class="flex-1 flex flex-col h-full overflow-hidden relative">
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="max-w-5xl mx-auto p-10">
          <div class="flex flex-col md:flex-row gap-8 mb-12">
            <div class="flex flex-col gap-6 shrink-0">
              <div class="group relative">
                <div
                  class="w-40 h-40 bg-slate-100 rounded-4xl border-2 border-slate-200 overflow-hidden shadow-sm relative checkerboard"
                >
                  <img
                    v-if="selectedActor.face"
                    :src="getCharacterUrl(selectedActor.face)"
                    class="w-full h-full object-cover pixelated"
                    :style="{
                      objectPosition: `-${selectedActor.faceSrcX}px -${selectedActor.faceSrcY}px`
                    }"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
                    <IconPhoto :size="48" />
                  </div>

                  <div
                    class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                    @click="openCharacterSelector('face')"
                  >
                    <span
                      class="px-3 py-1.5 bg-white rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-lg"
                      >Change Face</span
                    >
                  </div>
                </div>

                <div
                  v-if="selectedActor.id === 1"
                  class="absolute -top-3 -right-3 w-8 h-8 bg-amber-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-amber-400/40 ring-4 ring-white z-10"
                  title="Main Hero"
                >
                  <IconStar :size="16" class="fill-current" />
                </div>
              </div>

              <div class="group relative">
                <div
                  class="w-40 h-24 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative checkerboard flex items-center justify-center"
                >
                  <div v-if="selectedActor?.character" :style="characterPreviewStyle"></div>
                  <IconUser v-else :size="32" class="text-slate-300" />

                  <div
                    class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                    @click="openCharacterSelector('character')"
                  >
                    <span
                      class="px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-lg"
                      >Sprite</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <div class="flex-1 space-y-6">
              <div class="grid grid-cols-2 gap-6">
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >Name</label
                  >
                  <input
                    v-model="selectedActor.name"
                    type="text"
                    class="w-full text-2xl font-black text-slate-900 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1 transition-colors placeholder:text-slate-200"
                    placeholder="Hero Name"
                    @input="db.save('Actors.json', db.actors)"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                    >Nickname</label
                  >
                  <input
                    v-model="selectedActor.nickname"
                    type="text"
                    class="w-full text-xl font-bold text-slate-500 bg-transparent border-b-2 border-slate-100 focus:border-blue-500 outline-none py-1.5 transition-colors placeholder:text-slate-200"
                    placeholder="The Brave"
                    @input="db.save('Actors.json', db.actors)"
                  />
                </div>
              </div>

              <div
                class="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 grid grid-cols-12 gap-6"
              >
                <div class="col-span-6 space-y-1.5">
                  <label
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
                  >
                    <IconId :size="12" /> Class
                  </label>
                  <select
                    v-model="selectedActor.classId"
                    class="w-full bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                    @change="db.save('Actors.json', db.actors)"
                  >
                    <option v-for="c in db.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <div class="col-span-3 space-y-1.5">
                  <label
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block"
                    >Start Lv</label
                  >
                  <input
                    v-model="selectedActor.initialLevel"
                    type="number"
                    min="1"
                    max="99"
                    class="w-full bg-white border border-slate-200 text-slate-900 text-sm font-bold rounded-lg px-2 py-2 text-center outline-none focus:border-blue-400"
                    @input="db.save('Actors.json', db.actors)"
                  />
                </div>
                <div class="col-span-3 space-y-1.5">
                  <label
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block"
                    >Max Lv</label
                  >
                  <input
                    v-model="selectedActor.maxLevel"
                    type="number"
                    min="1"
                    max="99"
                    class="w-full bg-white border border-slate-200 text-slate-900 text-sm font-bold rounded-lg px-2 py-2 text-center outline-none focus:border-blue-400"
                    @input="db.save('Actors.json', db.actors)"
                  />
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                  >Biography</label
                >
                <textarea
                  v-model="selectedActor.profile"
                  class="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-600 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none resize-none transition-all"
                  placeholder="Write a backstory..."
                  @input="db.save('Actors.json', db.actors)"
                ></textarea>
              </div>
            </div>
          </div>

          <div class="mb-10">
            <div class="flex items-center gap-3 mb-6">
              <div class="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                <IconChartBar :size="16" />
              </div>
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide">
                Base Parameters
              </h3>
              <div class="h-px bg-slate-200 flex-1"></div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div v-for="(name, index) in paramNames" :key="name" class="relative group">
                <div
                  class="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div class="flex justify-between items-start mb-2">
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{
                      name
                    }}</span>
                    <span class="text-[10px] font-mono text-green-500" title="Class Base"
                      >+{{ selectedClass?.params[index] || 0 }}</span
                    >
                  </div>

                  <div class="flex items-baseline gap-1 mb-3">
                    <span class="text-2xl font-black text-slate-800 tracking-tight">{{
                      getInheritedStat(index)
                    }}</span>
                  </div>

                  <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                      class="h-full bg-blue-500 rounded-full"
                      :style="{
                        width: `${Math.min(100, (getInheritedStat(index) / paramLimits[index]) * 100)}%`
                      }"
                    ></div>
                  </div>

                  <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <label class="text-[9px] font-bold text-slate-400 uppercase">Bonus</label>
                    <input
                      type="number"
                      :value="selectedActor.baseParams[index]"
                      class="flex-1 bg-slate-50 text-right text-xs font-bold text-slate-700 py-1 px-2 rounded hover:bg-white border border-transparent hover:border-slate-200 focus:border-blue-400 outline-none transition-all"
                      @input="
                        (e) =>
                          updateBaseParam(index, parseInt((e.target as HTMLInputElement).value))
                      "
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="p-8 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity"
          >
            <div
              class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3"
            >
              <IconStar :size="24" class="text-slate-300" />
            </div>
            <h4 class="text-sm font-bold text-slate-900">Traits & Resistances</h4>
            <p class="text-xs text-slate-500 mt-1 max-w-sm">
              This module is under construction. Soon you will be able to configure elemental
              affinities and state resistances here.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center mb-4">
        <IconUser :size="40" class="opacity-50" />
      </div>
      <span class="text-sm font-bold text-slate-400">No Actor Selected</span>
    </div>

    <CharacterSelector
      v-if="showCharacterSelector"
      :initial-tileset-id="
        characterSelectType === 'character' ? selectedActor?.character : selectedActor?.face
      "
      :initial-x="
        characterSelectType === 'character' ? selectedActor?.characterX : selectedActor?.faceX
      "
      :initial-y="
        characterSelectType === 'character' ? selectedActor?.characterY : selectedActor?.faceY
      "
      :initial-pixel-w="
        characterSelectType === 'character' ? selectedActor?.characterSrcW : selectedActor?.faceSrcW
      "
      :initial-pixel-h="
        characterSelectType === 'character' ? selectedActor?.characterSrcH : selectedActor?.faceSrcH
      "
      @close="showCharacterSelector = false"
      @select="onSelectCharacter"
    />
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}

.checkerboard {
  background-image:
    linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
    linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
    linear-gradient(-45deg, transparent 75%, #f1f5f9 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
