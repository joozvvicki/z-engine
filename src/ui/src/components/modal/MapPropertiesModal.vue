<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { ProjectService } from '@ui/services/ProjectService'
import {
  IconMapPlus,
  IconX,
  IconDimensions,
  IconTextCaption,
  IconGridDots
} from '@tabler/icons-vue'

const store = useEditorStore()
const emit = defineEmits(['close'])

const props = defineProps<{
  isOpen: boolean
  editMode?: boolean
  mapId?: number | null
}>()

const TILESET_SLOTS = ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'Roofs']

const form = reactive({
  name: 'Nowa Mapa',
  width: 20,
  height: 15,
  tilesetConfig: {} as Record<string, string>
})

// Initialize form when opening
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      store.refreshTilesetList() // Refresh file list from project
      // Clear/Reset the config object with all slots
      const cleanConfig: Record<string, string> = {}
      TILESET_SLOTS.forEach((slot) => (cleanConfig[slot] = ''))

      if (props.editMode && props.mapId) {
        const map = store.maps.find((m) => m.id === props.mapId)
        if (map) {
          form.name = map.name
          form.width = map.width
          form.height = map.height
          // Merge existing config into our clean slate
          if (map.tilesetConfig) {
            Object.assign(cleanConfig, map.tilesetConfig)
          }
        }
      } else {
        form.name = 'Nowa Mapa'
        form.width = 20
        form.height = 15
      }
      form.tilesetConfig = cleanConfig
    }
  }
)

const handleSave = (): void => {
  if (form.name.trim() && form.width > 0 && form.height > 0) {
    // Filter out empty strings before saving to keep the objects clean
    const finalConfig: Record<string, string> = {}
    Object.entries(form.tilesetConfig).forEach(([slot, url]) => {
      if (url) finalConfig[slot] = url
    })

    if (props.editMode && props.mapId) {
      store.updateMapProperties(props.mapId, {
        name: form.name,
        width: form.width,
        height: form.height,
        tilesetConfig: finalConfig
      })
    } else {
      store.createMap(form.name, form.width, form.height, finalConfig)
    }
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-100 flex items-center justify-center bg-white/20 backdrop-blur-sm p-4"
    >
      <div
        class="w-full max-w-2xl bg-white border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div
          class="flex items-center justify-between p-4 border-b border-white/5 bg-white/5 shrink-0"
        >
          <div class="flex items-center gap-3 text-blue-400">
            <IconMapPlus size="24" />
            <h2 class="font-bold uppercase tracking-wider text-sm text-black">
              {{ editMode ? 'Edytuj Mapę' : 'Nowa Mapa' }}
            </h2>
          </div>
          <button class="text-black hover:text-gray-600 transition-colors" @click="emit('close')">
            <IconX size="20" />
          </button>
        </div>

        <div class="p-6 space-y-6 overflow-y-auto scrollbar-thin">
          <div class="space-y-2">
            <label class="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
              <IconTextCaption size="14" /> Nazwa Mapy
            </label>
            <input
              v-model="form.name"
              type="text"
              class="w-full bg-black/10 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-600 focus:border-blue-500 outline-none transition-all"
              placeholder="np. Las Elfów..."
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                <IconDimensions size="14" /> Szerokość
              </label>
              <input
                v-model.number="form.width"
                type="number"
                class="w-full bg-black/10 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-600 focus:border-blue-500 outline-none"
              />
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                <IconDimensions size="14" /> Wysokość
              </label>
              <input
                v-model.number="form.height"
                type="number"
                class="w-full bg-black/10 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-600 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <!-- Tileset Selection -->
          <div class="space-y-2">
            <label class="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
              <IconGridDots size="14" /> Konfiguracja Tilesetów (RPG Maker Style)
            </label>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/5 p-4 rounded-lg border border-black/5"
            >
              <div v-for="slot in TILESET_SLOTS" :key="slot" class="flex flex-col gap-1">
                <label class="text-[9px] font-bold text-gray-400 uppercase">{{ slot }}</label>
                <div class="flex gap-2 items-center">
                  <select
                    v-model="form.tilesetConfig[slot]"
                    class="flex-1 bg-white border border-black/10 rounded px-2 py-1.5 text-xs text-gray-600 outline-none focus:border-blue-500"
                  >
                    <option value="">(Domyślny)</option>
                    <option
                      v-for="file in store.tilesetFileList"
                      :key="file.relativePath"
                      :value="file.relativePath"
                    >
                      {{ file.name }}
                    </option>
                  </select>
                  <div
                    v-if="form.tilesetConfig[slot]"
                    class="w-8 h-8 rounded border border-black/10 overflow-hidden bg-white shrink-0 shadow-sm"
                  >
                    <img
                      :src="ProjectService.resolveAssetUrl(form.tilesetConfig[slot])"
                      class="w-full h-full object-cover pixelated"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="p-3 bg-blue-500/20 border border-blue-500/80 rounded-lg">
            <p class="text-[10px] text-blue-400 leading-relaxed italic">
              Wskazówka: Zmiana rozmiaru mapy może spowodować przycięcie istniejących elementów,
              jeśli nowa mapa jest mniejsza. Każdy slot (A1, B, etc.) może mieć przypisany dowolny
              plik .png z folderu assets.
            </p>
          </div>
        </div>

        <div class="p-4 bg-white/5 border-t border-white/5 flex gap-3 shrink-0">
          <button
            class="flex-1 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/5 rounded-lg transition-colors uppercase cursor-pointer"
            @click="emit('close')"
          >
            Anuluj
          </button>
          <button
            class="flex-2 py-2.5 text-xs font-bold bg-black hover:bg-gray-700 text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 uppercase cursor-pointer"
            @click="handleSave"
          >
            {{ editMode ? 'Zapisz Zmiany' : 'Zatwierdź' }}
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
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}
</style>
