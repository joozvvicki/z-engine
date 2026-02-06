<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '@ui/stores/database' // Zakładam, że dodasz tam commonEvents
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconBolt,
  IconSettings,
  IconCode,
  IconToggleLeft,
  IconPlayerPlay,
  IconMenu2
} from '@tabler/icons-vue'

// --- MOCK DATA (Dopóki nie ma w store) ---
// W prawdziwej aplikacji to powinno być w db.commonEvents
const mockEvents = ref([
  {
    id: 1,
    name: 'Day/Night Cycle',
    trigger: 'Parallel',
    switchId: 1,
    list: [
      { code: 201, indent: 0, text: 'Wait: 60 frames' },
      { code: 101, indent: 0, text: 'Variable [001: Time] += 1' },
      { code: 111, indent: 0, text: 'If Variable [001: Time] >= 24' },
      { code: 101, indent: 1, text: 'Variable [001: Time] = 0' },
      { code: 201, indent: 1, text: 'Show Text: "A new day begins..."' },
      { code: 412, indent: 0, text: 'End' }
    ]
  },
  {
    id: 2,
    name: 'Open Custom Menu',
    trigger: 'None',
    switchId: 0,
    list: [
      { code: 201, indent: 0, text: 'Play SE: "BookOpen", 90, 100' },
      { code: 201, indent: 0, text: 'Show Picture: 1, "MenuBg", Upper Left (0,0)' }
    ]
  },
  { id: 3, name: 'Game Over Logic', trigger: 'Autorun', switchId: 5, list: [] }
])

const selectedId = ref<number>(1)
const searchQuery = ref('')

// --- COMPUTED ---
const filteredEvents = computed(() => {
  if (!searchQuery.value) return mockEvents.value
  const query = searchQuery.value.toLowerCase()
  return mockEvents.value.filter((e) => e.name.toLowerCase().includes(query))
})

const selectedEvent = computed(() => mockEvents.value.find((e) => e.id === selectedId.value))

const triggers = ['None (Call only)', 'Autorun', 'Parallel Process']

// --- ACTIONS ---
const handleAdd = () => {
  const newId = mockEvents.value.length > 0 ? Math.max(...mockEvents.value.map((e) => e.id)) + 1 : 1
  mockEvents.value.push({
    id: newId,
    name: 'New Common Event',
    trigger: 'None',
    switchId: 0,
    list: []
  })
  selectedId.value = newId
}

const handleDelete = () => {
  if (confirm('Delete this common event?')) {
    const idx = mockEvents.value.findIndex((e) => e.id === selectedId.value)
    if (idx !== -1) {
      mockEvents.value.splice(idx, 1)
      if (mockEvents.value.length > 0) selectedId.value = mockEvents.value[0].id
    }
  }
}

// Helpers for visual styling of commands
const getCommandColor = (code: number) => {
  if (code === 111 || code === 412) return 'border-orange-400 bg-orange-50 text-orange-900' // Flow control
  if (code === 101) return 'border-blue-400 bg-blue-50 text-blue-900' // Game Data
  return 'border-slate-300 bg-white text-slate-700' // Default
}
</script>

<template>
  <div class="flex h-full bg-white text-slate-900 font-sans">
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
                  event.trigger === 'None'
                    ? 'text-slate-400 bg-slate-100'
                    : 'text-amber-600 bg-amber-50'
                "
              >
                {{ event.trigger }}
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

    <div v-if="selectedEvent" class="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
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
              v-model="selectedEvent.trigger"
              class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option v-for="t in triggers" :key="t" :value="t">{{ t }}</option>
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
              type="text"
              placeholder="(None)"
              class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-hidden flex flex-col p-6">
        <div
          class="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden"
        >
          <div class="h-10 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50/50">
            <span
              class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"
            >
              <IconCode :size="14" /> Execution Content
            </span>
            <div class="flex-1"></div>
            <button
              class="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <IconPlayerPlay :size="12" /> Test
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar bg-slate-50/30">
            <div
              v-for="(cmd, idx) in selectedEvent.list"
              :key="idx"
              class="flex items-center text-xs font-mono py-1.5 px-3 rounded border-l-4 shadow-sm hover:translate-x-1 transition-all cursor-pointer group"
              :class="getCommandColor(cmd.code)"
              :style="{ marginLeft: `${cmd.indent * 20}px` }"
            >
              <span class="opacity-30 mr-3 select-none">@</span>
              <span class="font-bold flex-1">{{ cmd.text }}</span>
              <div class="opacity-0 group-hover:opacity-100 flex gap-2">
                <IconMenu2 :size="14" class="text-slate-400 cursor-grab" />
              </div>
            </div>

            <div
              class="flex items-center text-xs font-mono py-2 px-3 rounded border border-dashed border-slate-300 text-slate-400 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer transition-colors"
              :style="{
                marginLeft: `${(selectedEvent.list.length > 0 ? selectedEvent.list[selectedEvent.list.length - 1].indent : 0) * 20}px`
              }"
            >
              <span class="mr-3 opacity-50">+</span>
              <span>Double-click to add new command...</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center text-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4">
        <IconBolt :size="40" class="opacity-50" />
      </div>
      <span class="text-sm font-bold text-slate-400">No Common Event Selected</span>
    </div>
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
