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
  IconGhost,
  IconVariable,
  IconMapPin
} from '@tabler/icons-vue'
import { ZCommandCode } from '@engine/types'
import type { ZEventGraphic } from '@engine/types'

const props = defineProps<{
  show: boolean
  editingCommandIndex: number | null
  systemSwitches: string[]
}>()

const emit = defineEmits(['close', 'save'])

const commandSelectorStep = ref<'grid' | 'params'>('grid')
const commandCategory = ref('Messages')
const selectedCommandType = ref(201)
const messageText = ref('')
const cmdParams = ref({
  mapId: 1,
  x: 0,
  y: 0,
  switchId: 0,
  switchOp: 1,
  variableId: 0,
  variableOp: 0,
  variableValue: 0,
  branchType: 0,
  branchId: 0,
  selfSwitchId: 'A',
  selfSwitchValue: true,
  itemId: 0,
  choices: ['', '', ''],
  graphic: null as ZEventGraphic | null,
  waitFrames: 60,
  moveTarget: 0,
  moveRoute: [] as { code: string; params?: unknown[] }[]
})

const commandCategories = [
  {
    id: 'Messages',
    icon: IconMessage,
    commands: [
      { code: ZCommandCode.ShowMessage, name: 'Show Message', icon: IconMessage },
      { code: ZCommandCode.ShowChoices, name: 'Show Choices', icon: IconList }
    ]
  },
  {
    id: 'Flow',
    icon: IconSettings,
    commands: [
      { code: ZCommandCode.ConditionalBranch, name: 'Conditional Branch', icon: IconSettings },
      { code: ZCommandCode.Wait, name: 'Wait', icon: IconHourglass }
    ]
  },
  {
    id: 'State',
    icon: IconVariable,
    commands: [
      { code: ZCommandCode.ControlSwitch, name: 'Control Switch', icon: IconVariable },
      { code: ZCommandCode.ControlVariable, name: 'Control Variable', icon: IconVariable },
      { code: ZCommandCode.ControlSelfSwitch, name: 'Control Self Switch', icon: IconVariable }
    ]
  },
  {
    id: 'Movement',
    icon: IconMapPin,
    commands: [
      { code: ZCommandCode.TransferPlayer, name: 'Transfer Player', icon: IconMapPin },
      { code: ZCommandCode.SetMoveRoute, name: 'Set Move Route', icon: IconMapPin },
      { code: ZCommandCode.SetEventDirection, name: 'Change Direction', icon: IconSettings }
    ]
  },
  {
    id: 'Visuals',
    icon: IconFlare,
    commands: [
      { code: ZCommandCode.SetEventGraphic, name: 'Change Graphic', icon: IconGhost },
      { code: ZCommandCode.ShowAnimation, name: 'Show Animation', icon: IconFlare }
    ]
  }
]

const selectGridCommand = (code: number) => {
  selectedCommandType.value = code
  commandSelectorStep.value = 'params'
}

const handleSave = () => {
  emit('save', {
    code: selectedCommandType.value,
    params: getParamsByCode(selectedCommandType.value)
  })
}

const getParamsByCode = (code: number) => {
  switch (code) {
    case ZCommandCode.ShowMessage:
      return [messageText.value]
    case ZCommandCode.ShowChoices:
      return [cmdParams.value.choices.filter((c) => c !== '')]
    case ZCommandCode.ControlSwitch:
      return [cmdParams.value.switchId, cmdParams.value.switchOp]
    case ZCommandCode.ControlVariable:
      return [cmdParams.value.variableId, cmdParams.value.variableOp, cmdParams.value.variableValue]
    case ZCommandCode.ControlSelfSwitch:
      return [cmdParams.value.selfSwitchId, cmdParams.value.selfSwitchValue]
    case ZCommandCode.TransferPlayer:
      return [cmdParams.value.mapId, cmdParams.value.x, cmdParams.value.y]
    case ZCommandCode.ConditionalBranch:
      return [cmdParams.value.branchType, cmdParams.value.branchId, cmdParams.value.variableValue]
    case ZCommandCode.Wait:
      return [cmdParams.value.waitFrames]
    case ZCommandCode.ShowAnimation:
      return [cmdParams.value.variableId] // Re-using variableId for animId
    case ZCommandCode.SetEventDirection:
      return [cmdParams.value.branchId] // Re-using branchId for direction
    case ZCommandCode.SetEventGraphic:
      return [cmdParams.value.graphic]
    case ZCommandCode.SetMoveRoute:
      return [cmdParams.value.moveTarget, cmdParams.value.moveRoute]
    default:
      return []
  }
}

// Logic to populate fields when editing
const openForEdit = (cmd: any) => {
  selectedCommandType.value = cmd.code
  commandSelectorStep.value = 'params'
  // ... populate cmdParams based on cmd.parameters ...
  // This might need more refinement
}

defineExpose({ openForEdit })
</script>

<template>
  <div
    v-if="props.show"
    class="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
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
            v-if="commandSelectorStep === 'params' && props.editingCommandIndex === null"
            class="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-500"
            @click="commandSelectorStep = 'grid'"
          >
            <IconChevronLeft size="16" />
          </button>
          <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500">
            {{
              props.editingCommandIndex !== null
                ? 'Edit Command'
                : commandSelectorStep === 'grid'
                  ? 'Insert Command'
                  : 'Command Parameters'
            }}
          </h3>
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
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
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
              class="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 hover:scale-[1.02] active:scale-[0.98] transition-all group shadow-sm text-center"
              @click="selectGridCommand(cmd.code)"
            >
              <div
                class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"
              >
                <component :is="cmd.icon" size="20" stroke-width="2.5" />
              </div>
              <span
                class="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 leading-tight"
              >
                {{ cmd.name }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Params Step -->
      <div v-if="commandSelectorStep === 'params'" class="p-6 space-y-5 flex-1 overflow-y-auto">
        <div class="pb-2 mb-4 border-b border-slate-50 flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
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
            <div class="text-[9px] font-black text-blue-500 uppercase tracking-widest">
              Editing Parameters
            </div>
            <div class="text-xs font-bold text-slate-800">
              {{
                commandCategories
                  .flatMap((c) => c.commands)
                  .find((c) => c.code === selectedCommandType)?.name
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
            class="w-full border border-slate-200 rounded px-3 py-2 text-sm font-sans resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
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
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            @click="handleSave"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
