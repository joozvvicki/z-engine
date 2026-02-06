<script setup lang="ts">
import {
  IconMouse,
  IconWalk,
  IconBolt,
  IconPlayerPlay,
  IconRepeat,
  IconCircleCheck
} from '@tabler/icons-vue'
import { type ZEventPage, ZEventTrigger } from '@engine/types'

const page = defineModel<ZEventPage>('page', { required: true })

const triggers = [
  {
    value: ZEventTrigger.Action,
    label: 'Action',
    icon: IconMouse,
    description: 'Interact with the event'
  },
  {
    value: ZEventTrigger.PlayerTouch,
    label: 'Player Touch',
    icon: IconWalk,
    description: 'Player walks into event'
  },
  {
    value: ZEventTrigger.EventTouch,
    label: 'Event Touch',
    icon: IconBolt,
    description: 'Event walks into player'
  },
  {
    value: ZEventTrigger.Autorun,
    label: 'Autorun',
    icon: IconPlayerPlay,
    description: 'Runs automatically'
  },
  {
    value: ZEventTrigger.Parallel,
    label: 'Parallel',
    icon: IconRepeat,
    description: 'Runs in background'
  }
]
</script>

<template>
  <div class="space-y-4">
    <h3
      class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
    >
      Start Trigger
    </h3>

    <div class="grid grid-cols-1 gap-2">
      <button
        v-for="trigger in triggers"
        :key="trigger.value"
        class="flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all group"
        :class="
          page.trigger === trigger.value
            ? 'bg-slate-900 border-slate-900 text-white shadow-md transform scale-[1.02]'
            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:shadow-sm'
        "
        @click="page.trigger = trigger.value"
      >
        <div
          class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          :class="
            page.trigger === trigger.value
              ? 'bg-white/20 text-white'
              : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'
          "
        >
          <component :is="trigger.icon" size="16" />
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-[10px] font-black uppercase tracking-wide leading-tight">{{
            trigger.label
          }}</span>
          <span class="text-[9px] truncate opacity-60 font-medium">{{ trigger.description }}</span>
        </div>

        <div v-if="page.trigger === trigger.value" class="ml-auto">
          <IconCircleCheck size="16" class="text-white" />
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";
</style>
