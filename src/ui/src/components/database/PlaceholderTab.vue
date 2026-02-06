<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  IconSword,
  IconShield,
  IconSparkles,
  IconPackage,
  IconTypeface,
  IconUser,
  IconSettings,
  IconGhost,
  IconCone,
  IconCode,
  IconMovie,
  IconPalette
} from '@tabler/icons-vue'

const route = useRoute()

// Wyciągamy ostatni segment URL (np. 'animations', 'states')
const currentTabId = computed(() => {
  const parts = route.path.split('/')
  return parts[parts.length - 1]
})

// Rozszerzona lista o potencjalne przyszłe moduły
const tabs: Record<string, { label: string; icon: any }> = {
  actors: { label: 'Actors', icon: IconUser },
  classes: { label: 'Classes', icon: IconTypeface },
  skills: { label: 'Skills', icon: IconSparkles },
  items: { label: 'Items', icon: IconPackage },
  weapons: { label: 'Weapons', icon: IconSword },
  armors: { label: 'Armors', icon: IconShield },
  enemies: { label: 'Enemies', icon: IconGhost },
  system: { label: 'System', icon: IconSettings },
  // Przyszłe moduły (dla których ten placeholder może się wyświetlać)
  states: { label: 'States', icon: IconPalette },
  animations: { label: 'Animations', icon: IconMovie },
  tilesets: { label: 'Tilesets', icon: IconCode },
  commonEvents: { label: 'Common Events', icon: IconCode }
}

const tabInfo = computed(
  () => tabs[currentTabId.value] || { label: 'Unknown Module', icon: IconCone }
)
</script>

<template>
  <div class="flex h-full w-full bg-white relative overflow-hidden font-sans">
    <div
      class="absolute inset-0 opacity-[0.4] pointer-events-none"
      style="
        background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
        background-size: 24px 24px;
      "
    ></div>

    <div class="flex-1 flex flex-col items-center justify-center relative z-10 p-10">
      <div class="max-w-md w-full flex flex-col items-center text-center">
        <div class="relative w-32 h-32 flex items-center justify-center mb-8">
          <div class="absolute inset-0 bg-slate-100 rounded-full animate-ping opacity-20"></div>
          <div class="absolute inset-4 bg-slate-100 rounded-full animate-pulse opacity-40"></div>

          <div
            class="relative w-24 h-24 bg-white rounded-full border border-slate-200 shadow-xl flex items-center justify-center text-slate-300"
          >
            <component :is="tabInfo.icon" :size="48" stroke-width="1.5" class="opacity-80" />

            <div
              class="absolute -bottom-2 -right-2 bg-amber-100 text-amber-600 border border-amber-200 p-2 rounded-full shadow-sm"
            >
              <IconCode :size="16" />
            </div>
          </div>
        </div>

        <div class="space-y-3 mb-10">
          <div class="flex items-center justify-center gap-2">
            <span
              class="text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded"
            >
              Module: {{ currentTabId.toUpperCase() }}
            </span>
          </div>

          <h3 class="text-3xl font-black text-slate-900 tracking-tight">
            {{ tabInfo.label }}
          </h3>

          <p class="text-slate-500 font-medium max-w-xs mx-auto leading-relaxed text-sm">
            This database module is currently undergoing calibration. UI implementation is scheduled
            for the next update cycle.
          </p>
        </div>

        <div class="w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
          <div class="absolute inset-0 bg-slate-300 w-1/3 rounded-full loading-bar"></div>
        </div>
        <span
          class="text-[9px] font-bold text-slate-400 mt-3 uppercase tracking-widest flex items-center gap-2"
        >
          <span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
          Development in progress
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes loading {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(300%);
  }
}

.loading-bar {
  animation: loading 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
