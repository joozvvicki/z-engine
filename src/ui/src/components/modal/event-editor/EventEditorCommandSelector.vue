<script setup lang="ts">
import { ref, watch } from 'vue'
import { IconSettings, IconX, IconChevronLeft, IconCode, IconChevronRight } from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand, type ZMoveCommand } from '@engine/types'
import type { ZEventPage } from '@engine/types'
import { useEditorStore } from '@ui/stores/editor'
import MessageParams from './params/MessageParams.vue'
import FlowParams from './params/FlowParams.vue'
import StateParams from './params/StateParams.vue'
import MovementParams from './params/MovementParams.vue'
import AudioParams from './params/AudioParams.vue'
import VisualParams from './params/VisualParams.vue'
import EffectParams from './params/EffectParams.vue'
import PictureParams from './params/PictureParams.vue'
import MapParams from './params/MapParams.vue'
import ScreenParams from './params/ScreenParams.vue'
import { variableOps, directions, moveActions, commandCategories } from './params/config'

const props = defineProps<{
  show: boolean
  page: ZEventPage
  systemSwitches: string[]
  initialCommand?: ZEventCommand | null
  isAutonomousMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { code: number; parameters: unknown[] }): void
  (e: 'save-autonomous-route', route: ZMoveCommand[]): void
}>()

const store = useEditorStore()

const commandSelectorStep = ref<'grid' | 'params'>('grid')
const commandCategory = ref('Messages')
const selectedCommandType = ref<number | null>(null)

const editorRef = ref<{
  getCommandData?: () => { code: number; parameters: unknown[] }
  getMoveRoute?: () => ZMoveCommand[]
} | null>(null)

const selectGridCommand = (code: number): void => {
  selectedCommandType.value = code
  commandSelectorStep.value = 'params'
}

watch(
  () => props.show,
  (isShown) => {
    if (isShown) {
      if (props.isAutonomousMode) {
        commandSelectorStep.value = 'params'
        selectedCommandType.value = ZCommandCode.SetMoveRoute
      } else if (props.initialCommand) {
        commandSelectorStep.value = 'params'
        selectedCommandType.value = props.initialCommand.code
      } else {
        commandSelectorStep.value = 'grid'
        selectedCommandType.value = null
      }
    }
  },
  { immediate: true }
)

const handleSave = (): void => {
  if (props.isAutonomousMode) {
    if (editorRef.value?.getMoveRoute) {
      emit('save-autonomous-route', editorRef.value.getMoveRoute())
    }
    return
  }

  if (editorRef.value?.getCommandData) {
    const data = editorRef.value.getCommandData()
    emit('save', data)
  } else if (selectedCommandType.value !== null) {
    emit('save', {
      code: selectedCommandType.value,
      parameters: []
    })
  }
}
</script>

<template>
  <div
    v-if="props.show"
    class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-[24px] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white/40 animate-in fade-in zoom-in-95 duration-200 flex flex-col"
      :class="
        selectedCommandType === ZCommandCode.SetMoveRoute
          ? 'w-[800px] h-[600px]'
          : commandSelectorStep === 'grid'
            ? 'w-[640px] h-[480px]'
            : 'w-[480px]'
      "
    >
      <!-- Modal Header -->
      <div
        class="px-5 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0"
      >
        <div class="flex items-center gap-3">
          <button
            v-if="commandSelectorStep === 'params' && !props.initialCommand"
            class="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
            @click="commandSelectorStep = 'grid'"
          >
            <IconChevronLeft size="16" />
          </button>

          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100"
            >
              <IconCode size="18" />
            </div>
            <div>
              <span
                class="text-[10px] font-black uppercase text-slate-400 tracking-widest block leading-none mb-1"
              >
                Effect Builder
              </span>
              <span
                class="text-xs font-black uppercase text-slate-800 tracking-wide block leading-none"
              >
                {{ props.initialCommand ? 'Edit Command' : 'New Command' }}
              </span>
            </div>
          </div>
        </div>

        <button
          class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          @click="emit('close')"
        >
          <IconX size="18" />
        </button>
      </div>

      <!-- Command Grid Step -->
      <div v-if="commandSelectorStep === 'grid'" class="flex-1 flex overflow-hidden">
        <!-- Sidebar Categories -->
        <nav class="w-40 border-r border-slate-100 bg-slate-50/50 flex flex-col p-3 gap-1.5">
          <button
            v-for="cat in commandCategories"
            :key="cat.id"
            class="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 group"
            :class="
              commandCategory === cat.id
                ? 'bg-white shadow-md shadow-slate-200/50 text-indigo-600'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            "
            @click="commandCategory = cat.id"
          >
            <div class="flex items-center gap-2.5">
              <component :is="cat.icon" size="14" stroke-width="2.5" />
              <span class="text-[10px] font-black uppercase tracking-wide">{{ cat.id }}</span>
            </div>
            <IconChevronRight
              size="12"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              :class="{ 'opacity-100': commandCategory === cat.id }"
            />
          </button>
        </nav>

        <!-- Command Buttons Grid -->
        <div class="flex-1 overflow-y-auto p-5 content-start bg-white">
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="cmd in commandCategories.find((c) => c.id === commandCategory)?.commands"
              :key="cmd.code"
              class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 transition-all group text-left"
              @click="selectGridCommand(cmd.code)"
            >
              <div
                class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors duration-300"
              >
                <component :is="cmd.icon" size="20" stroke-width="2" />
              </div>
              <div class="flex flex-col min-w-0">
                <span
                  class="text-xs font-bold text-slate-700 leading-tight group-hover:text-slate-900"
                  >{{ cmd.label }}</span
                >
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Params Step -->
      <div
        v-if="commandSelectorStep === 'params'"
        class="flex-1 overflow-hidden flex flex-col bg-slate-50/30"
      >
        <div class="p-6 flex-1 overflow-y-auto flex flex-col custom-scrollbar">
          <!-- Command Icon Header inside Params -->
          <div class="flex items-center gap-3 mb-6 opacity-80 pl-1">
            <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span class="text-[10px] font-black uppercase text-indigo-500 tracking-widest">
              {{
                commandCategories
                  .flatMap((c) => c.commands)
                  .find((c) => c.code === selectedCommandType)?.label || 'Move Route'
              }}
            </span>
          </div>

          <!-- Param Fields based on command type -->
          <div class="space-y-6 flex-1">
            <!-- Fields are rendered here -->

            <!-- Show Message -->
            <MessageParams
              v-if="
                selectedCommandType === ZCommandCode.ShowMessage ||
                selectedCommandType === ZCommandCode.ShowChoices
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType"
              :events="store.activeMap?.events || []"
            />

            <!-- Flow Control -->
            <FlowParams
              v-else-if="
                selectedCommandType === ZCommandCode.Wait ||
                selectedCommandType === ZCommandCode.ConditionalBranch ||
                selectedCommandType === ZCommandCode.Loop
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
              :switches="store.systemSwitches"
              :variables="store.systemVariables"
            />

            <!-- State Control -->
            <StateParams
              v-else-if="
                selectedCommandType === ZCommandCode.ControlSelfSwitch ||
                selectedCommandType === ZCommandCode.ControlSwitch ||
                selectedCommandType === ZCommandCode.ControlVariable
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
              :switches="store.systemSwitches"
              :variables="store.systemVariables"
              :variable-ops="variableOps"
            />

            <!-- Movement Control -->
            <MovementParams
              v-else-if="
                selectedCommandType === ZCommandCode.TransferPlayer ||
                selectedCommandType === ZCommandCode.SetMoveRoute ||
                selectedCommandType === ZCommandCode.SetEventDirection
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
              :maps="store.maps"
              :is-autonomous-mode="props.isAutonomousMode"
              :move-actions="moveActions"
              :directions="directions"
            />

            <!-- Audio Control -->
            <AudioParams
              v-else-if="
                [
                  ZCommandCode.PlayBGM,
                  ZCommandCode.PlayBGS,
                  ZCommandCode.PlaySE,
                  ZCommandCode.FadeOutBGM,
                  ZCommandCode.FadeOutBGS,
                  ZCommandCode.StopSE
                ].includes(selectedCommandType || -1)
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
            />

            <!-- Visual Control -->
            <VisualParams
              v-else-if="selectedCommandType === ZCommandCode.SetEventGraphic"
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
            />

            <!-- Effect Control -->
            <EffectParams
              v-else-if="
                selectedCommandType === ZCommandCode.ShowAnimation ||
                selectedCommandType === ZCommandCode.ShowBalloonIcon
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
              :events="store.activeMap?.events || []"
            />

            <!-- Screen Control -->
            <ScreenParams
              v-else-if="
                [
                  ZCommandCode.FadeInScreen,
                  ZCommandCode.FadeOutScreen,
                  ZCommandCode.TintScreen,
                  ZCommandCode.FlashScreen,
                  ZCommandCode.ShakeScreen,
                  ZCommandCode.SetWeather
                ].includes(selectedCommandType || -1)
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
            />

            <!-- Picture Control -->
            <PictureParams
              v-else-if="
                selectedCommandType === ZCommandCode.ShowPicture ||
                selectedCommandType === ZCommandCode.MovePicture ||
                selectedCommandType === ZCommandCode.ErasePicture
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
            />

            <!-- Map Control -->
            <MapParams
              v-else-if="
                selectedCommandType === ZCommandCode.ScrollMap ||
                selectedCommandType === ZCommandCode.GetLocationInfo
              "
              ref="editorRef"
              :initial-command="props.initialCommand"
              :type="selectedCommandType!"
              :variables="store.systemVariables"
            />

            <!-- Default / Fallback for other commands -->
            <div
              v-else-if="
                ![
                  ZCommandCode.ShowMessage,
                  ZCommandCode.Wait,
                  ZCommandCode.ControlSelfSwitch,
                  ZCommandCode.ControlSwitch,
                  ZCommandCode.ControlVariable,
                  ZCommandCode.SetEventDirection,
                  ZCommandCode.TransferPlayer,
                  ZCommandCode.SetMoveRoute,
                  ZCommandCode.PlayBGM,
                  ZCommandCode.PlayBGS,
                  ZCommandCode.PlayME,
                  ZCommandCode.PlaySE,
                  ZCommandCode.StopSE,
                  ZCommandCode.FadeOutBGM,
                  ZCommandCode.FadeOutBGS,
                  ZCommandCode.ShowChoices,
                  ZCommandCode.ConditionalBranch,
                  ZCommandCode.SetEventGraphic,
                  ZCommandCode.ShowAnimation,
                  ZCommandCode.ShowBalloonIcon,
                  ZCommandCode.ShowPicture,
                  ZCommandCode.MovePicture,
                  ZCommandCode.RotatePicture,
                  ZCommandCode.TintPicture,
                  ZCommandCode.ErasePicture,
                  ZCommandCode.ScrollMap,
                  ZCommandCode.GetLocationInfo,
                  ZCommandCode.Loop,
                  ZCommandCode.FadeInScreen,
                  ZCommandCode.FadeOutScreen,
                  ZCommandCode.TintScreen,
                  ZCommandCode.FlashScreen,
                  ZCommandCode.ShakeScreen,
                  ZCommandCode.SetWeather
                ].includes(selectedCommandType || -1)
              "
              class="flex flex-col items-center justify-center flex-1 text-slate-300 gap-4"
            >
              <IconSettings size="48" class="opacity-20" />
              <div class="text-center">
                <p class="text-xs font-bold text-slate-400">Standard Parameters</p>
                <p class="text-[10px] opacity-60">
                  This command doesn't have a specialized editor yet.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
          <button
            class="px-6 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wide transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="px-8 py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wide rounded-2xl shadow-xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
            @click="handleSave"
          >
            Confirm Changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

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
