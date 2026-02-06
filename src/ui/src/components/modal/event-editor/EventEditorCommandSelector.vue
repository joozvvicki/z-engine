<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  IconSettings,
  IconX,
  IconChevronLeft,
  IconMessage,
  IconList,
  IconHourglass,
  IconFlare,
  IconVariable,
  IconMapPin,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconUser,
  IconRefresh,
  IconGhost,
  IconEye,
  IconEyeOff,
  IconVolume,
  IconCode,
  IconMusic,
  IconChevronDownLeft,
  IconChevronDownRight,
  IconChevronUpLeft,
  IconChevronUpRight,
  IconWalk,
  IconShoe,
  IconLock,
  IconBolt,
  IconClock,
  IconPhoto,
  IconBox,
  IconChevronRight
} from '@tabler/icons-vue'
import { ZCommandCode, ZMoveCode, type ZEventCommand, type ZMoveCommand } from '@engine/types'
import type { ZEventPage } from '@engine/types'
import { useEditorStore } from '@ui/stores/editor'
import MessageParams from './params/MessageParams.vue'
import FlowParams from './params/FlowParams.vue'
import StateParams from './params/StateParams.vue'
import MovementParams from './params/MovementParams.vue'
import AudioParams from './params/AudioParams.vue'
import VisualParams from './params/VisualParams.vue'

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

// --- Parameter fields ---

// Messages
const messageText = ref('')
const messageStyle = ref(0) // 0: Window, 1: Bubble
const messageTarget = ref(0) // 0: This Event, -1: Player, >0: Event ID

// Flow
const waitFrames = ref(60)

// State
const selfSwitchCh = ref<'A' | 'B' | 'C' | 'D'>('A')
const switchState = ref<number>(1) // 1: ON, 0: OFF
const switchId = ref('1')
const variableId = ref('1')
const variableOp = ref(0)
const variableValue = ref(0)

// Movement
const selectedDirection = ref(2) // 2: Down, 4: Left, 6: Right, 8: Up
const transferMapId = ref(1)
const transferX = ref(0)
const transferY = ref(0)
const transferDirection = ref(2)

// Audio
const audioFile = ref('')
const audioVolume = ref(90)
const audioPitch = ref(100)
const audioDuration = ref(1)

// Set Move Route
const moveRouteTarget = ref<string | number>(0) // 0: This, -1: Player
const moveRouteWait = ref(true)
const moveRouteRepeat = ref(false)
const moveRouteThrough = ref(false)
const moveRouteCommands = ref<ZMoveCommand[]>([])

const variableOps = [
  { label: 'Set (=)', value: 0 },
  { label: 'Add (+)', value: 1 },
  { label: 'Sub (-)', value: 2 },
  { label: 'Mul (*)', value: 3 },
  { label: 'Div (/)', value: 4 },
  { label: 'Mod (%)', value: 5 }
]

// Show Choices
const choiceTexts = ref<string[]>(['Yes', 'No'])

// Conditional Branch
const branchType = ref(0) // 0: Switch, 1: Variable
const branchSwitchId = ref('1')
const branchSwitchValue = ref(1)
const branchVariableId = ref('1')
const branchVariableValue = ref(0)

// Set Event Graphic
const graphicAssetId = ref('')
const graphicGroup = ref<'character' | 'tile'>('character')
const graphicX = ref(0)
const graphicY = ref(0)
const graphicW = ref(1)
const graphicH = ref(1)

const directions = [
  { label: 'Down', value: 2, icon: IconArrowDown },
  { label: 'Left', value: 4, icon: IconArrowLeft },
  { label: 'Right', value: 6, icon: IconArrowRight },
  { label: 'Up', value: 8, icon: IconArrowUp }
]

const moveActions = [
  // Movement
  { code: ZMoveCode.MOVE_DOWN, label: 'Move Down', icon: IconArrowDown },
  { code: ZMoveCode.MOVE_LEFT, label: 'Move Left', icon: IconArrowLeft },
  { code: ZMoveCode.MOVE_RIGHT, label: 'Move Right', icon: IconArrowRight },
  { code: ZMoveCode.MOVE_UP, label: 'Move Up', icon: IconArrowUp },
  { code: ZMoveCode.MOVE_LOWER_LEFT, label: 'Move Lower Left', icon: IconChevronDownLeft },
  { code: ZMoveCode.MOVE_LOWER_RIGHT, label: 'Move Lower Right', icon: IconChevronDownRight },
  { code: ZMoveCode.MOVE_UPPER_LEFT, label: 'Move Upper Left', icon: IconChevronUpLeft },
  { code: ZMoveCode.MOVE_UPPER_RIGHT, label: 'Move Upper Right', icon: IconChevronUpRight },
  { code: ZMoveCode.MOVE_RANDOM, label: 'Move Random', icon: IconRefresh },
  { code: ZMoveCode.MOVE_TOWARD_PLAYER, label: 'Move Toward Player', icon: IconUser },
  { code: ZMoveCode.MOVE_AWAY_PLAYER, label: 'Move Away From Player', icon: IconUser },
  { code: ZMoveCode.STEP_FORWARD, label: 'Step Forward', icon: IconArrowDown },
  { code: ZMoveCode.STEP_BACKWARD, label: 'Step Backward', icon: IconArrowUp },
  { code: ZMoveCode.JUMP, label: 'Jump...', icon: IconBolt, paramNames: ['X Offset', 'Y Offset'] },

  // Turning
  { code: ZMoveCode.TURN_DOWN, label: 'Turn Down', icon: IconArrowDown },
  { code: ZMoveCode.TURN_LEFT, label: 'Turn Left', icon: IconArrowLeft },
  { code: ZMoveCode.TURN_RIGHT, label: 'Turn Right', icon: IconArrowRight },
  { code: ZMoveCode.TURN_UP, label: 'Turn Up', icon: IconArrowUp },
  { code: ZMoveCode.TURN_90_RIGHT, label: 'Turn 90° Right', icon: IconArrowRight },
  { code: ZMoveCode.TURN_90_LEFT, label: 'Turn 90° Left', icon: IconArrowLeft },
  { code: ZMoveCode.TURN_180, label: 'Turn 180°', icon: IconRefresh },
  { code: ZMoveCode.TURN_90_RIGHT_LEFT, label: 'Turn 90° R/L', icon: IconRefresh },
  { code: ZMoveCode.TURN_RANDOM, label: 'Turn Random', icon: IconRefresh },
  { code: ZMoveCode.TURN_TOWARD_PLAYER, label: 'Turn Toward Player', icon: IconUser },
  { code: ZMoveCode.TURN_AWAY_PLAYER, label: 'Turn Away From Player', icon: IconUser },

  // Wait
  { code: ZMoveCode.WAIT, label: 'Wait...', icon: IconHourglass, paramNames: ['Frames'] },

  // State
  { code: ZMoveCode.SPEED, label: 'Change Speed...', icon: IconBolt, paramNames: ['Speed (1-6)'] },
  {
    code: ZMoveCode.FREQUENCY,
    label: 'Change Freq...',
    icon: IconClock,
    paramNames: ['Freq (1-5)']
  },
  { code: ZMoveCode.WALK_ANIM_ON, label: 'Walk Anim ON', icon: IconWalk },
  { code: ZMoveCode.WALK_ANIM_OFF, label: 'Walk Anim OFF', icon: IconWalk },
  { code: ZMoveCode.STEP_ANIM_ON, label: 'Step Anim ON', icon: IconShoe },
  { code: ZMoveCode.STEP_ANIM_OFF, label: 'Step Anim OFF', icon: IconShoe },
  { code: ZMoveCode.DIR_FIX_ON, label: 'Dir Fix ON', icon: IconLock },
  { code: ZMoveCode.DIR_FIX_OFF, label: 'Dir Fix OFF', icon: IconLock },
  { code: ZMoveCode.THROUGH_ON, label: 'Through ON', icon: IconGhost },
  { code: ZMoveCode.THROUGH_OFF, label: 'Through OFF', icon: IconGhost },
  { code: ZMoveCode.TRANSPARENT_ON, label: 'Transparent ON', icon: IconEyeOff },
  { code: ZMoveCode.TRANSPARENT_OFF, label: 'Transparent OFF', icon: IconEye },
  {
    code: ZMoveCode.CHANGE_GRAPHIC,
    label: 'Change Graphic...',
    icon: IconPhoto,
    paramNames: ['Asset']
  },
  {
    code: ZMoveCode.CHANGE_OPACITY,
    label: 'Change Opacity...',
    icon: IconBox,
    paramNames: ['Opacity (0-255)']
  },
  {
    code: ZMoveCode.CHANGE_BLEND,
    label: 'Change Blend...',
    icon: IconBox,
    paramNames: ['Blend Mode']
  },

  // Other
  { code: ZMoveCode.PLAY_SE, label: 'Play SE...', icon: IconVolume, paramNames: ['SE File'] },
  { code: ZMoveCode.SCRIPT, label: 'Script...', icon: IconCode, paramNames: ['Script'] }
]

const selectedMoveCommandIndex = ref<number | null>(null)

watch(
  () => props.show,
  (isShown) => {
    if (isShown) {
      if (props.isAutonomousMode) {
        commandSelectorStep.value = 'params'
        selectedCommandType.value = ZCommandCode.SetMoveRoute
        moveRouteCommands.value = JSON.parse(JSON.stringify(props.page.moveRoute || []))
        moveRouteTarget.value = 0
        moveRouteWait.value = false
        moveRouteThrough.value = false
        moveRouteRepeat.value = true
      } else if (props.initialCommand) {
        commandSelectorStep.value = 'params'
        selectedCommandType.value = props.initialCommand.code

        const params = props.initialCommand.parameters

        if (props.initialCommand.code === ZCommandCode.ShowMessage) {
          messageText.value = String(params[0] || '')
          messageStyle.value = Number(params[1] || 0)
          messageTarget.value = Number(params[2] ?? 0)
        } else if (props.initialCommand.code === ZCommandCode.Wait) {
          waitFrames.value = Number(params[0] || 60)
        } else if (props.initialCommand.code === ZCommandCode.ControlSelfSwitch) {
          selfSwitchCh.value = (params[0] as 'A' | 'B' | 'C' | 'D') || 'A'
          switchState.value = Number(params[1] ?? 1)
        } else if (props.initialCommand.code === ZCommandCode.ControlSwitch) {
          switchId.value = String(params[0] || '1')
          switchState.value = Number(params[1] ?? 1)
        } else if (props.initialCommand.code === ZCommandCode.ControlVariable) {
          variableId.value = String(params[0] || '1')
          variableOp.value = Number(params[1] || 0)
          variableValue.value = Number(params[2] || 0)
        } else if (props.initialCommand.code === ZCommandCode.SetEventDirection) {
          selectedDirection.value = Number(params[0] || 2)
        } else if (props.initialCommand.code === ZCommandCode.TransferPlayer) {
          transferMapId.value = Number(params[0] || 1)
          transferX.value = Number(params[1] || 0)
          transferY.value = Number(params[2] || 0)
          transferDirection.value = Number(params[3] || 2)
        } else if (props.initialCommand.code === ZCommandCode.SetMoveRoute) {
          moveRouteTarget.value = (params[0] as string | number) ?? 0
          moveRouteCommands.value = JSON.parse(JSON.stringify(params[1] || []))
          moveRouteWait.value = Boolean(params[2] ?? true)
          moveRouteRepeat.value = Boolean(params[3] ?? false)
          moveRouteThrough.value = Boolean(params[4] ?? false)
        } else if (
          props.initialCommand.code === ZCommandCode.PlayBGM ||
          props.initialCommand.code === ZCommandCode.PlayBGS ||
          props.initialCommand.code === ZCommandCode.PlaySE
        ) {
          const config = params[0] as { name: string; volume: number; pitch: number }
          audioFile.value = config.name
          audioVolume.value = config.volume
          audioPitch.value = config.pitch
        } else if (
          props.initialCommand.code === ZCommandCode.FadeOutBGM ||
          props.initialCommand.code === ZCommandCode.FadeOutBGS
        ) {
          audioDuration.value = Number(params[0] || 1)
        } else if (props.initialCommand.code === ZCommandCode.ShowChoices) {
          choiceTexts.value = JSON.parse(JSON.stringify(params[0] || ['Yes', 'No']))
          messageStyle.value = Number(params[1] || 0)
          messageTarget.value = Number(params[2] ?? 0)
        } else if (props.initialCommand.code === ZCommandCode.ConditionalBranch) {
          branchType.value = Number(params[0] || 0)
          if (branchType.value === 0) {
            branchSwitchId.value = String(params[1] || '1')
            branchSwitchValue.value = params[2] === 1 ? 1 : 0
          } else {
            branchVariableId.value = String(params[1] || '1')
            branchVariableValue.value = Number(params[2] || 0)
          }
        } else if (props.initialCommand.code === ZCommandCode.SetEventGraphic) {
          const g = params[0] as {
            assetId?: string
            group?: 'character' | 'tile'
            x?: number
            y?: number
          }
          graphicAssetId.value = g?.assetId || ''
          graphicGroup.value = g?.group || 'character'
          graphicX.value = g?.x || 0
          graphicY.value = g?.y || 0
        }
      } else {
        commandSelectorStep.value = 'grid'
        selectedCommandType.value = null
        messageText.value = ''
        choiceTexts.value = ['Yes', 'No']
        branchType.value = 0
        branchSwitchId.value = '1'
        branchSwitchValue.value = 1
        branchVariableId.value = '1'
        branchVariableValue.value = 0
        graphicAssetId.value = ''
        graphicGroup.value = 'character'
        graphicX.value = 0
        graphicY.value = 0
        waitFrames.value = 60
        selfSwitchCh.value = 'A'
        switchState.value = 1
        switchId.value = '1'
        variableId.value = '1'
        variableValue.value = 0
        variableOp.value = 0
        selectedDirection.value = 2
        transferMapId.value = store.activeMap?.id || 1
        transferX.value = 0
        transferY.value = 0
        transferDirection.value = 2
        moveRouteTarget.value = 0
        moveRouteCommands.value = []
        moveRouteWait.value = true
        moveRouteRepeat.value = false
        moveRouteThrough.value = false
        audioFile.value = ''
        audioPitch.value = 100
        audioDuration.value = 1
        messageStyle.value = 0
        messageTarget.value = 0
      }
    }
  },
  { immediate: true }
)

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
    commands: [{ code: ZCommandCode.SetEventGraphic, label: 'Change Graphic', icon: IconFlare }]
  },
  {
    id: 'Audio',
    icon: IconMusic,
    commands: [
      { code: ZCommandCode.PlayBGM, label: 'Play BGM', icon: IconMusic },
      { code: ZCommandCode.FadeOutBGM, label: 'Fadeout BGM', icon: IconVolume },
      { code: ZCommandCode.PlayBGS, label: 'Play BGS', icon: IconVolume },
      { code: ZCommandCode.FadeOutBGS, label: 'Fadeout BGS', icon: IconVolume },
      { code: ZCommandCode.PlaySE, label: 'Play SE', icon: IconVolume },
      { code: ZCommandCode.StopSE, label: 'Stop SE', icon: IconVolume }
    ]
  }
]

const selectGridCommand = (code: number): void => {
  selectedCommandType.value = code
  commandSelectorStep.value = 'params'
}

const addMoveCommand = (code: string | ZMoveCode): void => {
  const cmd: ZMoveCommand = { code }
  const meta = moveActions.find((a) => a.code === code)
  if (meta?.paramNames) {
    if (code === ZMoveCode.WAIT) cmd.params = [60]
    else if (code === ZMoveCode.JUMP) cmd.params = [0, 0]
    else if (code === ZMoveCode.SPEED) cmd.params = [4]
    else if (code === ZMoveCode.FREQUENCY) cmd.params = [3]
    else if (code === ZMoveCode.CHANGE_OPACITY) cmd.params = [255]
    else cmd.params = meta.paramNames.map(() => '')
  }
  moveRouteCommands.value.push(cmd)
  selectedMoveCommandIndex.value = moveRouteCommands.value.length - 1
}

const removeMoveCommand = (index: number): void => {
  moveRouteCommands.value.splice(index, 1)
  selectedMoveCommandIndex.value = null
}

const handleSave = (): void => {
  if (props.isAutonomousMode) {
    emit('save-autonomous-route', JSON.parse(JSON.stringify(moveRouteCommands.value)))
    return
  }

  if (selectedCommandType.value !== null) {
    let finalParams: unknown[] = []

    if (selectedCommandType.value === ZCommandCode.ShowMessage) {
      finalParams = [messageText.value, messageStyle.value, messageTarget.value]
    } else if (selectedCommandType.value === ZCommandCode.Wait) {
      finalParams = [waitFrames.value]
    } else if (selectedCommandType.value === ZCommandCode.ControlSelfSwitch) {
      finalParams = [selfSwitchCh.value, switchState.value]
    } else if (selectedCommandType.value === ZCommandCode.ControlSwitch) {
      finalParams = [switchId.value, switchState.value]
    } else if (selectedCommandType.value === ZCommandCode.ControlVariable) {
      finalParams = [variableId.value, variableOp.value, variableValue.value]
    } else if (selectedCommandType.value === ZCommandCode.SetEventDirection) {
      finalParams = [selectedDirection.value]
    } else if (selectedCommandType.value === ZCommandCode.TransferPlayer) {
      finalParams = [transferMapId.value, transferX.value, transferY.value, transferDirection.value]
    } else if (selectedCommandType.value === ZCommandCode.SetMoveRoute) {
      finalParams = [
        moveRouteTarget.value,
        moveRouteCommands.value,
        moveRouteWait.value,
        moveRouteRepeat.value,
        moveRouteThrough.value
      ]
    } else if (
      selectedCommandType.value === ZCommandCode.PlayBGM ||
      selectedCommandType.value === ZCommandCode.PlayBGS ||
      selectedCommandType.value === ZCommandCode.PlaySE
    ) {
      finalParams = [{ name: audioFile.value, volume: audioVolume.value, pitch: audioPitch.value }]
    } else if (
      selectedCommandType.value === ZCommandCode.FadeOutBGM ||
      selectedCommandType.value === ZCommandCode.FadeOutBGS
    ) {
      finalParams = [audioDuration.value]
    } else if (selectedCommandType.value === ZCommandCode.StopSE) {
      finalParams = []
    } else if (selectedCommandType.value === ZCommandCode.ShowChoices) {
      finalParams = [[...choiceTexts.value], messageStyle.value, messageTarget.value]
    } else if (selectedCommandType.value === ZCommandCode.ConditionalBranch) {
      if (branchType.value === 0) {
        finalParams = [0, branchSwitchId.value, branchSwitchValue.value]
      } else {
        finalParams = [1, branchVariableId.value, branchVariableValue.value]
      }
    } else if (selectedCommandType.value === ZCommandCode.SetEventGraphic) {
      finalParams = [
        {
          assetId: graphicAssetId.value,
          group: graphicGroup.value,
          x: graphicX.value,
          y: graphicY.value,
          w: graphicW.value,
          h: graphicH.value
        }
      ]
    }

    emit('save', {
      code: selectedCommandType.value,
      parameters: finalParams
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
            <!-- Show Message -->
            <MessageParams
              v-if="
                selectedCommandType === ZCommandCode.ShowMessage ||
                selectedCommandType === ZCommandCode.ShowChoices
              "
              v-model:text="messageText"
              v-model:style="messageStyle"
              v-model:target="messageTarget"
              v-model:choices="choiceTexts"
              :type="selectedCommandType"
              :events="store.activeMap?.events || []"
            />

            <!-- Wait -->
            <!-- Flow Control -->
            <FlowParams
              v-else-if="
                selectedCommandType === ZCommandCode.Wait ||
                selectedCommandType === ZCommandCode.ConditionalBranch
              "
              v-model:wait-frames="waitFrames"
              v-model:branch-type="branchType"
              v-model:switch-id="branchSwitchId"
              v-model:switch-val="branchSwitchValue"
              v-model:var-id="branchVariableId"
              v-model:var-val="branchVariableValue"
              :type="selectedCommandType"
              :switches="store.systemSwitches"
              :variables="store.systemVariables"
            />

            <!-- Control Self Switch -->
            <!-- State Control -->
            <StateParams
              v-else-if="
                selectedCommandType === ZCommandCode.ControlSelfSwitch ||
                selectedCommandType === ZCommandCode.ControlSwitch ||
                selectedCommandType === ZCommandCode.ControlVariable
              "
              v-model:self-switch-ch="selfSwitchCh"
              v-model:switch-id="switchId"
              v-model:switch-state="switchState"
              v-model:var-id="variableId"
              v-model:var-op="variableOp"
              v-model:var-val="variableValue"
              :type="selectedCommandType"
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
              v-model:transfer-map-id="transferMapId"
              v-model:transfer-x="transferX"
              v-model:transfer-y="transferY"
              v-model:transfer-direction="transferDirection"
              v-model:selected-direction="selectedDirection"
              v-model:move-route-target="moveRouteTarget"
              v-model:move-route-wait="moveRouteWait"
              v-model:move-route-repeat="moveRouteRepeat"
              v-model:move-route-through="moveRouteThrough"
              v-model:move-route-commands="moveRouteCommands"
              v-model:selected-move-command-index="selectedMoveCommandIndex"
              :type="selectedCommandType"
              :maps="store.maps"
              :is-autonomous-mode="props.isAutonomousMode"
              :move-actions="moveActions"
              :directions="directions"
              @add-move-command="addMoveCommand"
              @remove-move-command="removeMoveCommand"
            />

            <!-- Audio Control -->
            <AudioParams
              v-else-if="
                [
                  ZCommandCode.PlayBGM,
                  ZCommandCode.PlayBGS,
                  ZCommandCode.PlaySE,
                  ZCommandCode.FadeOutBGM,
                  ZCommandCode.FadeOutBGS
                ].includes(selectedCommandType || -1)
              "
              v-model:audio-file="audioFile"
              v-model:audio-volume="audioVolume"
              v-model:audio-pitch="audioPitch"
              v-model:audio-duration="audioDuration"
              :type="selectedCommandType || 0"
            />

            <!-- Visual Control -->
            <VisualParams
              v-else-if="selectedCommandType === ZCommandCode.SetEventGraphic"
              v-model:graphic-asset-id="graphicAssetId"
              :type="selectedCommandType"
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
                  ZCommandCode.PlaySE,
                  ZCommandCode.FadeOutBGM,
                  ZCommandCode.FadeOutBGS,
                  ZCommandCode.ShowChoices,
                  ZCommandCode.ConditionalBranch,
                  ZCommandCode.SetEventGraphic
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

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300;
}

.segmented-control {
  @apply flex p-1 bg-slate-100 rounded-xl gap-1;
}

.segmented-control.vertical {
  @apply flex-col;
}

.segmented-control button {
  @apply flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all border border-transparent flex items-center justify-center gap-2;
}

.segmented-control button.active {
  @apply bg-white text-slate-800 shadow-sm border-slate-200/50;
}

.segmented-control:not(.vertical) button:hover:not(.active) {
  @apply text-slate-600;
}

.segmented-control.vertical button {
  @apply justify-start;
}
</style>
