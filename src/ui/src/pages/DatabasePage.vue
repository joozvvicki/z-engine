<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconUser,
  IconTypeface, // Classes
  IconSparkles, // Skills
  IconPackage, // Items
  IconSword, // Weapons
  IconShield, // Armors
  IconGhost, // Enemies
  IconDatabase,
  IconBolt,
  IconTags
} from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()

// Konfiguracja zakładek bazy danych
const tabs = [
  { id: 'actors', label: 'Actors', icon: IconUser, path: '/database/actors' },
  { id: 'classes', label: 'Classes', icon: IconTypeface, path: '/database/classes' },
  { id: 'skills', label: 'Skills', icon: IconSparkles, path: '/database/skills' },
  { id: 'items', label: 'Items', icon: IconPackage, path: '/database/items' },
  { id: 'weapons', label: 'Weapons', icon: IconSword, path: '/database/weapons' },
  { id: 'armors', label: 'Armors', icon: IconShield, path: '/database/armors' },
  { id: 'enemies', label: 'Enemies', icon: IconGhost, path: '/database/enemies' },
  { id: 'common-events', label: 'Common Events', icon: IconBolt, path: '/database/common-events' },
  { id: 'terms', label: 'Terms', icon: IconTags, path: '/database/terms' },
  { id: 'animations', label: 'Animations', icon: IconSparkles, path: '/database/animations' },
  { id: 'states', label: 'States', icon: IconSparkles, path: '/database/states' }
]

// Sprawdza, która zakładka jest aktywna na podstawie URL
const currentTabId = computed(() => {
  const segment = route.path.split('/database/')[1]
  return segment ? segment.split('/')[0] : 'actors'
})

const currentTabLabel = computed(() => {
  return tabs.find((t) => t.id === currentTabId.value)?.label || 'Database'
})

const navigate = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="flex w-full h-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
    <aside class="w-56 bg-slate-50/80 border-r border-slate-200 flex flex-col shrink-0 z-10">
      <div class="px-5 pt-6 pb-4">
        <div class="flex items-center gap-2 mb-1">
          <IconDatabase :size="18" class="text-blue-600" />
          <h2 class="text-xs font-black text-slate-900 uppercase tracking-widest">Database</h2>
        </div>
        <p class="text-[10px] text-slate-400 font-medium px-0.5">Game Data Configuration</p>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
        <nav class="space-y-0.5">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all group border border-transparent"
            :class="
              currentTabId === tab.id
                ? 'bg-white text-blue-600 shadow-sm border-slate-200 ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'
            "
            @click="navigate(tab.path)"
          >
            <div class="flex items-center gap-3">
              <component
                :is="tab.icon"
                :size="16"
                :stroke-width="currentTabId === tab.id ? 2.5 : 2"
                class="transition-colors"
                :class="
                  currentTabId === tab.id
                    ? 'text-blue-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                "
              />
              {{ tab.label }}
            </div>

            <div
              v-if="currentTabId === tab.id"
              class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"
            ></div>
          </button>
        </nav>
      </div>

      <div
        class="p-4 border-t border-slate-200/60 text-[10px] text-slate-400 text-center font-mono"
      >
        v1.0.0 &bull; Local Storage
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
      <header class="h-14 px-6 flex items-center shrink-0 border-b border-slate-100 bg-white z-20">
        <div class="flex items-center gap-2 text-xs font-medium text-slate-400">
          <span>Database</span>
          <span class="text-slate-300">/</span>
          <span class="text-slate-900 font-bold">{{ currentTabLabel }}</span>
        </div>
      </header>

      <main class="flex-1 overflow-hidden relative">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" class="h-full w-full" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
