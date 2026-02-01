<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { ProjectService } from '@ui/services/ProjectService'
import { IconMapPin, IconMaximize, IconFolder, IconCrosshair } from '@tabler/icons-vue'

const store = useEditorStore()

const currentMapName = computed(() => store.activeMap?.name || 'No Map')
const currentMapId = computed(() => store.activeMapID || '-')
const projectPath = computed(() => ProjectService.currentPath || 'None')

// Mock coordinates for now, as we'd need to emit them from GameViewport
const coords = computed(() => ({ x: store.playerPos.x, y: store.playerPos.y }))
</script>

<template>
  <div
    class="h-8 bg-white border-t border-black/5 px-4 flex items-center justify-between text-[10px] font-bold tracking-tight text-black/40"
  >
    <div class="flex items-center gap-6 h-full">
      <!-- Coordinates -->
      <div class="flex items-center gap-2 group cursor-default">
        <IconCrosshair :size="12" class="text-black/20 group-hover:text-black transition-colors" />
        <span class="font-mono text-black/60">{{ coords.x }}, {{ coords.y }}</span>
      </div>

      <!-- Map Info -->
      <div class="flex items-center gap-2 group cursor-default">
        <IconMapPin :size="12" class="text-black/20 group-hover:text-black transition-colors" />
        <span class="text-black/60"
          >{{ currentMapName }} <span class="opacity-30">#{{ currentMapId }}</span></span
        >
      </div>

      <!-- Zoom -->
      <div class="flex items-center gap-2 group cursor-default">
        <IconMaximize :size="12" class="text-black/20 group-hover:text-black transition-colors" />
        <span class="text-black/60">100%</span>
      </div>
    </div>

    <div class="flex items-center gap-2 max-w-[40%]">
      <IconFolder :size="12" class="text-black/20" />
      <span class="truncate opacity-60 font-mono">{{ projectPath }}</span>
    </div>
  </div>
</template>
