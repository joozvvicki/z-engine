<script setup lang="ts">
import { ref } from 'vue'
import {
  IconX,
  IconChevronLeft,
  IconSettings,
  IconMessage,
  IconList,
  IconHourglass,
  IconFlare,
  IconVariable,
  IconMapPin
} from '@tabler/icons-vue'
import { ZCommandCode } from '@engine/types'
import type { ZEventPage } from '@engine/types'

const props = defineProps<{
  show: boolean
  page: ZEventPage
  systemSwitches: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { code: number; params: unknown[] }): void
}>()

const commandSelectorStep = ref<'grid' | 'params'>('grid')
const commandCategory = ref('Messages')
const selectedCommandType = ref<number | null>(null)
const messageText = ref('')

const commandCategories = [
  {
    id: 'Messages',
    icon: IconMessage,
    commands: [
      { code: ZCommandCode.ShowMessage, label: 'Show Message', icon: IconMessage },
      { code: ZCommandCode.ShowChoices, label: 'Show Choices', icon: IconList }
    ]
  },
  {
    id: 'Flow',
    icon: IconSettings,
    commands: [
      { code: ZCommandCode.ConditionalBranch, label: 'Conditional Branch', icon: IconSettings },
      { code: ZCommandCode.Wait, label: 'Wait', icon: IconHourglass }
    ]
  },
  {
    id: 'State',
    icon: IconVariable,
    commands: [
      { code: ZCommandCode.ControlSwitch, label: 'Control Switch', icon: IconVariable },
      { code: ZCommandCode.ControlVariable, label: 'Control Variable', icon: IconVariable },
      { code: ZCommandCode.ControlSelfSwitch, label: 'Control Self Switch', icon: IconVariable }
    ]
  },
  {
    id: 'Movement',
    icon: IconMapPin,
    commands: [
      { code: ZCommandCode.TransferPlayer, label: 'Transfer Player', icon: IconMapPin },
      { code: ZCommandCode.SetMoveRoute, label: 'Set Move Route', icon: IconMapPin },
      { code: ZCommandCode.SetEventDirection, label: 'Change Direction', icon: IconSettings }
    ]
  },
  {
    id: 'Visuals',
    icon: IconFlare,
    commands: [
      { code: ZCommandCode.SetEventGraphic, label: 'Change Graphic', icon: IconFlare },
      { code: ZCommandCode.ShowAnimation, label: 'Show Animation', icon: IconFlare }
    ]
  }
]

const selectGridCommand = (code: number): void => {
  selectedCommandType.value = code
  commandSelectorStep.value = 'params'
}

const handleSave = (): void => {
  if (selectedCommandType.value !== null) {
    emit('save', {
      code: selectedCommandType.value,
      params: [messageText.value]
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
      class="bg-white rounded-xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200 flex flex-col"
      :class="commandSelectorStep === 'grid' ? 'w-[640px] h-[480px]' : 'w-[480px]'"
    >
      <!-- Modal Header -->
      <div
        class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0"
      >
        <div class="flex items-center gap-2">
          <button
            v-if="commandSelectorStep === 'params'"
            class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            @click="commandSelectorStep = 'grid'"
          >
            <IconChevronLeft size="16" />
            Back
          </button>
          <div class="flex items-center gap-4">
            <span class="text-xs font-black uppercase text-slate-800 tracking-wide">
              Command Selector
            </span>
          </div>
        </div>
        <button class="text-slate-400 hover:text-slate-600" @click="emit('close')">
          <IconX size="16" />
        </button>
      </div>

      <!-- Command Grid Step -->
      <div v-if="commandSelectorStep === 'grid'" class="flex-1 flex overflow-hidden">
        <!-- Sidebar Categories -->
        <div
          class="w-40 border-r border-slate-100 bg-slate-50/50 flex flex-col p-2 gap-1 uppercase tracking-tighter"
        >
          <button
            v-for="cat in commandCategories"
            :key="cat.id"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[10px] font-black transition-all"
            :class="
              commandCategory === cat.id
                ? 'bg-slate-900 border-slate-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]'
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'
            "
            @click="commandCategory = cat.id"
          >
            <component :is="cat.icon" size="14" stroke-width="2.5" />
            {{ cat.id }}
          </button>
        </div>

        <!-- Command Buttons Grid -->
        <div class="flex-1 overflow-y-auto p-4 content-start">
          <div class="grid grid-cols-2 gap-3">
            <button
              v-for="cmd in commandCategories.find((c) => c.id === commandCategory)?.commands"
              :key="cmd.code"
              class="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-400 hover:bg-slate-50/50 hover:scale-[1.02] active:scale-[0.98] transition-all group shadow-sm text-center"
              @click="selectGridCommand(cmd.code)"
            >
              <div
                class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-900 transition-colors"
              >
                <component :is="cmd.icon" size="20" stroke-width="2.5" />
              </div>
              <div class="flex flex-col min-w-0">
                <span
                  class="text-xs font-bold text-slate-800 leading-tight group-hover:text-slate-900"
                  >{{ cmd.label }}</span
                >
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Params Step -->
      <div v-if="commandSelectorStep === 'params'" class="p-6 space-y-5 flex-1 overflow-y-auto">
        <div class="pb-2 mb-4 border-b border-slate-50 flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600"
          >
            <component
              :is="
                commandCategories
                  .flatMap((c) => c.commands)
                  .find((c) => c.code === selectedCommandType)?.icon || IconSettings
              "
              size="16"
            />
          </div>
          <div>
            <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Editing Parameters
            </div>
            <div class="text-xs font-bold text-slate-800">
              {{
                commandCategories
                  .flatMap((c) => c.commands)
                  .find((c) => c.code === selectedCommandType)?.label || 'Unknown Command'
              }}
            </div>
          </div>
        </div>

        <div v-if="selectedCommandType === ZCommandCode.ShowMessage" class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
            >Message Text</label
          >
          <textarea
            v-model="messageText"
            rows="4"
            class="w-full border border-slate-200 rounded px-3 py-2 text-sm font-sans resize-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none"
          ></textarea>
        </div>

        <!-- Add more parameter fields as needed... for now I'll implement the basic structure -->
        <div v-else class="py-10 text-center text-slate-400 text-xs italic">
          Parameter fields for this command are being improved.
        </div>

        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase rounded-lg transition-colors"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-slate-900/20 transition-all active:scale-95"
            @click="handleSave"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
</style>
