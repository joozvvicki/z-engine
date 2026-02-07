<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IconArrowDown,
  IconRobot,
  IconUser,
  IconSettings,
  IconTrash,
  IconGhost
} from '@tabler/icons-vue'
import {
  ZCommandCode,
  ZMoveCode,
  type ZMoveCommand,
  type ZMap,
  type ZEventCommand
} from '@engine/types'
import type { Component } from 'vue'

const props = defineProps<{
  type: number // 201 (Transfer), 205 (Move Route), 203 (Direction)
  maps: ZMap[]
  isAutonomousMode?: boolean
  moveActions: { code: string | number; label: string; icon: Component; paramNames?: string[] }[]
  directions: { label: string; value: number; icon: Component }[]
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const transferMapId = ref(1)
const transferX = ref(0)
const transferY = ref(0)
const transferDirection = ref(2)
const selectedDirection = ref(2)

// Move Route state
const moveRouteTarget = ref<string | number>(0)
const moveRouteWait = ref(true)
const moveRouteRepeat = ref(false)
const moveRouteThrough = ref(false)
const moveRouteCommands = ref<ZMoveCommand[]>([])
const selectedMoveCommandIndex = ref<number | null>(null)

const initialize = (): void => {
  if (props.isAutonomousMode) {
    // Logic for autonomous move route (from page prop, but here we use initialCommand for consistency if available)
    // Actually, EventEditor passes moveRoute to initialCommand as well if in autonomous mode.
    if (props.initialCommand) {
      moveRouteCommands.value = JSON.parse(JSON.stringify(props.initialCommand.parameters[1] || []))
    }
    moveRouteTarget.value = 0
    moveRouteWait.value = false
    moveRouteThrough.value = false
    moveRouteRepeat.value = true
  } else if (props.initialCommand) {
    const params = props.initialCommand.parameters
    if (props.initialCommand.code === ZCommandCode.SetEventDirection) {
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
    }
  }
}

onMounted(initialize)

const addMoveCommand = (code: string | ZMoveCode): void => {
  const cmd: ZMoveCommand = { code }
  const meta = props.moveActions.find((a) => a.code === code)
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

// Expose data for parent
defineExpose({
  getCommandData: () => {
    let finalParams: unknown[] = []
    if (props.type === ZCommandCode.TransferPlayer) {
      finalParams = [transferMapId.value, transferX.value, transferY.value, transferDirection.value]
    } else if (props.type === ZCommandCode.SetMoveRoute) {
      finalParams = [
        moveRouteTarget.value,
        [...moveRouteCommands.value],
        moveRouteWait.value,
        moveRouteRepeat.value,
        moveRouteThrough.value
      ]
    } else if (props.type === ZCommandCode.SetEventDirection) {
      finalParams = [selectedDirection.value]
    }
    return {
      code: props.type,
      parameters: finalParams
    }
  },
  // Specialized for autonomous route
  getMoveRoute: () => {
    return JSON.parse(JSON.stringify(moveRouteCommands.value))
  }
})
</script>

<template>
  <div class="h-full">
    <!-- Set Event Direction -->
    <template v-if="type === 203">
      <div class="space-y-4">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Direction</label>
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
    </template>

    <!-- Transfer Player -->
    <template v-else-if="type === 201">
      <div class="space-y-5">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Destination Map</label
          >
          <div class="relative">
            <select v-model.number="transferMapId" class="docs-input appearance-none">
              <option v-for="m in maps" :key="m.id" :value="m.id">
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
            <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Tile X</label>
            <input v-model.number="transferX" type="number" class="docs-input" />
          </div>
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Tile Y</label>
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
    </template>

    <!-- Set Move Route -->
    <template v-else-if="type === 205">
      <div class="flex gap-6 h-full overflow-hidden">
        <!-- Left Side: Config -->
        <div class="w-64 flex flex-col gap-5 shrink-0">
          <div v-if="!isAutonomousMode" class="space-y-3">
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
              >Target Selection</span
            >
            <div class="flex flex-col gap-2">
              <div class="segmented-control vertical">
                <button :class="{ active: moveRouteTarget === 0 }" @click="moveRouteTarget = 0">
                  <IconRobot size="14" /> This Event
                </button>
                <button :class="{ active: moveRouteTarget === -1 }" @click="moveRouteTarget = -1">
                  <IconUser size="14" /> Player
                </button>
              </div>
            </div>
          </div>

          <div v-if="!isAutonomousMode" class="space-y-3 pt-4 border-t border-slate-200">
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
                  v-for="(pName, pIdx) in moveActions.find((a) => a.code === cmd.code)?.paramNames"
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
                    v-else-if="cmd.code === ZMoveCode.SPEED || cmd.code === ZMoveCode.FREQUENCY"
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
            @click="addMoveCommand(action.code.toString())"
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
    </template>
  </div>
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";

.docs-input {
  @apply w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none transition-all duration-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-300;
}
.segmented-control {
  @apply flex p-1 bg-slate-100 rounded-xl gap-1;
}
.segmented-control button {
  @apply flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase text-slate-400 transition-all border border-transparent flex items-center justify-center gap-2;
}
.segmented-control button.active {
  @apply bg-white text-slate-800 shadow-sm border-slate-200/50;
}
.segmented-control button:hover:not(.active) {
  @apply text-slate-600;
}
.segmented-control.vertical {
  @apply flex-col;
}
.segmented-control.vertical button {
  @apply justify-start;
}
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
