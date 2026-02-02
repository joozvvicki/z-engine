<script setup lang="ts">
import {
  IconGhost,
  IconWalk,
  IconBolt,
  IconRepeat,
  IconPlayerPlay,
  IconMouse
} from '@tabler/icons-vue'
import type { ZEventPage } from '@engine/types'
import { ZEventTrigger } from '@engine/types'

const props = defineProps<{
  hasSelection: boolean
  characterUrl: (filename: string) => string
}>()

const page = defineModel<ZEventPage>('page', { required: true })

const emit = defineEmits(['select-graphic', 'set-graphic-from-selection', 'clear-graphic'])

const triggers = [
  {
    value: ZEventTrigger.Action,
    label: 'Action Button',
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
    description: 'Runs automatically (blocks player)'
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
  <div
    class="w-[340px] bg-white border-r border-slate-100 flex flex-col p-6 gap-6 overflow-y-auto shrink-0"
  >
    <!-- Conditions Group -->
    <div class="space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
        Conditions
        <div class="h-px bg-slate-100 flex-1"></div>
      </h3>
      <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            v-model="page.conditions.switch1Id"
            type="checkbox"
            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-xs font-medium text-slate-500 group-hover:text-slate-700"
            >Switch 1</span
          >
        </label>
        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            v-model="page.conditions.variableId"
            type="checkbox"
            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-xs font-medium text-slate-500 group-hover:text-slate-700"
            >Variable</span
          >
        </label>
        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            v-model="page.conditions.selfSwitchCh"
            type="checkbox"
            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-xs font-medium text-slate-500 group-hover:text-slate-700"
            >Self Switch</span
          >
        </label>
        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            v-model="page.conditions.item"
            type="checkbox"
            class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span class="text-xs font-medium text-slate-500 group-hover:text-slate-700"
            >Item Possession</span
          >
        </label>
      </div>
    </div>

    <!-- Graphic Group -->
    <div class="space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
        Appearance
        <div class="h-px bg-slate-100 flex-1"></div>
      </h3>

      <div class="flex gap-4">
        <div
          class="w-24 h-24 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2nk5uamNYwYP//8/xyM2jB4wYDBsIqKikq8Gg4dOoQXR21g8IIBg2EVg4AAAABJRU5ErkJggg==')] bg-repeat border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer transition-colors group"
          @dblclick="emit('select-graphic')"
        >
          <template v-if="page.graphic">
            <div
              v-if="page.graphic.group === 'character'"
              class="w-full h-full relative flex items-center justify-center transform scale-75"
            >
              <div
                class="pixelated"
                :style="{
                  width: `${page.graphic.srcW || 48}px`,
                  height: `${page.graphic.srcH || 48}px`,
                  backgroundImage: `url(${props.characterUrl(page.graphic.assetId)})`,
                  backgroundPosition:
                    page.graphic.srcX !== undefined
                      ? `-${page.graphic.srcX}px -${page.graphic.srcY}px`
                      : `-${(page.graphic.x || 0) * 48}px -${(page.graphic.y || 0) * 48}px`
                }"
              ></div>
            </div>
            <div v-else class="text-center group-hover:scale-110 transition-transform">
              <div class="text-2xl mb-1 drop-shadow-sm">🖼️</div>
            </div>
            <div
              class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-mono text-center p-0.5 truncate backdrop-blur-sm"
            >
              {{ page.graphic.assetId }}
            </div>
          </template>
          <div v-else class="text-slate-300 flex flex-col items-center group-hover:text-blue-400">
            <IconGhost size="24" />
            <span class="text-[9px] font-bold uppercase mt-1">Empty</span>
          </div>
        </div>

        <div class="flex-1 flex flex-col gap-2 justify-center">
          <button
            class="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors border border-blue-100"
            @click="emit('select-graphic')"
          >
            Select Graphic
          </button>
          <button
            v-if="props.hasSelection"
            class="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-lg transition-colors border border-slate-200"
            title="Use current map selection"
            @click="emit('set-graphic-from-selection')"
          >
            Use Map Selection
          </button>
          <button
            class="px-3 py-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-500 text-xs font-bold rounded-lg transition-colors border border-slate-200 hover:border-red-200"
            @click="emit('clear-graphic')"
          >
            Clear Graphic
          </button>
        </div>
      </div>
    </div>

    <!-- Trigger Redesign -->
    <div class="space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
        Trigger
        <div class="h-px bg-slate-100 flex-1"></div>
      </h3>

      <div class="grid grid-cols-1 gap-2">
        <button
          v-for="trigger in triggers"
          :key="trigger.value"
          class="flex items-center gap-3 p-3 rounded-xl border text-left transition-all group"
          :class="
            page.trigger === trigger.value
              ? 'bg-blue-600 border-blue-600 text-white shadow-md'
              : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-blue-200 hover:shadow-sm'
          "
          @click="page.trigger = trigger.value"
        >
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            :class="
              page.trigger === trigger.value
                ? 'bg-white/20'
                : 'bg-white shadow-sm text-slate-400 group-hover:text-blue-500'
            "
          >
            <component :is="trigger.icon" size="18" />
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold leading-tight">{{ trigger.label }}</span>
            <span
              class="text-[9px] truncate"
              :class="page.trigger === trigger.value ? 'text-blue-100' : 'text-slate-400'"
              >{{ trigger.description }}</span
            >
          </div>
        </button>
      </div>
    </div>

    <!-- Options Group -->
    <div class="space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
        Options
        <div class="h-px bg-slate-100 flex-1"></div>
      </h3>
      <div
        class="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-y-3 gap-x-2"
      >
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            v-model="page.options.walkAnim"
            type="checkbox"
            class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all"
          />
          <span class="text-[11px] font-medium text-slate-600 group-hover:text-blue-700"
            >Walking Anim</span
          >
        </label>
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            v-model="page.options.stepAnim"
            type="checkbox"
            class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all"
          />
          <span class="text-[11px] font-medium text-slate-600 group-hover:text-blue-700"
            >Stepping Anim</span
          >
        </label>
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            v-model="page.options.directionFix"
            type="checkbox"
            class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all"
          />
          <span class="text-[11px] font-medium text-slate-600 group-hover:text-blue-700"
            >Direction Fix</span
          >
        </label>
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            v-model="page.options.through"
            type="checkbox"
            class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all"
          />
          <span class="text-[11px] font-medium text-slate-600 group-hover:text-blue-700"
            >Through</span
          >
        </label>
      </div>
    </div>
  </div>
</template>
