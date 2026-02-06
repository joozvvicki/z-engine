<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import logo from '@ui/assets/logo.png'
import { useEditorStore } from '@ui/stores/editor'
import {
  IconLayoutGrid,
  IconMap,
  IconDatabase,
  IconFolder,
  IconSettings,
  IconLogout,
  IconPlug,
  IconCode,
  IconShoppingCart,
  IconCardboards
} from '@tabler/icons-vue'

const store = useEditorStore()
const route = useRoute()
const router = useRouter()

// --- KONFIGURACJA ---

const mainModules = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: IconLayoutGrid,
    path: '/',
    exact: true
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: IconMap,
    path: '/editor',
    defaultPath: '/editor/assets'
  },
  {
    id: 'database',
    label: 'Database',
    icon: IconDatabase,
    path: '/database',
    defaultPath: '/database/actors'
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: IconFolder,
    path: '/resources',
    defaultPath: '/resources/tilesets'
  },
  {
    id: 'plugins',
    label: 'Plugins',
    icon: IconPlug,
    path: '/plugins',
    defaultPath: '/plugins'
  },
  {
    id: 'scripting',
    label: 'Scripting',
    icon: IconCode,
    path: '/scripting',
    defaultPath: '/scripting'
  },
  {
    id: 'nodes',
    label: 'Nodes',
    icon: IconCardboards,
    path: '/nodes',
    defaultPath: '/nodes'
  }
]

const settings = [
  { icon: IconPlug, label: 'Add-ons', path: '/addons' },
  { icon: IconShoppingCart, label: 'Asset Store', path: '/assets-store' },
  { icon: IconSettings, label: 'Settings', path: '/settings' },
  { icon: IconLogout, label: 'Logout', path: '/logout' }
]

// Sprawdza, czy dany moduł jest aktywny
const isActive = (path: string, exact = false): boolean => {
  if (path === '/' && route.path !== '/') return false
  if (exact) return route.path === path
  return route.path.startsWith(path)
}

// Inteligentna nawigacja
const handleNavigation = (module: (typeof mainModules)[0]) => {
  // Jeśli już jesteśmy w tym module (np. /resources/music),
  // kliknięcie w ikonę Resources nie powinno resetować widoku do Tilesets,
  // chyba że użytkownik tego oczekuje. Zazwyczaj w IDE - nic nie robi lub toggluje sidebar.
  // Tutaj po prostu nawigujemy, jeśli nie jesteśmy w tej sekcji.

  if (!isActive(module.path, module.exact)) {
    router.push(module.defaultPath || module.path)
  }
}

const navigateSimple = (path: string) => {
  router.push(path)
}
</script>

<template>
  <nav
    v-show="!store.isTestMode"
    class="flex flex-col w-[72px] h-screen bg-white border-r border-gray-200 shrink-0 z-50 py-4 relative"
  >
    <div class="h-12 flex items-center justify-center shrink-0 mb-6">
      <img
        :src="logo"
        class="w-10 h-10 cursor-pointer hover:scale-110 hover:rotate-3 transition-transform duration-300 drop-shadow-sm"
        alt="Logo"
        @click="router.push('/')"
      />
    </div>

    <div class="flex flex-col gap-3 px-3 items-center">
      <button
        v-for="item in mainModules"
        :key="item.id"
        class="group relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ease-out"
        :class="[
          isActive(item.path, item.exact)
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        ]"
        @click="handleNavigation(item)"
      >
        <component :is="item.icon" :size="24" :stroke-width="1.5" />

        <div
          class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 z-50 shadow-xl whitespace-nowrap"
        >
          {{ item.label }}
          <div
            class="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"
          ></div>
        </div>
      </button>
    </div>

    <div class="mt-auto flex flex-col gap-3 px-3 items-center">
      <div class="w-8 h-px bg-slate-100"></div>

      <button
        v-for="item in settings"
        :key="item.label"
        class="group relative w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all duration-200"
        @click="navigateSimple(item.path)"
      >
        <component :is="item.icon" :size="22" stroke-width="1.5" />

        <div
          class="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 z-50 shadow-xl whitespace-nowrap"
        >
          {{ item.label }}
          <div
            class="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"
          ></div>
        </div>
      </button>

      <div
        class="mt-2 w-10 h-10 rounded-full bg-slate-50 border border-slate-200 p-0.5 cursor-pointer hover:ring-2 hover:ring-slate-100 transition-all"
      >
        <div
          class="w-full h-full rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-bold text-slate-600"
        >
          JS
        </div>
      </div>
    </div>
  </nav>
</template>
