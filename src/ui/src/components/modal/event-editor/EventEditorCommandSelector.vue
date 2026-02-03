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
  IconRefresh
} from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand, type ZMoveCommand } from '@engine/types'
import type { ZEventPage } from '@engine/types'
import { useEditorStore } from '@ui/stores/editor'

const props = defineProps<{
  show: boolean
  page: ZEventPage
  systemSwitches: string[]
  initialCommand?: ZEventCommand | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { code: number; parameters: unknown[] }): void
}>()

const store = useEditorStore()

const commandSelectorStep = ref<'grid' | 'params'>('grid')
const commandCategory = ref('Messages')
const selectedCommandType = ref<number | null>(null)

// --- Parameter fields ---

// Messages
const messageText = ref('')

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

// Set Move Route
const moveRouteTarget = ref<string | number>(0) // 0: This, -1: Player
const moveRouteWait = ref(true)
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

const directions = [
  { label: 'Down', value: 2, icon: IconArrowDown },
  { label: 'Left', value: 4, icon: IconArrowLeft },
  { label: 'Right', value: 6, icon: IconArrowRight },
  { label: 'Up', value: 8, icon: IconArrowUp }
]

const moveActions = [
  { code: 'MOVE_DOWN', label: 'Move Down', icon: IconArrowDown },
  { code: 'MOVE_LEFT', label: 'Move Left', icon: IconArrowLeft },
  { code: 'MOVE_RIGHT', label: 'Move Right', icon: IconArrowRight },
  { code: 'MOVE_UP', label: 'Move Up', icon: IconArrowUp },
  { code: 'MOVE_RANDOM', label: 'Move Random', icon: IconRefresh },
  { code: 'MOVE_TOWARD_PLAYER', label: 'Move Toward Player', icon: IconUser },
  { code: 'STEP_FORWARD', label: 'Step Forward', icon: IconArrowDown },
  { code: 'STEP_BACKWARD', label: 'Step Backward', icon: IconArrowUp },
  { code: 'TURN_DOWN', label: 'Turn Down', icon: IconArrowDown },
  { code: 'TURN_LEFT', label: 'Turn Left', icon: IconArrowLeft },
  { code: 'TURN_RIGHT', label: 'Turn Right', icon: IconArrowRight },
  { code: 'TURN_UP', label: 'Turn Up', icon: IconArrowUp },
  { code: 'WAIT', label: 'Wait...', icon: IconHourglass }
]

watch(
  () => props.show,
  (isShown) => {
    if (isShown) {
      if (props.initialCommand) {
        commandSelectorStep.value = 'params'
        selectedCommandType.value = props.initialCommand.code

        const params = props.initialCommand.parameters

        if (props.initialCommand.code === ZCommandCode.ShowMessage) {
          messageText.value = String(params[0] || '')
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
          moveRouteTarget.value = (params[0] as any) ?? 0
          moveRouteCommands.value = JSON.parse(JSON.stringify(params[1] || []))
          moveRouteWait.value = Boolean(params[2] ?? true)
          moveRouteThrough.value = Boolean(params[3] ?? false)
        }
      } else {
        commandSelectorStep.value = 'grid'
        selectedCommandType.value = null
        messageText.value = ''
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
        moveRouteThrough.value = false
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

const addMoveCommand = (code: string): void => {
  const cmd: ZMoveCommand = { code }
  if (code === 'WAIT') cmd.params = [60]
  moveRouteCommands.value.push(cmd)
}

const removeMoveCommand = (index: number): void => {
  moveRouteCommands.value.splice(index, 1)
}

const handleSave = (): void => {
  if (selectedCommandType.value !== null) {
    let finalParams: unknown[] = []

    if (selectedCommandType.value === ZCommandCode.ShowMessage) {
      finalParams = [messageText.value]
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
        moveRouteThrough.value
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
          <div v-if="selectedCommandType === ZCommandCode.ShowMessage" class="space-y-3">
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
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase text-slate-400 block"
                  >Target Character</label
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

              <div class="space-y-3 pt-2 border-t border-slate-100">
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
                  class="group flex items-center gap-3 px-3 py-2 bg-white border border-slate-100 rounded-lg shadow-sm"
                >
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
                    class="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                    @click="removeMoveCommand(idx)"
                  >
                    <IconTrash size="14" />
                  </button>
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

          <div
            v-else
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
