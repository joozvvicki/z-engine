<script setup lang="ts">
import { ref } from 'vue'
import ActorsTab from '@ui/components/database/ActorsTab.vue'
import {
  IconUser,
  IconSword,
  IconShield,
  IconUsers,
  IconSparkles,
  IconSettings,
  IconPackage,
  IconTypeface
} from '@tabler/icons-vue'
import NavButton from '@ui/components/NavButton.vue'

import SystemTab from '@ui/components/database/SystemTab.vue'

const currentTab = ref('actors')

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
</script>

<template>
  <div class="flex w-full h-full bg-white font-sans overflow-hidden">
    <aside class="px-4 py-2 bg-white flex flex-col gap-2">
      <NavButton v-for="tab in tabs" :key="tab.id" :icon="tab.icon" @click="currentTab = tab.id">
      </NavButton>
    </aside>

    <main class="flex-1 p-2 verflow-hidden flex flex-col">
      <div class="flex-1 overflow-hidden bg-white rounded-lg shadow-2xl border border-white/5 p-4">
        <ActorsTab v-if="currentTab === 'actors'" />
        <SystemTab v-else-if="currentTab === 'system'" />

        <div v-else class="w-full h-full flex flex-col items-center justify-center text-white/20">
          <IconSettings :size="48" class="mb-4 opacity-20" />
          <p>
            Module <b>{{ currentTab }}</b> is under construction.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
