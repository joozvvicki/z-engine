<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  IconSword,
  IconShield,
  IconUsers,
  IconSparkles,
  IconPackage,
  IconTypeface,
  IconUser,
  IconSettings
} from '@tabler/icons-vue'

const route = useRoute()

const currentTab = computed(() => {
  const parts = route.path.split('/')
  return parts[parts.length - 1]
})

const tabs = [
  { id: 'actors', label: 'Actors', icon: IconUser },
  { id: 'classes', label: 'Classes', icon: IconTypeface },
  { id: 'skills', label: 'Skills', icon: IconSparkles },
  { id: 'items', label: 'Items', icon: IconPackage },
  { id: 'weapons', label: 'Weapons', icon: IconSword },
  { id: 'armors', label: 'Armors', icon: IconShield },
  { id: 'enemies', label: 'Enemies', icon: IconUsers },
  { id: 'system', label: 'System', icon: IconSettings }
]

const tabInfo = computed(() => tabs.find((t) => t.id === currentTab.value))
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center text-gray-300 p-20">
    <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
      <component
        :is="tabInfo?.icon"
        v-if="tabInfo"
        :size="40"
        stroke-width="1"
        class="opacity-40"
      />
    </div>
    <h3 class="text-gray-900 font-bold text-lg mb-2">Module {{ currentTab?.toUpperCase() }}</h3>
    <p class="max-w-xs text-center leading-relaxed">
      This module is currently being calibrated. Check back soon for new database capabilities.
    </p>
  </div>
</template>
