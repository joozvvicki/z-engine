<script setup lang="ts">
import type { ZEventPage } from '@engine/types'
import { useEditorStore } from '@ui/stores/editor'
import { useDatabaseStore } from '@ui/stores/database'

import SidebarConditions from './sidebar/SidebarConditions.vue'
import SidebarAppearance from './sidebar/SidebarAppearance.vue'
import SidebarMovement from './sidebar/SidebarMovement.vue'
import SidebarTrigger from './sidebar/SidebarTrigger.vue'
import SidebarOptions from './sidebar/SidebarOptions.vue'

const props = defineProps<{
  hasSelection: boolean
  characterUrl: (filename: string) => string
}>()

const page = defineModel<ZEventPage>('page', { required: true })
const store = useEditorStore()
const db = useDatabaseStore()

const emit = defineEmits([
  'select-graphic',
  'set-graphic-from-selection',
  'clear-graphic',
  'edit-move-route'
])
</script>

<template>
  <div
    class="w-[320px] bg-white border-r border-slate-200 flex flex-col pt-6 px-5 gap-8 overflow-y-auto shrink-0 min-h-0 custom-scrollbar pb-10"
  >
    <!-- Conditions Group -->
    <SidebarConditions
      v-model:page="page"
      :switches="store.systemSwitches"
      :variables="store.systemVariables"
      :items="db.items"
    />

    <!-- Appearance Group -->
    <SidebarAppearance
      v-model:page="page"
      :has-selection="props.hasSelection"
      :character-url="props.characterUrl"
      @select-graphic="emit('select-graphic')"
      @set-graphic-from-selection="emit('set-graphic-from-selection')"
      @clear-graphic="emit('clear-graphic')"
    />

    <!-- Autonomous Movement Group -->
    <SidebarMovement v-model:page="page" @edit-move-route="emit('edit-move-route')" />

    <!-- Trigger Group -->
    <SidebarTrigger v-model:page="page" />

    <!-- Options Group -->
    <SidebarOptions v-model:page="page" />
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
