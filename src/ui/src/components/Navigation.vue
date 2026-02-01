<script setup lang="ts">
import logo from '@ui/assets/logo.png'
import { IconDatabase, IconFolder, IconLogout, IconMap, IconSettings } from '@tabler/icons-vue'
import NavButton from './NavButton.vue'

const options = [
  {
    icon: IconMap,
    label: 'Editor',
    path: '/editor'
  },
  {
    icon: IconFolder,
    label: 'Resources',
    path: '/resources'
  },
  {
    icon: IconDatabase,
    label: 'Database',
    path: '/database'
  }
]

const settings = [
  {
    icon: IconSettings,
    label: 'Settings',
    path: '/settings'
  },
  {
    icon: IconLogout,
    label: 'Logout',
    path: '/logout'
  }
]
</script>

<template>
  <div
    class="min-w-16 relative z-2000 h-full bg-white backdrop-blur-2xl flex flex-col items-center border-r border-gray-200 py-2"
  >
    <img :src="logo" class="w-8 h-8 mb-4 cursor-pointer" @click="$router.push('/')" />

    <nav class="flex flex-col gap-2 relative z-999">
      <NavButton
        v-for="option in options"
        :key="option.label"
        :icon="option.icon"
        :tooltip="option.label"
        :path="option.path"
      />
    </nav>

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
