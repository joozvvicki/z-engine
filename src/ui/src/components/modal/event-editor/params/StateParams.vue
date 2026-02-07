<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown } from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 121 (Switch), 122 (Variable), 123 (SelfSwitch)
  switches: string[]
  variables: string[]
  variableOps: { label: string; value: number }[]
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const selfSwitchCh = ref<'A' | 'B' | 'C' | 'D'>('A')
const switchState = ref(1) // 1: ON, 0: OFF
const switchId = ref('1')
const switchEndId = ref('1')
const isRange = ref(false)

const varId = ref('1')
const varEndId = ref('1')
const varSource = ref(0) // 0: Constant, 1: Variable, 2: Random
const varOp = ref(0)
const varVal = ref(0)
const varRandomMin = ref(0)
const varRandomMax = ref(0)

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    if (props.initialCommand.code === ZCommandCode.ControlSelfSwitch) {
      selfSwitchCh.value = (params[0] as 'A' | 'B' | 'C' | 'D') || 'A'
      switchState.value = Number(params[1] ?? 1)
    } else if (props.initialCommand.code === ZCommandCode.ControlSwitch) {
      switchId.value = String(params[0] || '1')
      switchEndId.value = String(params[1] || params[0] || '1')
      isRange.value = switchId.value !== switchEndId.value
      switchState.value = Number(params[2] ?? 1)
    } else if (props.initialCommand.code === ZCommandCode.ControlVariable) {
      varId.value = String(params[0] || '1')
      varEndId.value = String(params[1] || params[0] || '1')
      isRange.value = varId.value !== varEndId.value
      varOp.value = Number(params[2] || 0)
      varSource.value = Number(params[3] || 0)
      if (varSource.value === 0) {
        varVal.value = Number(params[4] || 0)
      } else if (varSource.value === 1) {
        varVal.value = Number(params[4] || 1)
      } else if (varSource.value === 2) {
        varRandomMin.value = Number(params[4] || 0)
        varRandomMax.value = Number(params[5] || 0)
      }
    }
  }
}

onMounted(initialize)

// Expose data for parent
defineExpose({
  getCommandData: () => {
    let finalParams: unknown[] = []
    if (props.type === ZCommandCode.ControlSelfSwitch) {
      finalParams = [selfSwitchCh.value, switchState.value]
    } else if (props.type === ZCommandCode.ControlSwitch) {
      const endId = isRange.value ? switchEndId.value : switchId.value
      finalParams = [switchId.value, endId, switchState.value]
    } else if (props.type === ZCommandCode.ControlVariable) {
      const endId = isRange.value ? varEndId.value : varId.value
      if (varSource.value === 2) {
        finalParams = [varId.value, endId, varOp.value, 2, varRandomMin.value, varRandomMax.value]
      } else {
        finalParams = [varId.value, endId, varOp.value, varSource.value, varVal.value]
      }
    }
    return {
      code: props.type,
      parameters: finalParams
    }
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Control Self Switch -->
    <template v-if="type === ZCommandCode.ControlSelfSwitch">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Self Switch ID</label
        >
        <div class="flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
          <button
            v-for="ch in ['A', 'B', 'C', 'D']"
            :key="ch"
            class="flex-1 py-3 text-xs font-black transition-all"
            :class="
              selfSwitchCh === ch ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'
            "
            @click="selfSwitchCh = ch as any"
          >
            {{ ch }}
          </button>
        </div>
      </div>
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">State</label>
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
    </template>

    <!-- Control Switch -->
    <template v-else-if="type === ZCommandCode.ControlSwitch">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">{{
          isRange ? 'Start Switch' : 'System Switch'
        }}</label>
        <div class="relative">
          <select v-model="switchId" class="docs-input appearance-none">
            <option v-for="(sw, idx) in switches" :key="idx" :value="String(idx + 1)">
              #{{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(Untitled)' }}
            </option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <div v-if="isRange" class="space-y-3 animate-in slide-in-from-top-1 duration-200">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">End Switch</label>
        <div class="relative">
          <select v-model="switchEndId" class="docs-input appearance-none">
            <option v-for="(sw, idx) in switches" :key="idx" :value="String(idx + 1)">
              #{{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(Untitled)' }}
            </option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 px-1">
        <input
          v-model="isRange"
          type="checkbox"
          class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span
          class="text-[10px] font-bold uppercase text-slate-500 cursor-pointer"
          @click="isRange = !isRange"
          >Apply to Range</span
        >
      </div>

      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">State</label>
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
    </template>

    <!-- Control Variable -->
    <template v-else-if="type === ZCommandCode.ControlVariable">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">{{
          isRange ? 'Start Variable' : 'System Variable'
        }}</label>
        <div class="relative">
          <select v-model="varId" class="docs-input appearance-none">
            <option v-for="(v, idx) in variables" :key="idx" :value="String(idx + 1)">
              #{{ String(idx + 1).padStart(3, '0') }}: {{ v || '(Untitled)' }}
            </option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <div v-if="isRange" class="space-y-3 animate-in slide-in-from-top-1 duration-200">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >End Variable</label
        >
        <div class="relative">
          <select v-model="varEndId" class="docs-input appearance-none">
            <option v-for="(v, idx) in variables" :key="idx" :value="String(idx + 1)">
              #{{ String(idx + 1).padStart(3, '0') }}: {{ v || '(Untitled)' }}
            </option>
          </select>
          <IconArrowDown
            size="14"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 px-1">
        <input
          v-model="isRange"
          type="checkbox"
          class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span
          class="text-[10px] font-bold uppercase text-slate-500 cursor-pointer"
          @click="isRange = !isRange"
          >Apply to Range</span
        >
      </div>

      <div class="space-y-3 pt-4 border-t border-slate-100">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Operation</label>
        <div class="segmented-control">
          <button
            v-for="op in variableOps"
            :key="op.value"
            :class="{ active: varOp === op.value }"
            @click="varOp = op.value"
          >
            {{ op.label }}
          </button>
        </div>
      </div>

      <div class="space-y-3 pt-4 border-t border-slate-100">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Operand</label>
        <div class="segmented-control">
          <button
            v-for="s in [
              { val: 0, label: 'Constant' },
              { val: 1, label: 'Variable' },
              { val: 2, label: 'Random' }
            ]"
            :key="s.val"
            :class="{ active: varSource === s.val }"
            @click="varSource = s.val"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div class="animate-in fade-in slide-in-from-top-1 duration-200">
        <!-- Constant -->
        <div v-if="varSource === 0" class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Value</label>
          <input v-model.number="varVal" type="number" class="docs-input" />
        </div>

        <!-- Variable -->
        <div v-else-if="varSource === 1" class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Source Variable</label
          >
          <div class="relative">
            <select v-model="varVal" class="docs-input appearance-none">
              <option v-for="(v, idx) in variables" :key="idx" :value="idx + 1">
                #{{ String(idx + 1).padStart(3, '0') }}: {{ v || '(Untitled)' }}
              </option>
            </select>
            <IconArrowDown
              size="14"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        <!-- Random -->
        <div v-else-if="varSource === 2" class="grid grid-cols-2 gap-4">
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
              >Min Value</label
            >
            <input v-model.number="varRandomMin" type="number" class="docs-input" />
          </div>
          <div class="space-y-3">
            <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
              >Max Value</label
            >
            <input v-model.number="varRandomMax" type="number" class="docs-input" />
          </div>
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
</style>
