<script setup lang="ts">
import {
  IconDatabase,
  IconFolder,
  IconLogout,
  IconMap,
  IconPlug,
  IconSettings,
  IconSnowman,
  IconUsersGroup
} from '@tabler/icons-vue'
import NavButton from './NavButton.vue'

const options = [
  {
    icon: IconMap,
    label: 'Editor',
    path: '/'
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
  },
  {
    icon: IconUsersGroup,
    label: 'Actors',
    path: '/actors'
  },
  {
    icon: IconSnowman,
    label: 'Enemies',
    path: '/enemies'
  },
  {
    icon: IconPlug,
    label: 'Plugins',
    path: '/plugins'
  }
]

const settings = [
  {
    icon: IconSettings,
    label: 'Settings'
  },
  {
    icon: IconLogout,
    label: 'Logout'
  }
]
</script>

<template>
  <div
    class="w-16 h-full bg-white backdrop-blur-2xl flex flex-col items-center border-r border-gray-200 py-2"
  >
    <div class="mb-3 text-pink-400 bg-pink-100 px-3 py-2 rounded-md">Z</div>

    <nav class="flex flex-col gap-2 relative z-[999]">
      <NavButton
        v-for="option in options"
        :key="option.label"
        :icon="option.icon"
        :tooltip="option.label"
      />
    </nav>

    <div class="mt-auto">
      <NavButton
        v-for="setting in settings"
        :key="setting.label"
        :icon="setting.icon"
        :tooltip="setting.label"
      />
    </div>
  </div>
</template>
