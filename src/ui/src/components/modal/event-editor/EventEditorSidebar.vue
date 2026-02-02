<script setup lang="ts">
import {
  IconGhost,
  IconWalk,
  IconBolt,
  IconRepeat,
  IconPlayerPlay,
  IconMouse,
  IconSquare,
  IconSquareCheck
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
    class="w-[300px] bg-white border-r border-slate-100 flex flex-col p-4 gap-4 overflow-y-auto shrink-0"
  >
    <!-- Conditions Group -->
    <div class="space-y-2">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Conditions
        <div class="h-px bg-slate-100 flex-1"></div>
      </h3>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
          :class="
            page.conditions.switch1Id
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
              : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300'
          "
          @click="page.conditions.switch1Id = page.conditions.switch1Id ? undefined : '1'"
        >
          <component :is="page.conditions.switch1Id ? IconSquareCheck : IconSquare" size="12" />
          Switch 1
        </button>
        <button
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
          :class="
            page.conditions.variableId
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
              : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300'
          "
          @click="page.conditions.variableId = page.conditions.variableId ? undefined : '1'"
        >
          <component :is="page.conditions.variableId ? IconSquareCheck : IconSquare" size="12" />
          Variable
        </button>
        <button
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
          :class="
            page.conditions.selfSwitchCh
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
              : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300'
          "
          @click="page.conditions.selfSwitchCh = page.conditions.selfSwitchCh ? undefined : 'A'"
        >
          <component :is="page.conditions.selfSwitchCh ? IconSquareCheck : IconSquare" size="12" />
          Self Switch
        </button>
        <button
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
          :class="
            page.conditions.item
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
              : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300'
          "
          @click="page.conditions.item = page.conditions.item ? undefined : '1'"
        >
          <component :is="page.conditions.item ? IconSquareCheck : IconSquare" size="12" />
          Item
        </button>
      </div>
    </div>

    <!-- Graphic Group -->
    <div class="space-y-2">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Appearance
        <div class="h-px bg-slate-100 flex-1"></div>
      </h3>

      <div class="flex gap-3">
        <div
          class="w-20 h-20 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2nk5uamNYwYP//8/xyM2jB4wYDBsIqKikq8Gg4dOoQXR21g8IIBg2EVg4AAAABJRU5ErkJggg==')] bg-repeat border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer transition-colors group"
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
              class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] font-mono text-center p-0.5 truncate backdrop-blur-sm"
            >
              {{ page.graphic.assetId }}
            </div>
          </template>
          <div v-else class="text-slate-300 flex flex-col items-center group-hover:text-slate-600">
            <IconGhost size="20" />
            <span class="text-[8px] font-black uppercase mt-1">Empty</span>
          </div>
        </div>

        <div class="flex-1 flex flex-col gap-1.5 justify-center">
          <button
            class="px-2 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-bold rounded-lg transition-all shadow-sm active:scale-95"
            @click="emit('select-graphic')"
          >
            Select
          </button>
          <button
            v-if="props.hasSelection"
            class="px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors border border-slate-200"
            @click="emit('set-graphic-from-selection')"
          >
            Map Set
          </button>
          <button
            class="px-2 py-1.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 text-[10px] font-bold rounded-lg transition-colors border border-slate-200 hover:border-red-200"
            @click="emit('clear-graphic')"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Trigger Group -->
    <div class="space-y-2">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Trigger
        <div class="h-px bg-slate-100 flex-1"></div>
      </h3>

      <div class="grid grid-cols-1 gap-1.5">
        <button
          v-for="trigger in triggers"
          :key="trigger.value"
          class="flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all group"
          :class="
            page.trigger === trigger.value
              ? 'bg-slate-900 border-slate-900 text-white shadow-md'
              : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-slate-300'
          "
          @click="page.trigger = trigger.value"
        >
          <div
            class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            :class="
              page.trigger === trigger.value
                ? 'bg-white/20'
                : 'bg-white shadow-sm text-slate-400 group-hover:text-slate-900'
            "
          >
            <component :is="trigger.icon" size="14" />
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] font-black leading-tight uppercase tracking-tight">{{
              trigger.label
            }}</span>
            <span class="text-[9px] truncate opacity-60">{{ trigger.description }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Options Group -->
    <div class="space-y-2">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Options
        <div class="h-px bg-slate-100 flex-1"></div>
      </h3>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
          :class="
            page.options.walkAnim
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
              : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300'
          "
          @click="page.options.walkAnim = !page.options.walkAnim"
        >
          <component :is="page.options.walkAnim ? IconSquareCheck : IconSquare" size="12" />
          Walk Anim
        </button>
        <button
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
          :class="
            page.options.stepAnim
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
              : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300'
          "
          @click="page.options.stepAnim = !page.options.stepAnim"
        >
          <component :is="page.options.stepAnim ? IconSquareCheck : IconSquare" size="12" />
          Step Anim
        </button>
        <button
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
          :class="
            page.options.directionFix
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
              : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300'
          "
          @click="page.options.directionFix = !page.options.directionFix"
        >
          <component :is="page.options.directionFix ? IconSquareCheck : IconSquare" size="12" />
          Dir Fix
        </button>
        <button
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
          :class="
            page.options.through
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
              : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-300'
          "
          @click="page.options.through = !page.options.through"
        >
          <component :is="page.options.through ? IconSquareCheck : IconSquare" size="12" />
          Through
        </button>
      </div>
    </div>
  </div>
</template>
