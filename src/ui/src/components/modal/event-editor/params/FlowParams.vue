<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IconArrowDown } from '@tabler/icons-vue'
import { ZCommandCode, type ZEventCommand } from '@engine/types'

const props = defineProps<{
  type: number // 230 (Wait) or 111 (Conditional)
  switches: string[]
  variables: string[]
  initialCommand?: ZEventCommand | null
}>()

// Internal state
const waitFrames = ref(60)
const branchType = ref(0) // 0: Switch, 1: Variable
const switchId = ref('1')
const switchVal = ref(1)
const varId = ref('1')
const varVal = ref(0)
const selfSwitchCh = ref<'A' | 'B' | 'C' | 'D'>('A')
const selfSwitchVal = ref(1)
const scriptContent = ref('')
const hasElse = ref(false)
const loopMode = ref(0) // 0: Infinite, 1: Repeat
const loopCount = ref(1)
const loopVarId = ref('1')

const initialize = (): void => {
  if (props.initialCommand) {
    const params = props.initialCommand.parameters
    if (props.initialCommand.code === ZCommandCode.Wait) {
      waitFrames.value = Number(params[0] || 60)
    } else if (props.initialCommand.code === ZCommandCode.ConditionalBranch) {
      branchType.value = Number(params[0] || 0)
      if (branchType.value === 0) {
        switchId.value = String(params[1] || '1')
        switchVal.value = params[2] === 1 ? 1 : 0
      } else if (branchType.value === 1) {
        varId.value = String(params[1] || '1')
        varVal.value = Number(params[2] || 0)
      } else if (branchType.value === 2) {
        selfSwitchCh.value = (params[1] as 'A' | 'B' | 'C' | 'D') || 'A'
        selfSwitchVal.value = Number(params[2] ?? 1)
      } else if (branchType.value === 3) {
        scriptContent.value = String(params[1] || '')
      }
      // Parameters for Conditional Branch: [type, id, val, hasElse]
      hasElse.value = params[3] === 1
    } else if (props.initialCommand.code === ZCommandCode.Loop) {
      loopMode.value = Number(params[0] || 0)
      if (loopMode.value === 1) {
        loopCount.value = Number(params[1] || 1)
      } else if (loopMode.value === 2) {
        loopVarId.value = String(params[1] || '1')
      }
    }
  }
}

onMounted(initialize)

// Expose data for parent
defineExpose({
  getCommandData: () => {
    let finalParams: unknown[] = []
    if (props.type === ZCommandCode.Wait) {
      finalParams = [waitFrames.value]
    } else if (props.type === ZCommandCode.ConditionalBranch) {
      if (branchType.value === 0) {
        finalParams = [0, switchId.value, switchVal.value]
      } else if (branchType.value === 1) {
        finalParams = [1, varId.value, varVal.value]
      } else if (branchType.value === 2) {
        finalParams = [2, selfSwitchCh.value, selfSwitchVal.value]
      } else if (branchType.value === 3) {
        finalParams = [3, scriptContent.value]
      }
      finalParams.push(hasElse.value ? 1 : 0)
    } else if (props.type === ZCommandCode.Loop) {
      if (loopMode.value === 0) {
        finalParams = [0]
      } else if (loopMode.value === 1) {
        finalParams = [1, loopCount.value]
      } else if (loopMode.value === 2) {
        finalParams = [2, loopVarId.value]
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
    <template v-if="type === ZCommandCode.Wait">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Wait Duration (Frames)</label
        >
        <div class="flex items-center gap-4">
          <input v-model.number="waitFrames" type="number" class="docs-input w-32" />
          <span class="text-[10px] text-slate-400 font-bold uppercase"
            >≈ {{ ((waitFrames || 0) / 60).toFixed(2) }} Seconds</span
          >
        </div>
      </div>
    </template>

    <template v-else-if="type === ZCommandCode.ConditionalBranch">
      <div class="segmented-control">
        <button
          v-for="bt in [
            { val: 0, label: 'Switch' },
            { val: 1, label: 'Variable' },
            { val: 2, label: 'Self Switch' },
            { val: 3, label: 'Script' }
          ]"
          :key="bt.val"
          :class="{ active: branchType === bt.val }"
          @click="branchType = bt.val"
        >
          {{ bt.label }}
        </button>
      </div>

      <!-- Switch Condition -->
      <div v-if="branchType === 0" class="space-y-5 px-1 pt-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >System Switch</label
          >
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
              :class="{ active: switchVal === s.val }"
              @click="switchVal = s.val"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Variable Condition -->
      <div v-else-if="branchType === 1" class="space-y-5 px-1 pt-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >System Variable</label
          >
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
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Required Value (=)</label
          >
          <input v-model.number="varVal" type="number" class="docs-input" />
        </div>
      </div>

      <!-- Self Switch Condition -->
      <div v-else-if="branchType === 2" class="space-y-5 px-1 pt-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >Self Switch</label
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
              :class="{ active: selfSwitchVal === s.val }"
              @click="selfSwitchVal = s.val"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Script Condition -->
      <div v-else-if="branchType === 3" class="space-y-5 px-1 pt-4">
        <div class="space-y-3">
          <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
            >JavaScript Condition</label
          >
          <textarea
            v-model="scriptContent"
            rows="3"
            class="docs-input font-mono"
            placeholder="return $gameSwitches.value(1) === true;"
          ></textarea>
        </div>
      </div>

      <div class="flex items-center gap-2 px-1 pt-4 border-t border-slate-100">
        <input
          v-model="hasElse"
          type="checkbox"
          class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span
          class="text-[10px] font-bold uppercase text-slate-500 cursor-pointer select-none"
          @click="hasElse = !hasElse"
          >Create Else Branch</span
        >
      </div>
    </template>

    <template v-else-if="type === ZCommandCode.Loop">
      <div class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1">Loop Mode</label>
        <div class="segmented-control">
          <button
            v-for="m in [
              { val: 0, label: 'Infinite' },
              { val: 1, label: 'Repeat Count' },
              { val: 2, label: 'By Variable' }
            ]"
            :key="m.val"
            :class="{ active: loopMode === m.val }"
            @click="loopMode = m.val"
          >
            {{ m.label }}
          </button>
        </div>
      </div>

      <!-- Repeat Count -->
      <div v-if="loopMode === 1" class="space-y-3 px-1 pt-2">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Number of Repeats</label
        >
        <input v-model.number="loopCount" type="number" min="1" class="docs-input" />
      </div>

      <!-- Variable-based Count -->
      <div v-else-if="loopMode === 2" class="space-y-3 px-1 pt-2">
        <label class="text-[10px] font-bold uppercase text-slate-400 block ml-1"
          >Repeat from Variable</label
        >
        <div class="relative">
          <select v-model="loopVarId" class="docs-input appearance-none">
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
