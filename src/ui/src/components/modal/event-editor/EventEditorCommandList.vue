<script setup lang="ts">
import { IconGhost, IconTrash } from '@tabler/icons-vue'
import { ZCommandCode } from '@engine/types'
import type { ZEventPage, ZEventGraphic, ZEventCommand } from '@engine/types'

const props = defineProps<{
  page: ZEventPage
  presentationList: { type: string; index: number; indent: number; command?: ZEventCommand }[]
  activePageIndex: number
  getChoiceName: (itemIndex: number, choiceIndex: number) => string
}>()

const selectedCommandIndex = defineModel<number | null>('selectedCommandIndex')

const emit = defineEmits(['open-editor', 'delete-command'])
</script>

<template>
  <div class="flex-1 bg-white flex flex-col relative overflow-hidden">
    <div
      class="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10"
    >
      <div class="flex items-center gap-2">
        <span
          v-if="props.page.trigger === 3 || props.page.trigger === 4"
          class="w-2 h-2 rounded-full bg-slate-900 animate-pulse"
        ></span>
        <span class="text-xs font-bold uppercase tracking-wider text-slate-500"
          >Event Commands</span
        >
      </div>
      <span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full"
        >Page {{ props.activePageIndex + 1 }}</span
      >
    </div>

    <div class="flex-1 overflow-y-auto p-0 scrollbar-thin">
      <!-- Empty State -->
      <div
        v-if="props.page.list.length === 0"
        class="flex flex-col items-center justify-center py-20 text-slate-300 select-none"
      >
        <IconGhost size="48" class="mb-2 opacity-50" />
        <p class="text-xs font-medium">No commands yet</p>
        <p class="text-[10px]">Double click to insert</p>
      </div>

      <div class="flex flex-col font-mono text-sm pb-10">
        <template v-for="(item, idx) in props.presentationList" :key="idx">
          <!-- Command -->
          <div
            v-if="item.type === 'command'"
            :data-index="item.index"
            class="group flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-white transition-colors select-none"
            :class="
              selectedCommandIndex === item.index
                ? 'bg-slate-100 border-slate-200'
                : 'hover:bg-slate-50 hover:border-slate-100'
            "
            :style="{ paddingLeft: `${item.indent * 20 + 16}px` }"
            @click="selectedCommandIndex = item.index"
            @dblclick="emit('open-editor', item.index)"
          >
            <span class="text-slate-300 text-[10px] w-6 text-right select-none shrink-0">{{
              String(item.index + 1).padStart(3, '0')
            }}</span>
            <!-- Command Display Logic -->
            <div class="flex items-center gap-2 flex-1">
              <span
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="{
                  'bg-sky-400': item.command!.code === ZCommandCode.ShowMessage,
                  'bg-purple-400':
                    item.command!.code === ZCommandCode.ConditionalBranch ||
                    item.command!.code === ZCommandCode.Else ||
                    item.command!.code === ZCommandCode.EndBranch,
                  'bg-orange-400':
                    item.command!.code === ZCommandCode.ShowChoices ||
                    item.command!.code === ZCommandCode.When ||
                    item.command!.code === ZCommandCode.EndChoices,
                  'bg-rose-400':
                    item.command!.code === ZCommandCode.ControlSwitch ||
                    item.command!.code === ZCommandCode.ControlVariable ||
                    item.command!.code === ZCommandCode.ControlSelfSwitch,
                  'bg-emerald-400':
                    item.command!.code === ZCommandCode.TransferPlayer ||
                    item.command!.code === ZCommandCode.SetMoveRoute,
                  'bg-yellow-400': item.command!.code === ZCommandCode.ShowAnimation,
                  'bg-slate-500':
                    item.command!.code === ZCommandCode.Wait ||
                    item.command!.code === ZCommandCode.SetEventDirection ||
                    item.command!.code === ZCommandCode.SetEventGraphic,
                  'bg-slate-300': !Object.values(ZCommandCode).includes(item.command!.code)
                }"
              ></span>

              <!-- Transfer Player -->
              <span
                v-if="item.command!.code === ZCommandCode.TransferPlayer"
                class="text-slate-700 font-medium font-sans"
                >Transfer Player (Map {{ item.command!.parameters[0] }},
                {{ item.command!.parameters[1] }}, {{ item.command!.parameters[2] }})</span
              >
              <!-- Show Message -->
              <span
                v-else-if="item.command!.code === ZCommandCode.ShowMessage"
                class="text-slate-700 font-medium font-sans"
                >Show Message: "{{ item.command!.parameters[0] }}"</span
              >
              <!-- Switch -->
              <span
                v-else-if="item.command!.code === ZCommandCode.ControlSwitch"
                class="text-slate-700 font-medium font-sans"
              >
                Switch #{{ item.command!.parameters[0] }} =
                {{
                  item.command!.parameters[1] === 0
                    ? 'OFF'
                    : item.command!.parameters[1] === 1
                      ? 'ON'
                      : 'TOGGLE'
                }}
              </span>
              <!-- Variable -->
              <span
                v-else-if="item.command!.code === ZCommandCode.ControlVariable"
                class="text-slate-700 font-medium font-sans"
              >
                Var #{{ item.command!.parameters[0] }}
                {{
                  ['Set', 'Add', 'Sub', 'Mul', 'Div', 'Mod'][item.command!.parameters[1] as number]
                }}
                {{ item.command!.parameters[2] }}
              </span>
              <!-- Conditional -->
              <span
                v-else-if="item.command!.code === ZCommandCode.ConditionalBranch"
                class="text-purple-700 font-bold font-sans"
              >
                If
                {{
                  item.command!.parameters[0] === 0
                    ? `Switch #${item.command!.parameters[1]} is ${item.command!.parameters[2] ? 'ON' : 'OFF'}`
                    : `Var #${item.command!.parameters[1]} == ${item.command!.parameters[2]}`
                }}
              </span>
              <!-- Else -->
              <span
                v-else-if="item.command!.code === ZCommandCode.Else"
                class="text-purple-700 font-bold font-sans"
              >
                Else
              </span>
              <!-- End -->
              <span
                v-else-if="item.command!.code === ZCommandCode.EndBranch"
                class="text-purple-700 font-bold font-sans"
              >
                End Branch
              </span>

              <!-- Show Choices -->
              <span
                v-else-if="item.command!.code === ZCommandCode.ShowChoices"
                class="text-orange-700 font-bold font-sans"
              >
                Show Choices: {{ (item.command!.parameters[0] as string[]).join(', ') }}
              </span>
              <!-- When -->
              <span
                v-else-if="item.command!.code === ZCommandCode.When"
                class="text-orange-700 font-bold font-sans"
              >
                When "{{ props.getChoiceName(item.index, item.command!.parameters[0] as number) }}"
              </span>
              <!-- End Choices -->
              <span
                v-else-if="item.command!.code === ZCommandCode.EndChoices"
                class="text-orange-700 font-bold font-sans"
              >
                End Choices
              </span>

              <!-- Self Switch -->
              <span
                v-else-if="item.command!.code === ZCommandCode.ControlSelfSwitch"
                class="text-rose-700 font-medium font-sans"
              >
                Self Switch {{ item.command!.parameters[0] }} =
                {{ item.command!.parameters[1] ? 'ON' : 'OFF' }}
              </span>

              <!-- Animation -->
              <span
                v-else-if="item.command!.code === ZCommandCode.ShowAnimation"
                class="text-yellow-700 font-medium font-sans"
              >
                Show Animation #{{ item.command!.parameters[0] }}
              </span>

              <!-- Wait -->
              <span
                v-else-if="item.command!.code === ZCommandCode.Wait"
                class="text-slate-600 font-medium font-sans"
              >
                Wait: {{ item.command!.parameters[0] }} frames
              </span>
              <!-- Set Direction -->
              <span
                v-else-if="item.command!.code === ZCommandCode.SetEventDirection"
                class="text-slate-600 font-medium font-sans"
              >
                Set Direction: {{ item.command!.parameters[0] }}
              </span>
              <!-- Set Graphic -->
              <span
                v-else-if="item.command!.code === ZCommandCode.SetEventGraphic"
                class="text-slate-600 font-medium font-sans"
              >
                Change Graphic:
                {{
                  (item.command!.parameters[0] as ZEventGraphic)?.assetId?.split('/').pop() ||
                  'None'
                }}
              </span>
              <!-- Move Route -->
              <span
                v-else-if="item.command!.code === ZCommandCode.SetMoveRoute"
                class="text-emerald-700 font-medium font-sans"
              >
                Set Move Route ({{ (item.command!.parameters[1] as unknown[])?.length || 0 }}
                cmds)
              </span>

              <span v-else class="text-slate-400 font-medium font-sans italic"
                >Unknown Command ({{ item.command!.code }})</span
              >
              <IconTrash
                v-if="
                  item.command!.code !== ZCommandCode.Else &&
                  item.command!.code !== ZCommandCode.EndBranch &&
                  item.command!.code !== ZCommandCode.When &&
                  item.command!.code !== ZCommandCode.EndChoices
                "
                size="14"
                class="ml-auto text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="emit('delete-command', item.index)"
              />
            </div>
          </div>

          <!-- Add Placeholder -->
          <div
            v-else
            class="group flex items-center gap-3 px-4 py-1.5 hover:bg-slate-50 cursor-pointer transition-colors"
            :style="{ paddingLeft: `${item.indent * 20 + 16}px` }"
            @dblclick="emit('open-editor', item.index, true)"
            @click="selectedCommandIndex = item.index - 1"
          >
            <span class="text-slate-300 text-[10px] w-6 text-right select-none opacity-0 shrink-0"
              >@</span
            >
            <div
              class="flex items-center gap-2 text-slate-300 group-hover:text-slate-500 transition-colors"
            >
              <span class="font-mono text-xs opacity-50">&lt;&gt;</span>
              <span
                class="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100"
                >Add Command</span
              >
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
