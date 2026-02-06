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
  <div class="flex items-center gap-1 pointer-events-auto">
    <button
      v-for="layer in layers"
      :key="layer.id"
      class="w-9 h-9 flex items-center justify-center rounded-lg transition-all cursor-pointer group relative"
      :class="[
        store.activeLayer === layer.id
          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
          : 'hover:bg-slate-900/5 text-slate-400 hover:text-slate-900'
      ]"
      :title="layer.label"
      @click="selectLayer(layer.id)"
    >
      <component
        :is="layer.icon"
        :size="18"
        :stroke-width="store.activeLayer === layer.id ? 2.5 : 2"
      />

      <div
        class="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all pointer-events-none shadow-xl whitespaces-nowrap z-50"
      >
        {{ layer.label }}
        <div
          class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"
        ></div>
      </div>
    </button>
  </div>
</template>

<style scoped>
.whitespaces-nowrap {
  white-space: nowrap;
}
</style>
