<script setup lang="ts">
import { reactive } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { IconMapPlus, IconX, IconDimensions, IconTextCaption } from '@tabler/icons-vue'

const store = useEditorStore()
const emit = defineEmits(['close'])

const form = reactive({
  name: 'Nowa Mapa',
  width: 20,
  height: 15
})

defineProps<{
  isOpen: boolean
}>()

const handleCreate = (): void => {
  if (form.name.trim() && form.width > 0 && form.height > 0) {
    store.createMap(form.name, form.width, form.height)
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="$props.isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 backdrop-blur-sm p-4"
    >
      <div
        class="w-full max-w-md bg-white border border-white/10 rounded-xl shadow-2xl overflow-hidden"
      >
        <div class="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <div class="flex items-center gap-3 text-blue-400">
            <IconMapPlus size="24" />
            <h2 class="font-bold uppercase tracking-wider text-sm text-black">Nowa Mapa</h2>
          </div>
          <button class="text-black hover:text-gray-600 transition-colors" @click="emit('close')">
            <IconX size="20" />
          </button>
        </div>

        <div class="p-6 space-y-6">
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

          <div class="p-3 bg-blue-500/20 border border-blue-500/80 rounded-lg">
            <p class="text-[10px] text-blue-400 leading-relaxed italic">
              Wskazówka: Standardowa mapa RPG Maker to 17x13 lub 20x15 kafelków. Twoja mapa będzie
              miała {{ form.width * form.height }} kafelków na każdą z 6 warstw.
            </p>
          </div>
        </div>

        <div class="p-4 bg-white/5 border-t border-white/5 flex gap-3">
          <button
            class="flex-1 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/5 rounded-lg transition-colors uppercase cursor-pointer"
            @click="emit('close')"
          >
            Anuluj
          </button>
          <button
            class="flex-[2] py-2.5 text-xs font-bold bg-black hover:bg-gray-700 text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 uppercase cursor-pointer"
            @click="handleCreate"
          >
            Stwórz Projekt
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
