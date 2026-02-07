<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 214 (Event Graphic)
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const graphicAssetId = ref('')
const direction = ref(2)

const initialize = (): void => {
  if (props.initialCommand) {
    if (props.initialCommand.code === ZCommandCode.SetEventGraphic) {
      const g = props.initialCommand.parameters[0] as { assetId?: string }
      graphicAssetId.value = g?.assetId || ''
    } else if (props.initialCommand.code === ZCommandCode.SetEventDirection) {
      direction.value = Number(props.initialCommand.parameters[0] ?? 2)
    }
  }
}

onMounted(initialize)

// Expose data for parent
defineExpose({
  getCommandData: () => {
    let params: unknown[] = []
    if (props.type === ZCommandCode.SetEventGraphic) {
      params = [
        {
          assetId: graphicAssetId.value,
          group: 'character',
          x: 0,
          y: 0,
          w: 1,
          h: 1
        }
      ]
    } else {
      params = [direction.value]
    }

    return {
      code: props.type,
      parameters: params
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Graphic -->
    <template v-if="type === ZCommandCode.SetEventGraphic">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Asset Filename</label
        >
        <input
          v-model="graphicAssetId"
          type="text"
          class="docs-input"
          placeholder="character1.png"
        />
      </div>
    </template>

    <!-- Direction -->
    <template v-else-if="type === ZCommandCode.SetEventDirection">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Direction</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="d in [
              { val: 2, label: 'Down' },
              { val: 4, label: 'Left' },
              { val: 6, label: 'Right' },
              { val: 8, label: 'Up' }
            ]"
            :key="d.val"
            class="px-4 py-3 rounded-xl border text-xs font-bold transition-all"
            :class="
              direction === d.val
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200'
            "
            @click="direction = d.val"
          >
            {{ d.label }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300;
}
</style>
