<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
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

const form = reactive({
  name: 'Nowa Mapa',
  width: 20,
  height: 15,
  tilesets: [] as string[]
})

// Initialize form when opening in Edit Mode
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.editMode && props.mapId) {
        const map = store.maps.find((m) => m.id === props.mapId)
        if (map) {
          form.name = map.name
          form.width = map.width
          form.height = map.height
          form.tilesets = map.tilesets ? [...map.tilesets] : []
          // Default to all basic tilesets if empty (legacy support)
          if (form.tilesets.length === 0) {
            form.tilesets = store.tilesets.map((t) => t.id)
          }
        }
      } else {
        // Reset for Create Mode
        form.name = 'Nowa Mapa'
        form.width = 20
        form.height = 15
        // Default: Select All Basic Tilesets
        form.tilesets = ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'Roofs']
      }
    }
  }
)

const handleSave = (): void => {
  if (form.name.trim() && form.width > 0 && form.height > 0) {
    if (props.editMode && props.mapId) {
      store.updateMapProperties(props.mapId, {
        name: form.name,
        width: form.width,
        height: form.height,
        tilesets: form.tilesets
      })
    } else {
      store.createMap(form.name, form.width, form.height, form.tilesets)
    }
    emit('close')
  }
}

const toggleTileset = (id: string): void => {
  if (form.tilesets.includes(id)) {
    form.tilesets = form.tilesets.filter((t) => t !== id)
  } else {
    form.tilesets.push(id)
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
        class="w-full max-w-lg bg-white border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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

        <div class="p-6 space-y-6 overflow-y-auto">
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
              <IconGridDots size="14" /> Dostępne Tilesety
            </label>
            <div class="grid grid-cols-4 gap-2 bg-black/5 p-2 rounded-lg border border-black/5">
              <div
                v-for="ts in store.tilesets"
                :key="ts.id"
                :class="[
                  'cursor-pointer px-2 py-1.5 rounded text-xs text-center border transition-all select-none',
                  form.tilesets.includes(ts.id)
                    ? 'bg-blue-500 text-white border-blue-600 font-bold shadow-sm'
                    : 'bg-white text-gray-500 border-transparent hover:bg-gray-100'
                ]"
                @click="toggleTileset(ts.id)"
              >
                {{ ts.id }}
              </div>
            </div>
          </div>

          <div class="p-3 bg-blue-500/20 border border-blue-500/80 rounded-lg">
            <p class="text-[10px] text-blue-400 leading-relaxed italic">
              Wskazówka: Zmiana rozmiaru mapy może spowodować przycięcie istniejących elementów,
              jeśli nowa mapa jest mniejsza.
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
            {{ editMode ? 'Zapisz Zmiany' : 'Stwórz Projekt' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
