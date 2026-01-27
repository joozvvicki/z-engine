<script setup lang="ts">
import EditorBar from '@ui/components/EditorBar.vue'
import GameViewport from '@ui/components/GameViewport.vue'
import MapTree from '@ui/components/MapTree.vue'
import TilesetSelector from '@ui/components/TilesetSelector.vue'
</script>

<template>
  <div class="flex h-screen overflow-hidden w-full text-slate-300 font-sans">
    <aside class="max-w-[calc(8*48px+8px)] flex flex-col border-white/5">
      <div class="flex-1 flex flex-col min-h-0">
        <TilesetSelector />
      </div>

      <div class="h-1/3 border-t border-white/5 flex flex-col min-h-0">
        <MapTree />
      </div>
    </aside>

    <main class="flex-1 relative">
      <div class="absolute inset-0 flex gap-1">
        <EditorBar />

        <GameViewport />
      </div>
    </main>
  </div>
</template>
