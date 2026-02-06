<script setup lang="ts">
defineProps<{
  type: number // 206 (Event Graphic)
}>()

const graphicAssetId = defineModel<string>('graphicAssetId')
</script>

<template>
  <div class="space-y-6">
    <!-- Set Event Graphic -->
    <template v-if="type === 206">
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
