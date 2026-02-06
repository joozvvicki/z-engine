<script setup lang="ts">
import {
  IconGhost,
  IconWalk,
  IconBolt,
  IconRepeat,
  IconPlayerPlay,
  IconMouse,
  IconCircleCheck,
  IconChevronDown
} from '@tabler/icons-vue'
import type { ZEventPage } from '@engine/types'
import { ZEventTrigger } from '@engine/types'
import { useEditorStore } from '@ui/stores/editor'
import { useDatabaseStore } from '@ui/stores/database'

const props = defineProps<{
  hasSelection: boolean
  characterUrl: (filename: string) => string
}>()

const page = defineModel<ZEventPage>('page', { required: true })
const store = useEditorStore()
const db = useDatabaseStore()

const emit = defineEmits([
  'select-graphic',
  'set-graphic-from-selection',
  'clear-graphic',
  'edit-move-route'
])

const triggers = [
  {
    value: ZEventTrigger.Action,
    label: 'Action',
    icon: IconMouse,
    description: 'Interact with the event'
  },
  {
    value: ZEventTrigger.PlayerTouch,
    label: 'Player Touch',
    icon: IconWalk,
    description: 'Player walks into event'
  },
  {
    value: ZEventTrigger.EventTouch,
    label: 'Event Touch',
    icon: IconBolt,
    description: 'Event walks into player'
  },
  {
    value: ZEventTrigger.Autorun,
    label: 'Autorun',
    icon: IconPlayerPlay,
    description: 'Runs automatically'
  },
  {
    value: ZEventTrigger.Parallel,
    label: 'Parallel',
    icon: IconRepeat,
    description: 'Runs in background'
  }
]

const variableOps = [
  { label: '≥', value: 0 },
  { label: '≤', value: 1 },
  { label: '>', value: 2 },
  { label: '<', value: 3 },
  { label: '=', value: 4 },
  { label: '≠', value: 5 }
]
</script>

<template>
  <div
    class="w-[320px] bg-white border-r border-slate-200 flex flex-col pt-6 px-5 gap-8 overflow-y-auto shrink-0 min-h-0 custom-scrollbar pb-10"
  >
    <!-- Conditions Group -->
    <div class="space-y-4">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Conditions
      </h3>

      <div class="space-y-3">
        <!-- Switch 1 -->
        <div
          class="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 transition-colors hover:border-slate-300"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wide"
              >Switch 1</span
            >
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="!!page.conditions.switch1Id"
                @change="page.conditions.switch1Id = page.conditions.switch1Id ? '' : '1'"
              />
              <div
                class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full shadow-inner"
              ></div>
            </label>
          </div>

          <div v-if="page.conditions.switch1Id" class="relative">
            <select
              v-model="page.conditions.switch1Id"
              class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            >
              <option v-for="(sw, idx) in store.systemSwitches" :key="idx" :value="String(idx + 1)">
                {{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(Untitled)' }}
              </option>
            </select>
            <IconChevronDown
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size="14"
            />
          </div>
        </div>

        <!-- Switch 2 (Assuming exists in data structure or just keep 1 for now based on original file) -->
        <!-- Original file only had switch1Id visible in template, keeping faithful to original logic -->

        <!-- Variable -->
        <div
          class="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 transition-colors hover:border-slate-300"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wide"
              >Variable</span
            >
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="!!page.conditions.variableId"
                @change="page.conditions.variableId = page.conditions.variableId ? '' : '1'"
              />
              <div
                class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full shadow-inner"
              ></div>
            </label>
          </div>

          <div v-if="page.conditions.variableId" class="space-y-2">
            <div class="relative">
              <select
                v-model="page.conditions.variableId"
                class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
              >
                <option
                  v-for="(v, idx) in store.systemVariables"
                  :key="idx"
                  :value="String(idx + 1)"
                >
                  {{ String(idx + 1).padStart(3, '0') }}: {{ v || '(Untitled)' }}
                </option>
              </select>
              <IconChevronDown
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size="14"
              />
            </div>

            <div class="flex gap-2">
              <div class="relative w-16 shrink-0">
                <select
                  v-model="page.conditions.variableOp"
                  class="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-center appearance-none cursor-pointer hover:bg-slate-50 transition-colors focus:border-indigo-500 outline-none"
                >
                  <option v-for="op in variableOps" :key="op.value" :value="op.value">
                    {{ op.label }}
                  </option>
                </select>
              </div>
              <input
                v-model.number="page.conditions.variableValue"
                type="number"
                class="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300"
                placeholder="Value"
              />
            </div>
          </div>
        </div>

        <!-- Self Switch -->
        <div
          class="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 transition-colors hover:border-slate-300"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wide"
              >Self Switch</span
            >
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="!!page.conditions.selfSwitchCh"
                @change="page.conditions.selfSwitchCh = page.conditions.selfSwitchCh ? '' : 'A'"
              />
              <div
                class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full shadow-inner"
              ></div>
            </label>
          </div>

          <div
            v-if="page.conditions.selfSwitchCh"
            class="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm"
          >
            <button
              v-for="ch in ['A', 'B', 'C', 'D']"
              :key="ch"
              class="flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all"
              :class="
                page.conditions.selfSwitchCh === ch
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              "
              @click="page.conditions.selfSwitchCh = ch"
            >
              {{ ch }}
            </button>
          </div>
        </div>

        <!-- Item -->
        <div
          class="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 transition-colors hover:border-slate-300"
        >
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wide"
              >Has Item</span
            >
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="!!page.conditions.item"
                @change="page.conditions.item = page.conditions.item ? '' : '1'"
              />
              <div
                class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full shadow-inner"
              ></div>
            </label>
          </div>

          <div v-if="page.conditions.item" class="relative">
            <select
              v-model="page.conditions.item"
              class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            >
              <option v-for="item in db.items" :key="item.id" :value="String(item.id)">
                {{ item.name }}
              </option>
            </select>
            <IconChevronDown
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size="14"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Appearance Group -->
    <div class="space-y-4">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Appearance
      </h3>

      <div class="flex gap-4">
        <div
          class="w-24 h-24 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2nk5uamNYwYP//8/xyM2jB4wYDBsIqKikq8Gg4dOoQXR21g8IIBg2EVg4AAAABJRU5ErkJggg==')] bg-repeat border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-center relative overflow-hidden cursor-pointer transition-all group shadow-inner bg-slate-50"
          @dblclick="emit('select-graphic')"
        >
          <template v-if="page.graphic">
            <div
              v-if="page.graphic.group === 'character'"
              class="w-full h-full relative flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300"
            >
              <div
                class="pixelated drop-shadow-md"
                :style="{
                  width: `${page.graphic.srcW || 48}px`,
                  height: `${page.graphic.srcH || 48}px`,
                  backgroundImage: `url(${props.characterUrl(page.graphic.assetId)})`,
                  backgroundPosition:
                    page.graphic.srcX !== undefined
                      ? `-${page.graphic.srcX}px -${page.graphic.srcY}px`
                      : `-${(page.graphic.x || 0) * 48}px -${(page.graphic.y || 0) * 48}px`
                }"
              ></div>
            </div>
            <div
              v-else
              class="w-full h-full relative flex items-center justify-center transform scale-90"
            >
              <div
                class="pixelated drop-shadow-md"
                :style="{
                  width: `${(page.graphic.w || 1) * 48}px`,
                  height: `${(page.graphic.h || 1) * 48}px`,
                  backgroundImage: `url(${props.characterUrl(page.graphic.assetId)})`,
                  backgroundPosition: `-${(page.graphic.x || 0) * 48}px -${(page.graphic.y || 0) * 48}px`,
                  backgroundSize: 'auto'
                }"
              ></div>
            </div>

            <div
              class="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[9px] font-bold text-center py-1 truncate backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {{ page.graphic.assetId }}
            </div>
          </template>

          <div
            v-else
            class="text-slate-300 flex flex-col items-center gap-1 group-hover:text-indigo-400 transition-colors"
          >
            <IconGhost size="24" stroke-width="1.5" />
            <span class="text-[9px] font-black uppercase tracking-wider">Empty</span>
          </div>
        </div>

        <div class="flex-1 flex flex-col gap-2 justify-center">
          <button
            class="w-full px-3 py-2 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-wide rounded-xl transition-all shadow-md shadow-slate-200 active:scale-95 active:shadow-none"
            @click="emit('select-graphic')"
          >
            Select Graphic
          </button>

          <button
            v-if="props.hasSelection"
            class="w-full px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold uppercase tracking-wide rounded-xl transition-colors border border-slate-200 shadow-sm"
            @click="emit('set-graphic-from-selection')"
          >
            Use Map Sel.
          </button>

          <button
            class="w-full px-3 py-2 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 text-[10px] font-bold uppercase tracking-wide rounded-xl transition-colors border border-slate-200 hover:border-rose-200"
            @click="emit('clear-graphic')"
          >
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Autonomous Movement Group -->
    <div class="space-y-4">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Autonomous Movement
      </h3>

      <div class="space-y-3">
        <div class="space-y-1.5">
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1"
            >Type</span
          >
          <div class="relative">
            <select
              v-model="page.moveType"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none"
            >
              <option value="fixed">Fixed</option>
              <option value="random">Random</option>
              <option value="approach">Approach</option>
              <option value="custom">Custom</option>
            </select>
            <IconChevronDown
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size="14"
            />
          </div>
        </div>

        <div
          v-if="page.moveType === 'custom'"
          class="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div class="space-y-2">
            <label
              class="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors"
            >
              <div class="relative inline-flex items-center">
                <input v-model="page.moveRouteRepeat" type="checkbox" class="sr-only peer" />
                <div
                  class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"
                ></div>
              </div>
              <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
                >Repeat Route</span
              >
            </label>

            <label
              class="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-colors"
            >
              <div class="relative inline-flex items-center">
                <input v-model="page.moveRouteSkip" type="checkbox" class="sr-only peer" />
                <div
                  class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"
                ></div>
              </div>
              <span class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
                >Skip If Blocked</span
              >
            </label>
          </div>

          <button
            class="w-full px-3 py-2.5 bg-white hover:bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wide rounded-xl border border-indigo-200 shadow-sm transition-all active:scale-95"
            @click="emit('edit-move-route')"
          >
            Edit Route... ({{ page.moveRoute.length }})
          </button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1"
              >Speed</span
            >
            <div class="relative">
              <select
                v-model.number="page.moveSpeed"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
              >
                <option :value="1">1: x8 Slow</option>
                <option :value="2">2: x4 Slow</option>
                <option :value="3">3: x2 Slow</option>
                <option :value="4">4: Normal</option>
                <option :value="5">5: x2 Fast</option>
                <option :value="6">6: x4 Fast</option>
              </select>
              <IconChevronDown
                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size="12"
              />
            </div>
          </div>
          <div class="space-y-1.5">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1"
              >Freq</span
            >
            <div class="relative">
              <select
                v-model.number="page.moveFrequency"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
              >
                <option :value="1">1: Lowest</option>
                <option :value="2">2: Low</option>
                <option :value="3">3: Normal</option>
                <option :value="4">4: High</option>
                <option :value="5">5: Highest</option>
              </select>
              <IconChevronDown
                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                size="12"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Trigger Group -->
    <div class="space-y-4">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Start Trigger
      </h3>

      <div class="grid grid-cols-1 gap-2">
        <button
          v-for="trigger in triggers"
          :key="trigger.value"
          class="flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all group"
          :class="
            page.trigger === trigger.value
              ? 'bg-slate-900 border-slate-900 text-white shadow-md transform scale-[1.02]'
              : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:shadow-sm'
          "
          @click="page.trigger = trigger.value"
        >
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
            :class="
              page.trigger === trigger.value
                ? 'bg-white/20 text-white'
                : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'
            "
          >
            <component :is="trigger.icon" size="16" />
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] font-black uppercase tracking-wide leading-tight">{{
              trigger.label
            }}</span>
            <span class="text-[9px] truncate opacity-60 font-medium">{{
              trigger.description
            }}</span>
          </div>

          <div v-if="page.trigger === trigger.value" class="ml-auto">
            <IconCircleCheck size="16" class="text-white" />
          </div>
        </button>
      </div>
    </div>

    <!-- Options Group -->
    <div class="space-y-4">
      <h3
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"
      >
        Options
      </h3>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="(label, key) in {
            walkAnim: 'Walk Anim',
            stepAnim: 'Step Anim',
            directionFix: 'Dir Fix',
            through: 'Through'
          } as const"
          :key="key"
          class="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[10px] font-bold transition-all uppercase tracking-wide"
          :class="
            page.options[key]
              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          "
          @click="page.options[key] = !page.options[key]"
        >
          <div
            class="w-4 h-4 rounded-md border flex items-center justify-center transition-colors"
            :class="
              page.options[key] ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
            "
          >
            <IconBolt v-if="page.options[key]" size="10" class="text-white" />
          </div>
          {{ label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}

.pixelated {
  image-rendering: pixelated;
}
</style>
