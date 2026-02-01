<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logo from '@ui/assets/logo.png'
import {
  IconDatabase,
  IconFolder,
  IconLogout,
  IconMap,
  IconSettings,
  IconUser,
  IconTypeface,
  IconSparkles,
  IconPackage,
  IconSword,
  IconShield,
  IconUsers,
  IconLayoutGrid
} from '@tabler/icons-vue'
import { useEditorStore } from '@ui/stores/editor'
import NavButton from './NavButton.vue'

const store = useEditorStore()

const route = useRoute()
const router = useRouter()

const options = [
  { icon: IconMap, label: 'Editor', path: '/editor' },
  { icon: IconFolder, label: 'Resources', path: '/resources' },
  { icon: IconDatabase, label: 'Database', path: '/database' }
]

const subTabs = computed(() => {
  if (route.path.startsWith('/database')) {
    return [
      { id: 'actors', label: 'Actors', icon: IconUser, path: '/database/actors' },
      { id: 'classes', label: 'Classes', icon: IconTypeface, path: '/database/classes' },
      { id: 'skills', label: 'Skills', icon: IconSparkles, path: '/database/skills' },
      { id: 'items', label: 'Items', icon: IconPackage, path: '/database/items' },
      { id: 'weapons', label: 'Weapons', icon: IconSword, path: '/database/weapons' },
      { id: 'armors', label: 'Armors', icon: IconShield, path: '/database/armors' },
      { id: 'enemies', label: 'Enemies', icon: IconUsers, path: '/database/enemies' },
      { id: 'system', label: 'System', icon: IconSettings, path: '/database/system' }
    ]
  }
  if (route.path.startsWith('/resources')) {
    return [
      { id: 'tilesets', label: 'Tilesets', icon: IconLayoutGrid, path: '/resources/tilesets' },
      { id: 'characters', label: 'Characters', icon: IconUsers, path: '/resources/characters' }
    ]
  }
  return []
})

const settings = [
  { icon: IconSettings, label: 'Settings', path: '/settings' },
  { icon: IconLogout, label: 'Logout', path: '/logout' }
]
</script>

<template>
  <div
    v-show="!store.isTestMode"
    class="min-w-16 relative z-2000 h-full bg-white backdrop-blur-2xl flex flex-col items-center border-r border-gray-200 py-2 transition-all duration-300"
  >
    <img :src="logo" class="w-8 h-8 mb-4 cursor-pointer" @click="router.push('/')" />

    <nav class="flex flex-col gap-2 relative z-999">
      <NavButton
        v-for="option in options"
        :key="option.label"
        :icon="option.icon"
        :tooltip="option.label"
        :path="option.path"
      />
    </nav>

    <!-- Sub Tabs Connection -->
    <Transition name="slide">
      <div
        v-if="subTabs.length > 0"
        class="mt-8 flex flex-col gap-2 pt-8 border-t border-gray-100 items-center"
      >
        <span class="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-2 opacity-50"
          >Tools</span
        >
        <NavButton
          v-for="tab in subTabs"
          :key="tab.label"
          :icon="tab.icon"
          :tooltip="tab.label"
          :path="tab.path"
        />
      </div>
    </Transition>

    <div class="mt-auto">
      <NavButton
        v-for="setting in settings"
        :key="setting.label"
        :icon="setting.icon"
        :tooltip="setting.label"
        :path="setting.path"
      />
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
