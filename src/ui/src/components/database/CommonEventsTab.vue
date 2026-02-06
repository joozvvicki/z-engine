<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database'
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconBolt,
  IconSettings,
  IconToggleLeft
} from '@tabler/icons-vue'
import EventEditorCommandList from '../modal/event-editor/EventEditorCommandList.vue'
import EventEditorCommandSelector from '../modal/event-editor/EventEditorCommandSelector.vue'
import { ZCommandCode, ZEventTrigger, type ZEventCommand, type ZEventPage } from '@engine/types'

const db = useDatabaseStore()
const selectedId = ref<number>(db.commonEvents[0]?.id || 0)
const searchQuery = ref('')
const selectedCommandIndex = ref<number | null>(null)
const showCommandSelector = ref(false)

// --- COMPUTED ---
const filteredEvents = computed(() => {
  if (!searchQuery.value) return db.commonEvents
  const query = searchQuery.value.toLowerCase()
  return db.commonEvents.filter((e) => e.name.toLowerCase().includes(query))
})

const selectedEvent = computed(() => db.commonEvents.find((e) => e.id === selectedId.value))

// Build presentation list (same logic as EventEditor)
const presentationList = computed(
  (): { type: string; command?: ZEventCommand; index: number; indent: number }[] => {
    if (!selectedEvent.value) return []
    const list = selectedEvent.value.list
    const result: { type: string; command?: ZEventCommand; index: number; indent: number }[] = []
    let depth = 0

    const addPlaceholder = (idx: number, d: number): void => {
      result.push({ type: 'placeholder', index: idx, indent: d })
    }

    list.forEach((cmd, idx) => {
      let lineIndent = depth
      if (
        [
          ZCommandCode.EndBranch,
          ZCommandCode.Else,
          ZCommandCode.When,
          ZCommandCode.EndChoices
        ].includes(cmd.code)
      ) {
        lineIndent = Math.max(0, depth - 1)
      }

      addPlaceholder(idx, depth)
      result.push({ type: 'command', command: cmd, index: idx, indent: lineIndent })

      if (
        [
          ZCommandCode.ConditionalBranch,
          ZCommandCode.Else,
          ZCommandCode.ShowChoices,
          ZCommandCode.When
        ].includes(cmd.code)
      ) {
        depth++
      }
      if ([ZCommandCode.EndBranch, ZCommandCode.EndChoices].includes(cmd.code)) {
        depth = Math.max(0, depth - 1)
      }
    })

    addPlaceholder(list.length, depth)
    return result
  }
)

// Create mock ZEventPage for command selector
const mockPage = computed((): ZEventPage | null => {
  if (!selectedEvent.value) return null
  return {
    id: crypto.randomUUID(),
    conditions: {
      switch1Id: '',
      switch2Id: '',
      variableId: '',
      variableValue: 0,
      variableOp: 0,
      selfSwitchCh: '',
      item: '',
      actor: ''
    },
    graphic: null,
    trigger: ZEventTrigger.Action,
    moveType: 'fixed',
    moveSpeed: 3,
    moveFrequency: 3,
    moveRoute: [],
    moveRouteRepeat: true,
    moveRouteSkip: true,
    options: {
      walkAnim: true,
      stepAnim: false,
      directionFix: false,
      through: false
    },
    list: selectedEvent.value.list
  }
})

const triggers = [
  { value: 0, label: 'None (Call only)' },
  { value: 1, label: 'Autorun' },
  { value: 2, label: 'Parallel Process' }
]

// --- ACTIONS ---
const handleAdd = (): void => {
  db.addCommonEvent()
  const last = db.commonEvents[db.commonEvents.length - 1]
  if (last) selectedId.value = last.id
}

const handleDelete = (): void => {
  if (confirm('Delete this common event?')) {
    db.deleteCommonEvent(selectedId.value)
    if (db.commonEvents.length > 0) selectedId.value = db.commonEvents[0].id
  }
}

const handleOpenEditor = (index: number | null): void => {
  selectedCommandIndex.value = index
  showCommandSelector.value = true
}

const handleDeleteCommand = (index: number): void => {
  if (!selectedEvent.value) return
  selectedEvent.value.list.splice(index, 1)
  db.save('CommonEvents.json', db.commonEvents)
}

const handleInsertCommand = (payload: { code: number; parameters: unknown[] }): void => {
  if (!selectedEvent.value) return

  const command: ZEventCommand = {
    code: payload.code,
    parameters: payload.parameters,
    indent: 0
  }

  if (selectedCommandIndex.value === null) {
    // Add to end
    selectedEvent.value.list.push(command)
  } else {
    // Insert at position
    selectedEvent.value.list.splice(selectedCommandIndex.value + 1, 0, command)
  }

  db.save('CommonEvents.json', db.commonEvents)
  showCommandSelector.value = false
  selectedCommandIndex.value = null
}

const handleCloseSelector = (): void => {
  showCommandSelector.value = false
  selectedCommandIndex.value = null
}
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
    <!-- Left Sidebar: Event List -->
    <div class="w-72 flex flex-col border-r border-slate-200 bg-slate-50/50">
      <div class="px-5 pt-6 pb-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xs font-black uppercase tracking-widest text-slate-400">Common Events</h2>
          <button
            class="p-1.5 rounded-lg bg-slate-200 hover:bg-indigo-600 hover:text-white text-slate-500 transition-all"
            title="Add Event"
            @click="handleAdd"
          >
            <IconPlus :size="16" stroke-width="2.5" />
          </button>
        </div>

        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            :size="14"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search events..."
            class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar space-y-1">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="group flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition-all duration-200"
          :class="
            selectedId === event.id
              ? 'bg-white border-indigo-200 shadow-md shadow-indigo-500/5'
              : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
          "
          @click="selectedId = event.id"
        >
          <div
            class="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 text-indigo-500"
          >
            <IconBolt :size="20" stroke-width="1.5" />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center">
              <span
                class="font-bold text-sm truncate"
                :class="selectedId === event.id ? 'text-indigo-700' : 'text-slate-700'"
              >
                {{ event.name || 'Unnamed Event' }}
              </span>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                ID:{{ event.id }}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span
                class="text-[9px] font-bold uppercase tracking-wider px-1.5 rounded-sm"
                :class="
                  event.trigger === 0 ? 'text-slate-400 bg-slate-100' : 'text-amber-600 bg-amber-50'
                "
              >
                {{ triggers.find((t) => t.value === event.trigger)?.label || 'None' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-200 bg-slate-50/50">
        <button
          class="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
          @click="handleDelete"
        >
          <IconTrash :size="14" />
          Delete Event
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-if="selectedEvent" class="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <!-- Header -->
      <div class="h-20 px-8 flex items-center gap-6 bg-white border-b border-slate-200 shrink-0">
        <div class="flex-1 space-y-1">
          <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
            >Event Name</label
          >
          <input
            v-model="selectedEvent.name"
            type="text"
            class="w-full text-xl font-black text-slate-900 bg-transparent outline-none placeholder:text-slate-200"
            placeholder="Event Name"
            @input="db.save('CommonEvents.json', db.commonEvents)"
          />
        </div>

        <div class="w-px h-10 bg-slate-100"></div>

        <div class="w-48 space-y-1">
          <label
            class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
          >
            <IconSettings :size="12" /> Trigger
          </label>
          <div class="relative">
            <select
              v-model.number="selectedEvent.trigger"
              class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-400 cursor-pointer"
              @change="db.save('CommonEvents.json', db.commonEvents)"
            >
              <option v-for="t in triggers" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
        </div>

        <div class="w-48 space-y-1">
          <label
            class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
          >
            <IconToggleLeft :size="12" /> Condition Switch
          </label>
          <div class="relative">
            <input
              v-model.number="selectedEvent.switchId"
              type="number"
              min="0"
              placeholder="0 (None)"
              class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
              @input="db.save('CommonEvents.json', db.commonEvents)"
            />
          </div>
        </div>
      </div>

      <!-- Command List Area -->
      <div class="flex-1 flex flex-col overflow-hidden bg-slate-50/50 relative">
        <EventEditorCommandList
          v-if="mockPage"
          v-model:selected-command-index="selectedCommandIndex"
          :page="mockPage"
          :presentation-list="presentationList"
          :active-page-index="0"
          :get-choice-name="() => ''"
          @open-editor="handleOpenEditor"
          @delete-command="handleDeleteCommand"
        />
      </div>
    </div>

    <!-- Empty Selected State -->
    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
        <IconBolt :size="40" class="opacity-50" />
      </div>
      <span class="text-sm font-bold text-slate-400">No Common Event Selected</span>
    </div>

    <!-- Command Selector Modal -->
    <EventEditorCommandSelector
      v-if="showCommandSelector && mockPage"
      :show="showCommandSelector"
      :page="mockPage"
      :system-switches="[]"
      @save="handleInsertCommand"
      @close="handleCloseSelector"
    />
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
</style>
