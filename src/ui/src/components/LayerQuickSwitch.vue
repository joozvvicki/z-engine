<script setup lang="ts">
import { useEditorStore } from '@ui/stores/editor'
import { ZLayer } from '@engine/types'
import { IconCircle, IconWall, IconStar, IconCloud } from '@tabler/icons-vue'

const store = useEditorStore()

const layers = [
  { id: ZLayer.ground, icon: IconCircle, label: 'Ground' },
  { id: ZLayer.walls, icon: IconWall, label: 'Walls' },
  { id: ZLayer.decoration, icon: IconStar, label: 'Decorations' },
  { id: ZLayer.highest, icon: IconCloud, label: 'Highest' }
]

const selectLayer = (id: ZLayer): void => {
  store.setLayer(id)
}
</script>

<template>
  <div
    class="flex items-center gap-1 bg-white/80 backdrop-blur-2xl p-1.5 rounded-2xl border border-black/5 shadow-2xl shadow-black/5 pointer-events-auto"
  >
    <button
      v-for="layer in layers"
      :key="layer.id"
      class="w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer group relative"
      :class="[
        store.activeLayer === layer.id
          ? 'bg-black text-white shadow-lg shadow-black/20 scale-105'
          : 'hover:bg-black/5 text-black/40 hover:text-black'
      ]"
      :title="layer.label"
      @click="selectLayer(layer.id)"
    >
      <component
        :is="layer.icon"
        :size="16"
        :stroke-width="store.activeLayer === layer.id ? 2.5 : 2"
      />

      <!-- Tooltip -->
      <div
        class="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all pointer-events-none shadow-xl whitespaces-nowrap z-50"
      >
        {{ layer.label }}
      </div>
    </button>
  </div>
</template>

<style scoped>
.whitespaces-nowrap {
  white-space: nowrap;
}
</style>
