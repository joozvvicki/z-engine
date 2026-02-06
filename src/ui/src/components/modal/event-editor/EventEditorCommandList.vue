<script setup lang="ts">
import { IconGhost, IconTrash, IconMenu2, IconPlus } from '@tabler/icons-vue'
import { ZCommandCode } from '@engine/types'
import type { ZEventPage, ZEventCommand } from '@engine/types'

const props = defineProps<{
  page: ZEventPage
  presentationList: { type: string; index: number; indent: number; command?: ZEventCommand }[]
  activePageIndex: number
  getChoiceName: (itemIndex: number, choiceIndex: number) => string
}>()

const selectedCommandIndex = defineModel<number | null>('selectedCommandIndex')

const emit = defineEmits(['open-editor', 'delete-command'])

const getCommandColor = (code: number): string => {
  // Flow Control (Purple)
  if (
    [
      ZCommandCode.ConditionalBranch,
      ZCommandCode.Else,
      ZCommandCode.EndBranch,
      ZCommandCode.Loop,
      ZCommandCode.BreakLoop
    ].includes(code)
  ) {
    return 'border-purple-400 bg-purple-50 text-purple-900 shadow-purple-100'
  }

  // Choices (Orange)
  if ([ZCommandCode.ShowChoices, ZCommandCode.When, ZCommandCode.EndChoices].includes(code)) {
    return 'border-orange-400 bg-orange-50 text-orange-900 shadow-orange-100'
  }

  // Game Data / Logic (Rose)
  if (
    [
      ZCommandCode.ControlSwitch,
      ZCommandCode.ControlVariable,
      ZCommandCode.ControlSelfSwitch,
      ZCommandCode.ControlTimer
    ].includes(code)
  ) {
    return 'border-rose-400 bg-rose-50 text-rose-900 shadow-rose-100'
  }

  // Movement & Map (Emerald)
  if (
    [
      ZCommandCode.TransferPlayer,
      ZCommandCode.SetMoveRoute,
      ZCommandCode.GetLocationInfo,
      ZCommandCode.ScrollMap
    ].includes(code)
  ) {
    return 'border-emerald-400 bg-emerald-50 text-emerald-900 shadow-emerald-100'
  }

  // Messages (Sky)
  if (
    [ZCommandCode.ShowMessage, ZCommandCode.ShowMakeText, ZCommandCode.ShowScrollingText].includes(
      code
    )
  ) {
    return 'border-sky-400 bg-sky-50 text-sky-900 shadow-sky-100'
  }

  // Audio & Visuals (Amber/Yellow)
  if (
    [
      ZCommandCode.ShowAnimation,
      ZCommandCode.ShowBalloonIcon,
      ZCommandCode.EraseEvent,
      ZCommandCode.ShowPicture,
      ZCommandCode.MovePicture,
      ZCommandCode.RotatePicture,
      ZCommandCode.TintPicture,
      ZCommandCode.ErasePicture,
      ZCommandCode.PlayBGM,
      ZCommandCode.PlayBGS,
      ZCommandCode.PlayME,
      ZCommandCode.PlaySE
    ].includes(code)
  ) {
    return 'border-amber-400 bg-amber-50 text-amber-900 shadow-amber-100'
  }

  // Default (Slate)
  return 'border-slate-300 bg-white text-slate-700 shadow-slate-100'
}
</script>

<template>
  <div class="flex-1 bg-slate-50/50 flex flex-col relative overflow-hidden min-h-0">
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10"
    >
      <div class="flex items-center gap-3">
        <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">
          Exectuion Content
        </h3>
        <span
          v-if="props.page.trigger === 3 || props.page.trigger === 4"
          class="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold uppercase tracking-wider border border-indigo-100"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          Auto
        </span>
      </div>
      <span
        class="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200"
        >Page {{ props.activePageIndex + 1 }}</span
      >
    </div>

    <!-- Content List -->
    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
      <!-- Empty State -->
      <div
        v-if="props.page.list.length === 0"
        class="flex flex-col items-center justify-center py-20 text-slate-300 select-none border-2 border-dashed border-slate-200 rounded-3xl m-4"
        @dblclick="emit('open-editor', 0, true)"
      >
        <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
          <IconGhost size="32" class="opacity-50" />
        </div>
        <p class="text-xs font-bold text-slate-400">No commands yet</p>
        <p class="text-[10px] font-medium opacity-60 mt-1">Double click to insert</p>
      </div>

      <div class="flex flex-col gap-1.5 pb-10">
        <template v-for="(item, idx) in props.presentationList" :key="idx">
          <!-- Command Card -->
          <div
            v-if="item.type === 'command'"
            :data-index="item.index"
            class="group relative flex items-center gap-3 py-2 pr-2 pl-3 rounded-lg border-l-[3px] shadow-sm transition-all duration-200 cursor-pointer select-none hover:translate-x-1"
            :class="[
              getCommandColor(item.command!.code),
              selectedCommandIndex === item.index ? 'ring-2 ring-indigo-500 ring-offset-2 z-10' : ''
            ]"
            :style="{ marginLeft: `${item.indent * 24}px` }"
            @click="selectedCommandIndex = item.index"
            @dblclick="emit('open-editor', item.index)"
          >
            <!-- Line Number -->
            <span class="text-[9px] font-mono opacity-40 w-5 text-right shrink-0 select-none">
              {{ String(item.index + 1).padStart(3, '0') }}
            </span>

            <!-- Command Icon/Handle -->
            <div
              class="opacity-0 group-hover:opacity-100 transition-opacity text-current/50 cursor-grab active:cursor-grabbing"
            >
              <IconMenu2 size="14" />
            </div>

            <!-- Content -->
            <div class="flex-1 font-mono text-[11px] font-bold leading-relaxed truncate">
              <!-- Transfer Player -->
              <template v-if="item.command!.code === ZCommandCode.TransferPlayer">
                Transfer Player
                <span class="opacity-60 font-normal"
                  >(Map {{ item.command!.parameters[0] }}, {{ item.command!.parameters[1] }},
                  {{ item.command!.parameters[2] }})</span
                >
              </template>

              <!-- Show Message -->
              <template v-else-if="item.command!.code === ZCommandCode.ShowMessage">
                Show Message: <span class="opacity-80">"{{ item.command!.parameters[0] }}"</span>
              </template>

              <!-- Switch -->
              <template v-else-if="item.command!.code === ZCommandCode.ControlSwitch">
                Switch <span class="opacity-80">#{{ item.command!.parameters[0] }}</span> =
                <span class="font-black bg-white/50 px-1 rounded">{{
                  item.command!.parameters[1] === 0
                    ? 'OFF'
                    : item.command!.parameters[1] === 1
                      ? 'ON'
                      : 'TOGGLE'
                }}</span>
              </template>

              <!-- Variable -->
              <template v-else-if="item.command!.code === ZCommandCode.ControlVariable">
                Var <span class="opacity-80">#{{ item.command!.parameters[0] }}</span>
                {{
                  ['Set', 'Add', 'Sub', 'Mul', 'Div', 'Mod'][item.command!.parameters[1] as number]
                }}
                <span class="font-black bg-white/50 px-1 rounded">{{
                  item.command!.parameters[2]
                }}</span>
              </template>

              <!-- Conditional -->
              <template v-else-if="item.command!.code === ZCommandCode.ConditionalBranch">
                If
                {{
                  item.command!.parameters[0] === 0
                    ? `Switch #${item.command!.parameters[1]} is ${item.command!.parameters[2] ? 'ON' : 'OFF'}`
                    : `Var #${item.command!.parameters[1]} == ${item.command!.parameters[2]}`
                }}
              </template>

              <!-- Branches -->
              <template v-else-if="item.command!.code === ZCommandCode.Else">Else</template>
              <template v-else-if="item.command!.code === ZCommandCode.EndBranch"
                >End Branch</template
              >

              <!-- Choices -->
              <template v-else-if="item.command!.code === ZCommandCode.ShowChoices">
                Show Choices:
                <span class="opacity-80">{{
                  (item.command!.parameters[0] as string[]).join(', ')
                }}</span>
              </template>
              <template v-else-if="item.command!.code === ZCommandCode.When">
                When
                <span class="font-black bg-white/50 px-1 rounded"
                  >"{{
                    props.getChoiceName(item.index, item.command!.parameters[0] as number)
                  }}"</span
                >
              </template>
              <template v-else-if="item.command!.code === ZCommandCode.EndChoices"
                >End Choices</template
              >

              <!-- Self Switch -->
              <template v-else-if="item.command!.code === ZCommandCode.ControlSelfSwitch">
                Self Switch <span class="font-black">{{ item.command!.parameters[0] }}</span> =
                <span class="font-black bg-white/50 px-1 rounded">{{
                  item.command!.parameters[1] ? 'ON' : 'OFF'
                }}</span>
              </template>

              <!-- Wait -->
              <template v-else-if="item.command!.code === ZCommandCode.Wait">
                Wait: <span class="font-black">{{ item.command!.parameters[0] }}</span> frames
              </template>

              <!-- Generic Fallback -->
              <template v-else>
                {{ ZCommandCode[item.command!.code] || `Unknown (${item.command!.code})` }}
                <span v-if="item.command!.parameters.length" class="opacity-50 text-[10px] ml-1">
                  [{{ item.command!.parameters.join(', ') }}]
                </span>
              </template>
            </div>

            <!-- Delete Button -->
            <button
              v-if="
                ![
                  ZCommandCode.Else,
                  ZCommandCode.EndBranch,
                  ZCommandCode.When,
                  ZCommandCode.EndChoices
                ].includes(item.command!.code)
              "
              class="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md hover:bg-white/50 hover:text-red-500 hover:shadow-sm"
              @click.stop="emit('delete-command', item.index)"
            >
              <IconTrash size="14" />
            </button>
          </div>

          <!-- Add Placeholder -->
          <div
            v-else
            class="group flex items-center justify-center py-2 rounded-lg border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-all duration-200"
            :style="{ marginLeft: `${item.indent * 24}px` }"
            @click="emit('open-editor', item.index, true)"
          >
            <div
              class="flex items-center gap-2 text-slate-300 group-hover:text-indigo-500 transition-colors"
            >
              <IconPlus size="14" stroke-width="3" />
              <span class="text-[10px] font-bold uppercase tracking-widest">Add Command</span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss';

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
