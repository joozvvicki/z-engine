<script setup lang="ts">
import { IconGhost } from '@tabler/icons-vue'
import type { ZEventPage } from '@engine/types'

const props = defineProps<{
  hasSelection: boolean
  characterUrl: (filename: string) => string
}>()

const page = defineModel<ZEventPage>('page', { required: true })

const emit = defineEmits(['select-graphic', 'set-graphic-from-selection', 'clear-graphic'])
</script>

<template>
  <div class="space-y-4">
    <h3
      class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
    >
      Appearance
    </h3>

    <div class="flex gap-4">
      <div
        class="w-24 h-24 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2nk5uamNYwYP//8/xyM2jB4wYDBsIqKikq8Gg4dOoQXR21g8IIBg2EVg4AAAABJRU5ErkJggg==')] bg-repeat border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-center relative overflow-hidden cursor-pointer transition-all group shadow-inner bg-slate-50"
        @dblclick="emit('select-graphic')"
      >
        <template v-if="page.graphic">
          <div
            v-if="page.graphic.group === 'character'"
            class="w-full h-full relative flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300"
          >
            <div
              class="pixelated drop-shadow-md"
              :style="{
                width: `${page.graphic.srcW || 48}px`,
                height: `${page.graphic.srcH || 48}px`,
                backgroundImage: `url(${props.characterUrl(page.graphic.assetId)})`,
                backgroundPosition:
                  page.graphic.srcX !== undefined
                    ? `-${page.graphic.srcX}px -${page.graphic.srcY}px`
                    : `-${(page.graphic.x || 0) * 48}px -${(page.graphic.y || 0) * 48}px`
              }"
            ></div>
          </div>
          <div
            v-else
            class="w-full h-full relative flex items-center justify-center transform scale-90"
          >
            <div
              class="pixelated drop-shadow-md"
              :style="{
                width: `${(page.graphic.w || 1) * 48}px`,
                height: `${(page.graphic.h || 1) * 48}px`,
                backgroundImage: `url(${props.characterUrl(page.graphic.assetId)})`,
                backgroundPosition: `-${(page.graphic.x || 0) * 48}px -${(page.graphic.y || 0) * 48}px`,
                backgroundSize: 'auto'
              }"
            ></div>
          </div>

          <div
            class="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[9px] font-bold text-center py-1 truncate backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {{ page.graphic.assetId }}
          </div>
        </template>

        <div
          v-else
          class="text-slate-300 flex flex-col items-center gap-1 group-hover:text-indigo-400 transition-colors"
        >
          <IconGhost size="24" stroke-width="1.5" />
          <span class="text-[9px] font-black uppercase tracking-wider">Empty</span>
        </div>
      </div>

      <div class="flex-1 flex flex-col gap-2 justify-center">
        <button
          class="w-full px-3 py-2 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wide rounded-xl transition-all shadow-md shadow-slate-200 active:scale-95 active:shadow-none"
          @click="emit('select-graphic')"
        >
          Select Graphic
        </button>

        <button
          v-if="props.hasSelection"
          class="w-full px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wide rounded-xl transition-colors border border-slate-200 shadow-sm"
          @click="emit('set-graphic-from-selection')"
        >
          Use Map Sel.
        </button>

        <button
          class="w-full px-3 py-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 text-[10px] font-bold uppercase tracking-wide rounded-xl transition-colors border border-slate-200 hover:border-rose-200"
          @click="emit('clear-graphic')"
        >
          Clear
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.pixelated {
  image-rendering: pixelated;
}
</style>
