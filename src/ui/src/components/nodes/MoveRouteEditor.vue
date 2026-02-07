<script setup lang="ts">
import {
  IconTrash,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconHourglass,
  IconChevronUp,
  IconChevronDown,
  IconSettings,
  IconGhost
} from '@tabler/icons-vue'
import { ZMoveCode, type ZMoveCommand } from '@engine/types'
import { moveActions } from '../modal/event-editor/params/config'
import { ref, type Component } from 'vue'

const props = defineProps<{
  modelValue: ZMoveCommand[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ZMoveCommand[]): void
}>()

const selectedAction = ref('')

const addCommand = (code: string | number): void => {
  const commands = [...props.modelValue]
  const action = moveActions.find((a) => a.code === code)

  const newCmd: ZMoveCommand = { code: code.toString() }

  if (action?.paramNames) {
    if (code === ZMoveCode.WAIT) newCmd.params = [60]
    else if (code === ZMoveCode.JUMP) newCmd.params = [0, 0]
    else if (code === ZMoveCode.SPEED) newCmd.params = [4]
    else if (code === ZMoveCode.FREQUENCY) newCmd.params = [3]
    else if (code === ZMoveCode.CHANGE_OPACITY) newCmd.params = [255]
    else newCmd.params = action.paramNames.map(() => '')
  }

  commands.push(newCmd)
  emit('update:modelValue', commands)
  selectedAction.value = '' // Reset
}

const removeCommand = (index: number): void => {
  const commands = [...props.modelValue]
  commands.splice(index, 1)
  emit('update:modelValue', commands)
}

const moveCommand = (index: number, direction: 'up' | 'down'): void => {
  const commands = [...props.modelValue]
  if (direction === 'up' && index > 0) {
    ;[commands[index], commands[index - 1]] = [commands[index - 1], commands[index]]
  } else if (direction === 'down' && index < commands.length - 1) {
    ;[commands[index], commands[index + 1]] = [commands[index + 1], commands[index]]
  }
  emit('update:modelValue', commands)
}

const getActionColor = (code: string | number): string => {
  const c = code.toString()
  if (c.includes('MOVE') || c.includes('STEP')) return 'bg-blue-50 text-blue-600'
  if (c.includes('TURN')) return 'bg-amber-50 text-amber-600'
  if (c.includes('WAIT')) return 'bg-slate-50 text-slate-600'
  return 'bg-emerald-50 text-emerald-600'
}

const getActionLabel = (code: string | number): string => {
  const codeStr = code.toString()
  return moveActions.find((a) => a.code.toString() === codeStr)?.label || codeStr
}

const getActionIcon = (code: string | number): Component => {
  const codeStr = code.toString()
  return moveActions.find((a) => a.code.toString() === codeStr)?.icon || IconSettings
}

const updateParam = (cmdIdx: number, paramIdx: number, value: unknown): void => {
  const commands = JSON.parse(JSON.stringify(props.modelValue)) as ZMoveCommand[]
  if (!commands[cmdIdx].params) commands[cmdIdx].params = []
  const val = value as string
  commands[cmdIdx].params![paramIdx] = isNaN(Number(val)) ? val : Number(val)
  emit('update:modelValue', commands)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- List of Steps -->
    <div class="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar" @wheel.stop>
      <div
        v-for="(cmd, idx) in modelValue"
        :key="idx"
        class="group flex flex-col gap-2 p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-300 transition-all"
      >
        <div class="flex items-center gap-2">
          <div class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="p-0.5 text-slate-300 hover:text-indigo-500 disabled:opacity-20"
              :disabled="idx === 0"
              @click="moveCommand(idx, 'up')"
            >
              <IconChevronUp size="10" stroke-width="3" />
            </button>
            <button
              class="p-0.5 text-slate-300 hover:text-indigo-500 disabled:opacity-20"
              :disabled="idx === modelValue.length - 1"
              @click="moveCommand(idx, 'down')"
            >
              <IconChevronDown size="10" stroke-width="3" />
            </button>
          </div>
          <div
            class="w-7 h-7 rounded-lg flex items-center justify-center"
            :class="getActionColor(cmd.code)"
          >
            <component :is="getActionIcon(cmd.code)" size="13" stroke-width="2.5" />
          </div>

          <div class="flex flex-1 items-center gap-3 min-w-0">
            <span
              class="text-[10px] font-black uppercase text-slate-800 truncate tracking-tight px-1"
            >
              {{ getActionLabel(cmd.code) }}
            </span>

            <!-- Inline Params for simple commands -->
            <div
              v-if="moveActions.find((a) => a.code.toString() === cmd.code.toString())?.paramNames"
              class="flex items-center gap-3 overflow-hidden"
            >
              <div
                v-for="(pName, pIdx) in moveActions.find(
                  (a) => a.code.toString() === cmd.code.toString()
                )?.paramNames"
                :key="pIdx"
                class="flex items-center gap-1.5"
              >
                <span
                  class="text-[8px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap"
                >
                  {{ pName }}
                </span>
                <input
                  :value="cmd.params?.[pIdx]"
                  type="text"
                  class="w-12 bg-slate-50/70 text-[10px] text-slate-900 font-bold px-1.5 py-0.5 border border-slate-100 rounded-md focus:border-indigo-400 focus:bg-white focus:shadow-sm outline-none transition-all"
                  @input="updateParam(idx, pIdx, ($event.target as HTMLInputElement).value)"
                  @mousedown.stop
                />
              </div>
            </div>
          </div>

          <button
            class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg"
            @click="removeCommand(idx)"
          >
            <IconTrash size="12" />
          </button>
        </div>
      </div>

      <div
        v-if="modelValue.length === 0"
        class="py-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300"
      >
        <IconGhost size="24" class="opacity-20 mb-1" />
        <span class="text-[10px] font-bold">No steps added</span>
      </div>
    </div>

    <!-- Dynamic Controls & Actions -->
    <div class="flex flex-col gap-2 pt-2 border-t border-slate-100">
      <!-- Quick D-Pad -->
      <div class="grid grid-cols-5 gap-1">
        <button
          v-for="btn in [
            { code: ZMoveCode.MOVE_UP, icon: IconArrowUp },
            { code: ZMoveCode.MOVE_DOWN, icon: IconArrowDown },
            { code: ZMoveCode.MOVE_LEFT, icon: IconArrowLeft },
            { code: ZMoveCode.MOVE_RIGHT, icon: IconArrowRight },
            { code: ZMoveCode.WAIT, icon: IconHourglass }
          ]"
          :key="btn.code"
          class="flex flex-col items-center justify-center p-2 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition-all group/btn"
          @click="addCommand(btn.code)"
        >
          <component :is="btn.icon" size="14" stroke-width="2.5" />
        </button>
      </div>

      <!-- Full Dropdown -->
      <div class="relative group/select">
        <select
          v-model="selectedAction"
          class="w-full bg-slate-50 text-slate-900 border border-slate-100 text-[10px] font-black uppercase tracking-wider rounded-xl px-3 py-2 appearance-none cursor-pointer hover:border-slate-300 transition-all outline-none pr-8"
          @change="addCommand(selectedAction)"
        >
          <option value="" disabled>Library...</option>
          <option v-for="action in moveActions" :key="action.code" :value="action.code">
            {{ action.label }}
          </option>
        </select>
        <div
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center gap-1"
        >
          <IconPlus size="12" stroke-width="3" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #cbd5e1;
}
</style>
