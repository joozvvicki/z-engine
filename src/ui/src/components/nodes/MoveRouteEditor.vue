<script setup lang="ts">
import { IconTrash, IconSettings, IconPlus } from '@tabler/icons-vue'
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
        class="group flex flex-col gap-2 p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-200 transition-all"
      >
        <div class="flex items-center gap-2.5">
          <span class="text-[9px] font-mono text-slate-300 w-4 font-bold opacity-80">
            {{ idx + 1 }}
          </span>
          <div
            class="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"
          >
            <component :is="getActionIcon(cmd.code)" size="11" />
          </div>
          <span
            class="text-[10px] font-black uppercase text-slate-700 flex-1 truncate tracking-tight"
          >
            {{ getActionLabel(cmd.code) }}
          </span>
          <button
            class="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all hover:scale-110"
            @click="removeCommand(idx)"
          >
            <IconTrash size="11" />
          </button>
        </div>

        <!-- Inline Params if applicable -->
        <div
          v-if="moveActions.find((a) => a.code.toString() === cmd.code.toString())?.paramNames"
          class="ml-6 pt-2 border-t border-slate-50 flex flex-col gap-2"
        >
          <div
            v-for="(pName, pIdx) in moveActions.find(
              (a) => a.code.toString() === cmd.code.toString()
            )?.paramNames"
            :key="pIdx"
            class="flex items-center gap-2.5"
          >
            <span
              class="text-[8px] font-black uppercase tracking-tight text-slate-400 min-w-[80px] truncate"
            >
              {{ pName }}
            </span>
            <input
              :value="cmd.params?.[pIdx]"
              type="text"
              class="flex-1 max-w-[100px] bg-slate-50/70 text-[11px] text-slate-800 font-bold px-2 py-1 border border-slate-100 rounded-md focus:border-indigo-500 focus:bg-white focus:shadow-sm outline-none transition-all placeholder:text-slate-200"
              @input="updateParam(idx, pIdx, ($event.target as HTMLInputElement).value)"
            />
          </div>
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

    <!-- Quick Add Dropdown -->
    <div class="pt-2 border-t border-slate-100">
      <div class="relative">
        <select
          v-model="selectedAction"
          class="w-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-xl px-3 py-2.5 appearance-none cursor-pointer hover:bg-black transition-colors"
          @change="addCommand(selectedAction)"
        >
          <option value="" disabled>+ Add Movement Step</option>
          <option v-for="action in moveActions" :key="action.code" :value="action.code">
            {{ action.label }}
          </option>
        </select>
        <IconPlus
          size="14"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
        />
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
