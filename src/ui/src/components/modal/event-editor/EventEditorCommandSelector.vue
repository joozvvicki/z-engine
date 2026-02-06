<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  IconX,
  IconChevronLeft,
  IconSettings,
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
  IconRobot,
  IconTrash,
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
            <div v-if="selectedCommandType === ZCommandCode.ShowMessage" class="space-y-5">
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >Message Text</label
                >
                <textarea
                  v-model="messageText"
                  rows="4"
                  class="docs-input min-h-[100px] resize-none"
                  placeholder="Enter message text..."
                ></textarea>
              </div>

              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >Window Style</label
                >
                <div class="segmented-control">
                  <button
                    v-for="s in [
                      { val: 0, label: 'Standard' },
                      { val: 1, label: 'Bubble' }
                    ]"
                    :key="s.val"
                    :class="{ active: messageStyle === s.val }"
                    @click="messageStyle = s.val"
                  >
                    {{ s.label }}
                  </button>
                </div>
              </div>

              <div
                v-if="messageStyle === 1"
                class="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
              >
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >Target</label
                >
                <div class="relative">
                  <select v-model.number="messageTarget" class="docs-input appearance-none">
                    <option :value="0">This Event</option>
                    <option :value="-1">Player</option>
                    <option disabled>--- Events ---</option>
                    <option
                      v-for="ev in store.activeMap?.events.filter((e) => e.name !== 'PlayerStart')"
                      :key="ev.id"
                      :value="Number(ev.id)"
                    >
                      ID {{ ev.id }}: {{ ev.name }}
                    </option>
                  </select>
                  <IconArrowDown
                    size="14"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            <!-- Wait -->
            <div v-else-if="selectedCommandType === ZCommandCode.Wait" class="space-y-3">
              <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                >Wait Duration (Frames)</label
              >
              <div class="flex items-center gap-4">
                <input v-model.number="waitFrames" type="number" class="docs-input w-32" />
                <span class="text-[10px] text-slate-400 font-bold uppercase"
                  >≈ {{ (waitFrames / 60).toFixed(2) }} Seconds</span
                >
              </div>
            </div>

            <!-- Control Self Switch -->
            <div
              v-else-if="selectedCommandType === ZCommandCode.ControlSelfSwitch"
              class="space-y-5"
            >
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >Self Switch ID</label
                >
                <div
                  class="flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    v-for="ch in ['A', 'B', 'C', 'D']"
                    :key="ch"
                    class="flex-1 py-3 text-xs font-black transition-all"
                    :class="
                      selfSwitchCh === ch
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-400 hover:bg-slate-50'
                    "
                    @click="selfSwitchCh = ch as any"
                  >
                    {{ ch }}
                  </button>
                </div>
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >State</label
                >
                <div class="segmented-control">
                  <button
                    v-for="s in [
                      { val: 1, label: 'ON' },
                      { val: 0, label: 'OFF' }
                    ]"
                    :key="s.val"
                    :class="{ active: switchState === s.val }"
                    @click="switchState = s.val"
                  >
                    {{ s.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Control Switch -->
            <div v-else-if="selectedCommandType === ZCommandCode.ControlSwitch" class="space-y-5">
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >System Switch</label
                >
                <div class="relative">
                  <select v-model="switchId" class="docs-input appearance-none">
                    <option
                      v-for="(sw, idx) in store.systemSwitches"
                      :key="idx"
                      :value="String(idx + 1)"
                    >
                      #{{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(Untitled)' }}
                    </option>
                  </select>
                  <IconArrowDown
                    size="14"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >State</label
                >
                <div class="segmented-control">
                  <button
                    v-for="s in [
                      { val: 1, label: 'ON' },
                      { val: 0, label: 'OFF' }
                    ]"
                    :key="s.val"
                    :class="{ active: switchState === s.val }"
                    @click="switchState = s.val"
                  >
                    {{ s.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Control Variable -->
            <div v-else-if="selectedCommandType === ZCommandCode.ControlVariable" class="space-y-5">
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >System Variable</label
                >
                <div class="relative">
                  <select v-model="variableId" class="docs-input appearance-none">
                    <option
                      v-for="(v, idx) in store.systemVariables"
                      :key="idx"
                      :value="String(idx + 1)"
                    >
                      #{{ String(idx + 1).padStart(3, '0') }}: {{ v || '(Untitled)' }}
                    </option>
                  </select>
                  <IconArrowDown
                    size="14"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                    >Operation</label
                  >
                  <div class="relative">
                    <select v-model="variableOp" class="docs-input appearance-none">
                      <option v-for="op in variableOps" :key="op.value" :value="op.value">
                        {{ op.label }}
                      </option>
                    </select>
                    <IconArrowDown
                      size="14"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                    >Value</label
                  >
                  <input v-model.number="variableValue" type="number" class="docs-input" />
                </div>
              </div>
            </div>

            <!-- Set Event Direction -->
            <div
              v-else-if="selectedCommandType === ZCommandCode.SetEventDirection"
              class="space-y-4"
            >
              <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                >Direction</label
              >
              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="dir in directions"
                  :key="dir.value"
                  class="flex items-center gap-3 p-3 rounded-2xl border transition-all"
                  :class="
                    selectedDirection === dir.value
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/10'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  "
                  @click="selectedDirection = dir.value"
                >
                  <component :is="dir.icon" size="18" />
                  <span class="text-xs font-black uppercase">{{ dir.label }}</span>
                </button>
              </div>
            </div>

            <!-- Transfer Player -->
            <div v-else-if="selectedCommandType === ZCommandCode.TransferPlayer" class="space-y-5">
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >Destination Map</label
                >
                <div class="relative">
                  <select v-model.number="transferMapId" class="docs-input appearance-none">
                    <option v-for="m in store.maps" :key="m.id" :value="m.id">
                      #{{ String(m.id).padStart(3, '0') }}: {{ m.name }}
                    </option>
                  </select>
                  <IconArrowDown
                    size="14"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                    >Tile X</label
                  >
                  <input v-model.number="transferX" type="number" class="docs-input" />
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                    >Tile Y</label
                  >
                  <input v-model.number="transferY" type="number" class="docs-input" />
                </div>
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >Facing After Transfer</label
                >
                <div class="grid grid-cols-4 gap-3">
                  <button
                    v-for="dir in directions"
                    :key="dir.value"
                    class="flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all"
                    :class="
                      transferDirection === dir.value
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    "
                    @click="transferDirection = dir.value"
                  >
                    <component :is="dir.icon" size="16" />
                    <span class="text-[10px] font-black uppercase">{{ dir.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Set Move Route -->
            <div
              v-else-if="selectedCommandType === ZCommandCode.SetMoveRoute"
              class="flex gap-6 h-full overflow-hidden"
            >
              <!-- Left Side: Config -->
              <div class="w-64 flex flex-col gap-5 shrink-0">
                <div v-if="!props.isAutonomousMode" class="space-y-3">
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                    >Target Selection</span
                  >
                  <div class="flex flex-col gap-2">
                    <!-- Styled Target Selector could go here, simplifying for brevity -->
                    <div class="segmented-control vertical">
                      <button
                        :class="{ active: moveRouteTarget === 0 }"
                        @click="moveRouteTarget = 0"
                      >
                        <IconRobot size="14" /> This Event
                      </button>
                      <button
                        :class="{ active: moveRouteTarget === -1 }"
                        @click="moveRouteTarget = -1"
                      >
                        <IconUser size="14" /> Player
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  v-if="!props.isAutonomousMode"
                  class="space-y-3 pt-4 border-t border-slate-200"
                >
                  <label
                    class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors"
                  >
                    <div class="relative inline-flex items-center">
                      <input v-model="moveRouteWait" type="checkbox" class="sr-only peer" />
                      <div
                        class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"
                      ></div>
                    </div>
                    <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
                      >Wait for Complete</span
                    >
                  </label>

                  <label
                    class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors"
                  >
                    <div class="relative inline-flex items-center">
                      <input v-model="moveRouteRepeat" type="checkbox" class="sr-only peer" />
                      <div
                        class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"
                      ></div>
                    </div>
                    <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
                      >Repeat Action</span
                    >
                  </label>

                  <label
                    class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors"
                  >
                    <div class="relative inline-flex items-center">
                      <input v-model="moveRouteThrough" type="checkbox" class="sr-only peer" />
                      <div
                        class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"
                      ></div>
                    </div>
                    <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
                      >Through Mode</span
                    >
                  </label>
                </div>
              </div>

              <!-- Middle: Current Route -->
              <div
                class="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm"
              >
                <div
                  class="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center"
                >
                  <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest"
                    >Route Steps ({{ moveRouteCommands.length }})</span
                  >
                  <button
                    class="text-[9px] font-black uppercase text-red-400 hover:text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                    @click="moveRouteCommands = []"
                  >
                    Clear All
                  </button>
                </div>
                <div class="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                  <div
                    v-for="(cmd, idx) in moveRouteCommands"
                    :key="idx"
                    class="group flex flex-col gap-1 px-3 py-2 bg-white border rounded-xl shadow-sm transition-all cursor-pointer hover:translate-x-1"
                    :class="
                      selectedMoveCommandIndex === idx
                        ? 'border-slate-900 ring-1 ring-slate-900/10'
                        : 'border-slate-100 hover:border-slate-300'
                    "
                    @click="selectedMoveCommandIndex = idx"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-[9px] text-slate-300 font-mono w-4 font-bold">{{
                        String(idx + 1).padStart(2, '0')
                      }}</span>
                      <div
                        class="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-400"
                      >
                        <component
                          :is="moveActions.find((m) => m.code === cmd.code)?.icon || IconSettings"
                          size="12"
                        />
                      </div>
                      <span class="text-[11px] font-bold text-slate-700 flex-1">{{
                        moveActions.find((m) => m.code === cmd.code)?.label || cmd.code
                      }}</span>
                      <button
                        class="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all p-1"
                        @click.stop="removeMoveCommand(idx)"
                      >
                        <IconTrash size="14" />
                      </button>
                    </div>

                    <!-- Parameter Editor Inline (Styled) -->
                    <div
                      v-if="
                        selectedMoveCommandIndex === idx &&
                        moveActions.find((a) => a.code === cmd.code)?.paramNames
                      "
                      class="mt-2 pt-2 border-t border-slate-50 grid grid-cols-1 gap-2 animate-in fade-in"
                      @click.stop
                    >
                      <div
                        v-for="(pName, pIdx) in moveActions.find((a) => a.code === cmd.code)
                          ?.paramNames"
                        :key="pIdx"
                        class="space-y-1"
                      >
                        <label class="text-[9px] font-black uppercase text-slate-400 block">{{
                          pName
                        }}</label>
                        <template v-if="cmd.code === ZMoveCode.WAIT">
                          <input
                            v-model.number="cmd.params![pIdx]"
                            type="number"
                            class="docs-input py-1 text-xs"
                          />
                        </template>
                        <template
                          v-else-if="
                            cmd.code === ZMoveCode.SPEED || cmd.code === ZMoveCode.FREQUENCY
                          "
                        >
                          <div class="relative">
                            <select
                              v-model.number="cmd.params![pIdx]"
                              class="docs-input py-1 text-xs appearance-none"
                            >
                              <option
                                v-for="n in cmd.code === ZMoveCode.SPEED ? 6 : 5"
                                :key="n"
                                :value="n"
                              >
                                Level {{ n }}
                              </option>
                            </select>
                            <IconArrowDown
                              size="12"
                              class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                          </div>
                        </template>
                        <template v-else>
                          <input v-model="cmd.params![pIdx]" class="docs-input py-1 text-xs" />
                        </template>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="moveRouteCommands.length === 0"
                    class="flex-1 flex flex-col items-center justify-center py-20 text-slate-300 opacity-60"
                  >
                    <IconGhost size="32" class="mb-2" />
                    <span class="text-xs font-bold">No steps added</span>
                  </div>
                </div>
              </div>

              <!-- Right: Add Actions -->
              <div class="w-48 overflow-y-auto pr-2 flex flex-col gap-1.5 custom-scrollbar">
                <label
                  class="text-[10px] font-bold uppercase text-slate-400 block mb-2 px-1 tracking-widest"
                  >Library</label
                >
                <button
                  v-for="action in moveActions"
                  :key="action.code"
                  class="flex items-center gap-2.5 px-3 py-2 text-left bg-white border border-slate-100 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group active:scale-95"
                  @click="addMoveCommand(action.code)"
                >
                  <component
                    :is="action.icon"
                    size="14"
                    class="text-slate-400 group-hover:text-slate-900 transition-colors"
                  />
                  <span class="text-[10px] font-bold text-slate-500 group-hover:text-slate-900">{{
                    action.label
                  }}</span>
                </button>
              </div>
            </div>

            <!-- Audio Helpers -->
            <div
              v-else-if="
                selectedCommandType === ZCommandCode.PlayBGM ||
                selectedCommandType === ZCommandCode.PlaySE
              "
              class="space-y-5"
            >
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">
                  Audio File
                </label>
                <input
                  v-model="audioFile"
                  type="text"
                  class="docs-input"
                  placeholder="e.g. Theme1.mp3"
                />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">
                    Volume %
                  </label>
                  <input
                    v-model.number="audioVolume"
                    type="range"
                    min="0"
                    max="100"
                    class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                  <div class="text-right text-xs font-black">{{ audioVolume }}%</div>
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">
                    Pitch %
                  </label>
                  <input
                    v-model.number="audioPitch"
                    type="range"
                    min="50"
                    max="150"
                    class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  />
                  <div class="text-right text-xs font-black">{{ audioPitch }}%</div>
                </div>
              </div>
            </div>

            <div v-else-if="selectedCommandType === ZCommandCode.FadeOutBGM" class="space-y-3">
              <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">
                Duration (Seconds)
              </label>
              <input v-model.number="audioDuration" type="number" min="1" class="docs-input" />
            </div>

            <!-- Show Choices -->
            <div v-else-if="selectedCommandType === ZCommandCode.ShowChoices" class="space-y-5">
              <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                >Choice List</label
              >
              <div class="space-y-3">
                <div
                  v-for="(_, idx) in choiceTexts"
                  :key="idx"
                  class="flex items-center gap-3 group animate-in slide-in-from-left-2 fade-in"
                >
                  <div
                    class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-black"
                  >
                    {{ idx + 1 }}
                  </div>
                  <input
                    v-model="choiceTexts[idx]"
                    type="text"
                    class="docs-input py-2.5"
                    placeholder="Choice text..."
                  />
                  <button
                    v-if="choiceTexts.length > 1"
                    class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    @click="choiceTexts.splice(idx, 1)"
                  >
                    <IconTrash size="16" />
                  </button>
                </div>
                <button
                  v-if="choiceTexts.length < 6"
                  class="w-full py-3 border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                  @click="choiceTexts.push('New Choice')"
                >
                  <div
                    class="w-4 h-4 rounded bg-current flex items-center justify-center text-white"
                  >
                    <IconArrowDown size="10" />
                  </div>
                  Add Another Choice
                </button>
              </div>

              <!-- ... Additional Choice Params ... -->
            </div>

            <!-- Conditional Branch -->
            <div
              v-else-if="selectedCommandType === ZCommandCode.ConditionalBranch"
              class="space-y-5"
            >
              <div class="segmented-control">
                <button
                  v-for="bt in [
                    { val: 0, label: 'Switch' },
                    { val: 1, label: 'Variable' }
                  ]"
                  :key="bt.val"
                  :class="{ active: branchType === bt.val }"
                  @click="branchType = bt.val"
                >
                  {{ bt.label }}
                </button>
              </div>

              <!-- Switch Condition -->
              <div v-if="branchType === 0" class="space-y-5 px-1">
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                    >System Switch</label
                  >
                  <div class="relative">
                    <select v-model="branchSwitchId" class="docs-input appearance-none">
                      <option
                        v-for="(sw, idx) in store.systemSwitches"
                        :key="idx"
                        :value="String(idx + 1)"
                      >
                        #{{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(Untitled)' }}
                      </option>
                    </select>
                    <IconArrowDown
                      size="14"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                    >Required State</label
                  >
                  <div class="segmented-control">
                    <button
                      v-for="s in [
                        { val: 1, label: 'ON' },
                        { val: 0, label: 'OFF' }
                      ]"
                      :key="s.val"
                      :class="{ active: branchSwitchValue === s.val }"
                      @click="branchSwitchValue = s.val"
                    >
                      {{ s.label }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Variable Condition -->
              <div v-else-if="branchType === 1" class="space-y-5 px-1">
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                    >System Variable</label
                  >
                  <div class="relative">
                    <select v-model="branchVariableId" class="docs-input appearance-none">
                      <option
                        v-for="(v, idx) in store.systemVariables"
                        :key="idx"
                        :value="String(idx + 1)"
                      >
                        #{{ String(idx + 1).padStart(3, '0') }}: {{ v || '(Untitled)' }}
                      </option>
                    </select>
                    <IconArrowDown
                      size="14"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                    >Required Value (=)</label
                  >
                  <input v-model.number="branchVariableValue" type="number" class="docs-input" />
                </div>
              </div>
            </div>

            <!-- Set Event Graphic -->
            <div v-else-if="selectedCommandType === ZCommandCode.SetEventGraphic" class="space-y-5">
              <div class="space-y-3">
                <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
                  >Asset Filename</label
                >
                <input
                  v-model="graphicAssetId"
                  type="text"
                  class="docs-input"
                  placeholder="character1.png"
                />
              </div>
              <!-- ... type/coords fields ... -->
            </div>

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
