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
  IconBox
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
      class="bg-white rounded-xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200 flex flex-col"
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
        class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0"
      >
        <div class="flex items-center gap-2">
          <button
            v-if="commandSelectorStep === 'params' && !props.initialCommand"
            class="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
            @click="commandSelectorStep = 'grid'"
          >
            <IconChevronLeft size="16" />
            Back
          </button>
          <div class="flex items-center gap-4">
            <span class="text-xs font-black uppercase text-slate-800 tracking-wide">
              {{ props.initialCommand ? 'Edit Command' : 'Command Selector' }}
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
      <div
        v-if="commandSelectorStep === 'params'"
        class="p-6 space-y-5 flex-1 overflow-y-auto flex flex-col"
      >
        <div class="pb-2 mb-4 border-b border-slate-50 flex items-center gap-2 shrink-0">
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
              {{ props.initialCommand ? 'Editing Parameters' : 'Set Parameters' }}
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

        <!-- Param Fields based on command type -->
        <div class="space-y-4 flex-1">
          <!-- Show Message -->
          <div v-if="selectedCommandType === ZCommandCode.ShowMessage" class="space-y-4">
            <div class="space-y-3">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Message Text</label
              >
              <textarea
                v-model="messageText"
                rows="4"
                class="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-sans resize-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 outline-none transition-all"
                placeholder="Enter message text..."
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Window Style</label
                >
                <div class="flex gap-2">
                  <button
                    v-for="s in [
                      { val: 0, label: 'Standard' },
                      { val: 1, label: 'Bubble' }
                    ]"
                    :key="s.val"
                    class="flex-1 py-2 rounded-lg text-[10px] font-black border transition-all"
                    :class="
                      messageStyle === s.val
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                    "
                    @click="messageStyle = s.val"
                  >
                    {{ s.label }}
                  </button>
                </div>
              </div>

              <div class="space-y-2" v-if="messageStyle === 1">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Target</label
                >
                <select
                  v-model.number="messageTarget"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                >
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
              </div>
            </div>
          </div>

          <!-- Wait -->
          <div v-else-if="selectedCommandType === ZCommandCode.Wait" class="space-y-3">
            <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
              >Wait Duration (Frames)</label
            >
            <div class="flex items-center gap-4">
              <input
                v-model.number="waitFrames"
                type="number"
                class="w-32 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-sm font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
              />
              <span class="text-[10px] text-slate-400 font-bold uppercase"
                >≈ {{ (waitFrames / 60).toFixed(2) }} Seconds</span
              >
            </div>
          </div>

          <!-- Control Self Switch -->
          <div v-else-if="selectedCommandType === ZCommandCode.ControlSelfSwitch" class="space-y-4">
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Self Switch</label
              >
              <div class="flex rounded-lg overflow-hidden border border-slate-100">
                <button
                  v-for="ch in ['A', 'B', 'C', 'D']"
                  :key="ch"
                  class="flex-1 py-2 text-xs font-black transition-all"
                  :class="
                    selfSwitchCh === ch
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  "
                  @click="selfSwitchCh = ch as any"
                >
                  {{ ch }}
                </button>
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">State</label>
              <div class="flex gap-2">
                <button
                  v-for="s in [
                    { val: 1, label: 'ON' },
                    { val: 0, label: 'OFF' }
                  ]"
                  :key="s.val"
                  class="flex-1 py-2 rounded-lg text-[10px] font-black border transition-all"
                  :class="
                    switchState === s.val
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                  "
                  @click="switchState = s.val"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Control Switch -->
          <div v-else-if="selectedCommandType === ZCommandCode.ControlSwitch" class="space-y-4">
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >System Switch</label
              >
              <select
                v-model="switchId"
                class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
              >
                <option
                  v-for="(sw, idx) in store.systemSwitches"
                  :key="idx"
                  :value="String(idx + 1)"
                >
                  #{{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(None)' }}
                </option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">State</label>
              <div class="flex gap-2">
                <button
                  v-for="s in [
                    { val: 1, label: 'ON' },
                    { val: 0, label: 'OFF' }
                  ]"
                  :key="s.val"
                  class="flex-1 py-2 rounded-lg text-[10px] font-black border transition-all"
                  :class="
                    switchState === s.val
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                  "
                  @click="switchState = s.val"
                >
                  {{ s.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Control Variable -->
          <div v-else-if="selectedCommandType === ZCommandCode.ControlVariable" class="space-y-4">
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >System Variable</label
              >
              <select
                v-model="variableId"
                class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
              >
                <option
                  v-for="(v, idx) in store.systemVariables"
                  :key="idx"
                  :value="String(idx + 1)"
                >
                  #{{ String(idx + 1).padStart(3, '0') }}: {{ v || '(None)' }}
                </option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Operation</label
                >
                <select
                  v-model="variableOp"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                >
                  <option v-for="op in variableOps" :key="op.value" :value="op.value">
                    {{ op.label }}
                  </option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Value</label
                >
                <input
                  v-model.number="variableValue"
                  type="number"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <!-- Set Event Direction -->
          <div v-else-if="selectedCommandType === ZCommandCode.SetEventDirection" class="space-y-4">
            <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
              >Direction</label
            >
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="dir in directions"
                :key="dir.value"
                class="flex items-center gap-3 p-3 rounded-xl border transition-all"
                :class="
                  selectedDirection === dir.value
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300'
                "
                @click="selectedDirection = dir.value"
              >
                <component :is="dir.icon" size="18" />
                <span class="text-xs font-black uppercase">{{ dir.label }}</span>
              </button>
            </div>
          </div>

          <!-- Transfer Player -->
          <div v-else-if="selectedCommandType === ZCommandCode.TransferPlayer" class="space-y-4">
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Destination Map</label
              >
              <select
                v-model.number="transferMapId"
                class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
              >
                <option v-for="m in store.maps" :key="m.id" :value="m.id">
                  #{{ String(m.id).padStart(3, '0') }}: {{ m.name }}
                </option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >X Coordinate</label
                >
                <input
                  v-model.number="transferX"
                  type="number"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Y Coordinate</label
                >
                <input
                  v-model.number="transferY"
                  type="number"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                />
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Facing After Transfer</label
              >
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="dir in directions"
                  :key="dir.value"
                  class="flex flex-col items-center gap-1 p-2 rounded-lg border transition-all"
                  :class="
                    transferDirection === dir.value
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                  "
                  @click="transferDirection = dir.value"
                >
                  <component :is="dir.icon" size="14" />
                  <span class="text-[9px] font-black uppercase">{{ dir.label }}</span>
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
            <div class="w-64 flex flex-col gap-4 shrink-0">
              <div v-if="!props.isAutonomousMode" class="space-y-2">
                <span class="text-[9px] font-black uppercase tracking-wider text-slate-400"
                  >Target Selection</span
                >
                <div class="flex flex-col gap-1">
                  <button
                    class="flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all"
                    :class="
                      moveRouteTarget === 0
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white'
                    "
                    @click="moveRouteTarget = 0"
                  >
                    <IconRobot size="16" />
                    <span class="text-xs font-bold">This Event</span>
                  </button>
                  <button
                    class="flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all"
                    :class="
                      moveRouteTarget === -1
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white'
                    "
                    @click="moveRouteTarget = -1"
                  >
                    <IconUser size="16" />
                    <span class="text-xs font-bold">Player</span>
                  </button>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-[9px] font-black uppercase text-slate-400">Other ID:</span>
                    <input
                      v-model="moveRouteTarget"
                      type="text"
                      class="flex-1 bg-slate-50 border border-slate-100 rounded-md px-2 py-1 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div v-if="!props.isAutonomousMode" class="space-y-3 pt-2 border-t border-slate-100">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <div
                    class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                    :class="
                      moveRouteWait
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 group-hover:border-slate-400'
                    "
                  >
                    <input v-model="moveRouteWait" type="checkbox" class="hidden" />
                    <IconX v-if="moveRouteWait" size="10" stroke-width="4" />
                  </div>
                  <span class="text-[10px] font-bold uppercase text-slate-600"
                    >Wait for Completion</span
                  >
                </label>

                <label class="flex items-center gap-2 cursor-pointer group">
                  <div
                    class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                    :class="
                      moveRouteRepeat
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 group-hover:border-slate-400'
                    "
                  >
                    <input v-model="moveRouteRepeat" type="checkbox" class="hidden" />
                    <IconRefresh v-if="moveRouteRepeat" size="10" stroke-width="4" />
                  </div>
                  <span class="text-[10px] font-bold uppercase text-slate-600">Repeat Action</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer group">
                  <div
                    class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                    :class="
                      moveRouteThrough
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 group-hover:border-slate-400'
                    "
                  >
                    <input v-model="moveRouteThrough" type="checkbox" class="hidden" />
                    <IconX v-if="moveRouteThrough" size="10" stroke-width="4" />
                  </div>
                  <span class="text-[10px] font-bold uppercase text-slate-600">Through Mode</span>
                </label>
              </div>

              <div class="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                <p class="text-[10px] text-slate-400 italic">
                  Movement route will be executed as a sequence of steps.
                </p>
              </div>
            </div>

            <!-- Middle: Current Route -->
            <div
              class="flex-1 flex flex-col overflow-hidden bg-slate-50 rounded-xl border border-slate-100"
            >
              <div class="p-3 border-b border-slate-100 bg-white flex justify-between items-center">
                <span class="text-[10px] font-black uppercase text-slate-400"
                  >Route Steps ({{ moveRouteCommands.length }})</span
                >
                <button
                  class="text-[9px] font-black uppercase text-red-400 hover:text-red-600"
                  @click="moveRouteCommands = []"
                >
                  Clear All
                </button>
              </div>
              <div class="flex-1 overflow-y-auto p-2 space-y-1">
                <div
                  v-for="(cmd, idx) in moveRouteCommands"
                  :key="idx"
                  class="group flex flex-col gap-1 px-3 py-2 bg-white border rounded-lg shadow-sm transition-all cursor-pointer"
                  :class="
                    selectedMoveCommandIndex === idx
                      ? 'border-slate-900 ring-1 ring-slate-900/10'
                      : 'border-slate-100 hover:border-slate-300'
                  "
                  @click="selectedMoveCommandIndex = idx"
                >
                  <div class="flex items-center gap-3">
                    <span class="text-[10px] text-slate-300 font-mono w-4">{{ idx + 1 }}</span>
                    <component
                      :is="moveActions.find((m) => m.code === cmd.code)?.icon || IconSettings"
                      size="14"
                      class="text-slate-400"
                    />
                    <span class="text-xs font-bold text-slate-700 flex-1">{{
                      moveActions.find((m) => m.code === cmd.code)?.label || cmd.code
                    }}</span>
                    <button
                      class="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all p-1"
                      @click.stop="removeMoveCommand(idx)"
                    >
                      <IconTrash size="14" />
                    </button>
                  </div>

                  <!-- Parameter Editor Inline -->
                  <div
                    v-if="
                      selectedMoveCommandIndex === idx &&
                      moveActions.find((a) => a.code === cmd.code)?.paramNames
                    "
                    class="mt-2 pt-2 border-t border-slate-50 grid grid-cols-1 gap-2"
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
                          class="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] font-bold outline-none focus:bg-white focus:border-slate-900"
                        />
                      </template>
                      <template v-else-if="cmd.code === ZMoveCode.SPEED">
                        <select
                          v-model.number="cmd.params![pIdx]"
                          class="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] font-bold outline-none focus:bg-white focus:border-slate-900"
                        >
                          <option v-for="s in [1, 2, 3, 4, 5, 6]" :key="s" :value="s">
                            Speed {{ s }} {{ s === 4 ? '(Normal)' : '' }}
                          </option>
                        </select>
                      </template>
                      <template v-else-if="cmd.code === ZMoveCode.FREQUENCY">
                        <select
                          v-model.number="cmd.params![pIdx]"
                          class="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] font-bold outline-none focus:bg-white focus:border-slate-900"
                        >
                          <option v-for="f in [1, 2, 3, 4, 5]" :key="f" :value="f">
                            Freq {{ f }} {{ f === 3 ? '(Normal)' : '' }}
                          </option>
                        </select>
                      </template>
                      <template v-else-if="cmd.code === ZMoveCode.JUMP">
                        <input
                          v-model.number="cmd.params![pIdx]"
                          type="number"
                          class="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] font-bold outline-none focus:bg-white focus:border-slate-900"
                        />
                      </template>
                      <template v-else>
                        <input
                          v-model="cmd.params![pIdx]"
                          class="w-full bg-slate-50 border border-slate-100 rounded px-2 py-1 text-[10px] font-bold outline-none focus:bg-white focus:border-slate-900"
                        />
                      </template>
                    </div>
                  </div>
                </div>
                <div
                  v-if="moveRouteCommands.length === 0"
                  class="flex-1 flex items-center justify-center py-20 text-slate-300 text-xs italic"
                >
                  Add steps from the right panel
                </div>
              </div>
            </div>

            <!-- Right: Add Actions -->
            <div class="w-48 overflow-y-auto pr-2 flex flex-col gap-1">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-2 px-1"
                >Add Actions</label
              >
              <button
                v-for="action in moveActions"
                :key="action.code"
                class="flex items-center gap-2 px-3 py-2 text-left bg-white border border-slate-100 rounded-lg hover:border-slate-400 hover:bg-slate-50 transition-all group"
                @click="addMoveCommand(action.code)"
              >
                <component
                  :is="action.icon"
                  size="14"
                  class="text-slate-400 group-hover:text-slate-900"
                />
                <span class="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">{{
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
            class="space-y-4"
          >
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Audio File
              </label>
              <input
                v-model="audioFile"
                type="text"
                class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                placeholder="e.g. Theme1.mp3"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Volume (0-100)
                </label>
                <input
                  v-model.number="audioVolume"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                />
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Pitch (50-150)
                </label>
                <input
                  v-model.number="audioPitch"
                  type="number"
                  min="50"
                  max="150"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div v-else-if="selectedCommandType === ZCommandCode.FadeOutBGM" class="space-y-4">
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Duration (Seconds)
              </label>
              <input
                v-model.number="audioDuration"
                type="number"
                min="1"
                class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <!-- Show Choices -->
          <div v-else-if="selectedCommandType === ZCommandCode.ShowChoices" class="space-y-4">
            <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">Choices</label>
            <div class="space-y-2">
              <div v-for="(_, idx) in choiceTexts" :key="idx" class="flex items-center gap-2 group">
                <div class="w-6 text-[10px] text-slate-300 font-black text-center">
                  {{ idx + 1 }}
                </div>
                <input
                  v-model="choiceTexts[idx]"
                  type="text"
                  class="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                  placeholder="Choice text..."
                />
                <button
                  v-if="choiceTexts.length > 1"
                  class="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  @click="choiceTexts.splice(idx, 1)"
                >
                  <IconTrash size="14" />
                </button>
              </div>
              <button
                v-if="choiceTexts.length < 6"
                class="w-full py-2 border border-dashed border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                @click="choiceTexts.push('New Choice')"
              >
                Add Choice
              </button>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Window Style</label
                >
                <div class="flex gap-2">
                  <button
                    v-for="s in [
                      { val: 0, label: 'Standard' },
                      { val: 1, label: 'Bubble' }
                    ]"
                    :key="s.val"
                    class="flex-1 py-2 rounded-lg text-[10px] font-black border transition-all"
                    :class="
                      messageStyle === s.val
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-300'
                    "
                    @click="messageStyle = s.val"
                  >
                    {{ s.label }}
                  </button>
                </div>
              </div>

              <div class="space-y-2" v-if="messageStyle === 1">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Target</label
                >
                <select
                  v-model.number="messageTarget"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                >
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
              </div>
            </div>
          </div>

          <!-- Conditional Branch -->
          <div v-else-if="selectedCommandType === ZCommandCode.ConditionalBranch" class="space-y-4">
            <div class="flex rounded-lg overflow-hidden border border-slate-100">
              <button
                v-for="bt in [
                  { val: 0, label: 'Switch' },
                  { val: 1, label: 'Variable' }
                ]"
                :key="bt.val"
                class="flex-1 py-2 text-[10px] font-black uppercase transition-all"
                :class="
                  branchType === bt.val
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                "
                @click="branchType = bt.val"
              >
                {{ bt.label }}
              </button>
            </div>

            <!-- Switch Condition -->
            <div v-if="branchType === 0" class="space-y-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >System Switch</label
                >
                <select
                  v-model="branchSwitchId"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                >
                  <option
                    v-for="(sw, idx) in store.systemSwitches"
                    :key="idx"
                    :value="String(idx + 1)"
                  >
                    #{{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(None)' }}
                  </option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Required State</label
                >
                <div class="flex gap-2">
                  <button
                    v-for="s in [
                      { val: 1, label: 'ON' },
                      { val: 0, label: 'OFF' }
                    ]"
                    :key="s.val"
                    class="flex-1 py-2 rounded-lg text-[10px] font-black border transition-all"
                    :class="
                      branchSwitchValue === s.val
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                    "
                    @click="branchSwitchValue = s.val"
                  >
                    {{ s.label }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Variable Condition -->
            <div v-else-if="branchType === 1" class="space-y-4">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >System Variable</label
                >
                <select
                  v-model="branchVariableId"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                >
                  <option
                    v-for="(v, idx) in store.systemVariables"
                    :key="idx"
                    :value="String(idx + 1)"
                  >
                    #{{ String(idx + 1).padStart(3, '0') }}: {{ v || '(None)' }}
                  </option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Required Value (=)</label
                >
                <input
                  v-model.number="branchVariableValue"
                  type="number"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <!-- Set Event Graphic -->
          <div v-else-if="selectedCommandType === ZCommandCode.SetEventGraphic" class="space-y-4">
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Asset ID</label
              >
              <input
                v-model="graphicAssetId"
                type="text"
                class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                placeholder="character1.png"
              />
            </div>
            <div class="flex gap-4">
              <div class="flex-1 space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Type</label
                >
                <select
                  v-model="graphicGroup"
                  class="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                >
                  <option value="character">Character</option>
                  <option value="tile">Tile</option>
                </select>
              </div>
              <div v-if="graphicGroup === 'character'" class="flex-1 space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Frame/Index</label
                >
                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model.number="graphicX"
                    type="number"
                    title="Column"
                    class="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                  />
                  <input
                    v-model.number="graphicY"
                    type="number"
                    title="Row"
                    class="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs font-bold focus:bg-white focus:border-slate-900 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            v-else-if="
              selectedCommandType !== ZCommandCode.ShowMessage &&
              selectedCommandType !== ZCommandCode.Wait &&
              selectedCommandType !== ZCommandCode.ControlSelfSwitch &&
              selectedCommandType !== ZCommandCode.ControlSwitch &&
              selectedCommandType !== ZCommandCode.ControlVariable &&
              selectedCommandType !== ZCommandCode.SetEventDirection &&
              selectedCommandType !== ZCommandCode.TransferPlayer &&
              selectedCommandType !== ZCommandCode.SetMoveRoute &&
              selectedCommandType !== ZCommandCode.PlayBGM &&
              selectedCommandType !== ZCommandCode.PlayBGS &&
              selectedCommandType !== ZCommandCode.PlaySE &&
              selectedCommandType !== ZCommandCode.FadeOutBGM &&
              selectedCommandType !== ZCommandCode.FadeOutBGS &&
              selectedCommandType !== ZCommandCode.ShowChoices &&
              selectedCommandType !== ZCommandCode.ConditionalBranch &&
              selectedCommandType !== ZCommandCode.SetEventGraphic
            "
            class="py-10 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200"
          >
            Parameter fields for this command are being improved.
          </div>
        </div>

        <div class="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
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
