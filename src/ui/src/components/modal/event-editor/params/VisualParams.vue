<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 214 (Event Graphic)
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const graphicAssetId = ref('')

const initialize = (): void => {
  if (props.initialCommand && props.initialCommand.code === ZCommandCode.SetEventGraphic) {
    const g = props.initialCommand.parameters[0] as { assetId?: string }
    graphicAssetId.value = g?.assetId || ''
  }
}

onMounted(initialize)

// Expose data for parent
defineExpose({
  getCommandData: () => {
    return {
      code: props.type,
      parameters: [
        {
          assetId: graphicAssetId.value,
          group: 'character', // Default for this command version
          x: 0,
          y: 0,
          w: 1,
          h: 1
        }
      ]
    }
  }
})
</script>

<template>
  <div class="space-y-6">
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
      <!-- Additional graphic properties like x, y, frame could be added here if fully implemented -->
    </template>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300;
}
</style>
