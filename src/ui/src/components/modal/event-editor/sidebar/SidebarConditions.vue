<script setup lang="ts">
import { IconChevronDown } from '@tabler/icons-vue'
import type { ZEventPage } from '@engine/types'

const props = defineProps<{
  switches: string[]
  variables: string[]
  items: { id: number; name: string }[]
}>()

const page = defineModel<ZEventPage>('page', { required: true })

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
          <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Switch 1</span>
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
            <option v-for="(sw, idx) in props.switches" :key="idx" :value="String(idx + 1)">
              {{ String(idx + 1).padStart(3, '0') }}: {{ sw || '(Untitled)' }}
            </option>
          </select>
          <IconChevronDown
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size="14"
          />
        </div>
      </div>

      <!-- Variable -->
      <div
        class="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 transition-colors hover:border-slate-300"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Variable</span>
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
              <option v-for="(v, idx) in props.variables" :key="idx" :value="String(idx + 1)">
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
          <span class="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Has Item</span>
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
            <option v-for="item in props.items" :key="item.id" :value="String(item.id)">
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
</template>

<style scoped>
@reference "@ui/assets/css/tailwind.css";
</style>
