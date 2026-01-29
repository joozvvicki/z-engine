<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { IconDeviceFloppy, IconGhost, IconPlus, IconCopy, IconTrash } from '@tabler/icons-vue'
import { ZEventTrigger, type ZEventPage } from '@engine/types'

const props = defineProps<{
  x: number
  y: number
  eventId?: string | null
}>()

const emit = defineEmits(['close'])
const store = useEditorStore()

// --- State ---
const existingEvent = store.maps
  .find((map) => map.id === store.activeMapID)
  ?.events?.find((e) => e.id === props.eventId)

const eventName = ref(existingEvent?.name || '')
// If new event, generate name
if (!existingEvent) {
  const count = store.maps.find((map) => map.id === store.activeMapID)?.events?.length || 0
  eventName.value = `EV${String(count + 1).padStart(3, '0')}`
}

// Pages Management
const pages = ref<ZEventPage[]>([])
const activePageIndex = ref(0)

// Load existing pages or create default
if (existingEvent && existingEvent.pages && existingEvent.pages.length > 0) {
  // Deep copy to avoid mutating store directly until save
  pages.value = JSON.parse(JSON.stringify(existingEvent.pages))
} else {
  // Create default page 1
  pages.value = [
    {
      id: `page_${Date.now()}`,
      conditions: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      graphic: existingEvent ? (existingEvent as any).graphic : store.selection, // Backward compat
      trigger: ZEventTrigger.Action,
      options: {
        moveRoute: null,
        walkAnim: true,
        stepAnim: false,
        directionFix: false,
        through: false
      },
      list: []
    }
  ]
}

const activePage = computed(() => pages.value[activePageIndex.value])

// --- Actions ---

const addPage = (): void => {
  const newPage: ZEventPage = {
    id: `page_${Date.now()}`,
    conditions: {},
    graphic: null,
    trigger: ZEventTrigger.Action,
    options: {
      moveRoute: null,
      walkAnim: true,
      stepAnim: false,
      directionFix: false,
      through: false
    },
    list: []
  }
  pages.value.push(newPage)
  activePageIndex.value = pages.value.length - 1
}

const removePage = (index: number): void => {
  if (pages.value.length <= 1) return
  pages.value.splice(index, 1)
  if (activePageIndex.value >= pages.value.length) {
    activePageIndex.value = pages.value.length - 1
  }
}

const copyPage = (): void => {
  const clone = JSON.parse(JSON.stringify(activePage.value))
  clone.id = `page_${Date.now()}`
  pages.value.push(clone)
  activePageIndex.value = pages.value.length - 1
}

const clearGraphic = (): void => {
  if (activePage.value) activePage.value.graphic = null
}

const setGraphicFromSelection = (): void => {
  if (activePage.value) {
    activePage.value.graphic = { ...store.selection }
  }
}

const save = (): void => {
  if (props.eventId) {
    store.updateEvent(props.eventId, { name: eventName.value, pages: pages.value })
  } else {
    // For new event, we construct it fully due to store workaround
    store.addEvent(props.x, props.y, { name: eventName.value })
    // Find the newly added event (last one)
    const map = store.activeMap
    if (map) {
      const newEv = map.events[map.events.length - 1]
      store.updateEvent(newEv.id, { pages: pages.value })
    }
  }
  emit('close')
}

const remove = (): void => {
  if (props.eventId) {
    store.deleteEvent(props.eventId)
  }
  emit('close')
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-6"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-slate-800 font-sans border border-white/20 animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10"
      >
        <div class="flex items-center gap-6">
          <div class="flex flex-col">
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >Event ID</span
            >
            <span
              class="font-mono text-xs text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded"
              >{{ props.eventId || 'NEW' }}</span
            >
          </div>

          <div class="h-8 w-px bg-slate-200 mx-2"></div>

          <div class="flex flex-col gap-1 w-64">
            <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400"
              >Name</label
            >
            <input
              v-model="eventName"
              type="text"
              placeholder="Event Name"
              class="border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
        </div>

        <div class="flex gap-3">
          <button
            v-if="props.eventId"
            class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase rounded-lg flex items-center gap-2 transition-colors"
            @click="remove"
          >
            <IconTrash size="16" /> Delete
          </button>
          <button
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase rounded-lg transition-colors border border-transparent"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            @click="save"
          >
            <IconDeviceFloppy size="18" /> Save Event
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex overflow-hidden bg-slate-50/50">
        <!-- Sidebar: Page Tabs -->
        <div
          class="w-16 bg-white border-r border-slate-100 flex flex-col items-center py-4 gap-3 overflow-y-auto shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10"
        >
          <div class="flex flex-col gap-2 w-full px-2">
            <button
              v-for="(page, idx) in pages"
              :key="page.id"
              class="w-full aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative group"
              :class="
                activePageIndex === idx
                  ? 'bg-blue-600 text-white shadow-md scale-100'
                  : 'bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500'
              "
              @click="activePageIndex = idx"
            >
              {{ idx + 1 }}
              <div
                v-if="activePageIndex === idx"
                class="absolute -right-[9px] top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rotate-45 rounded-[1px]"
              ></div>
            </button>
          </div>

          <div class="h-px w-8 bg-slate-200 my-2"></div>

          <div class="flex flex-col gap-2">
            <button
              class="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-white border border-slate-200 hover:border-blue-300 text-slate-500 hover:text-blue-600 transition-all shadow-sm"
              title="Add Page"
              @click="addPage"
            >
              <IconPlus size="18" />
            </button>
            <button
              class="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-white border border-slate-200 hover:border-blue-300 text-slate-500 hover:text-blue-600 transition-all shadow-sm"
              title="Copy Page"
              @click="copyPage"
            >
              <IconCopy size="18" />
            </button>
            <button
              class="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete Page"
              :disabled="pages.length <= 1"
              @click="removePage(activePageIndex)"
            >
              <IconTrash size="18" />
            </button>
          </div>
        </div>

        <!-- Center: Settings -->
        <div
          class="w-[340px] bg-white border-r border-slate-100 flex flex-col p-6 gap-6 overflow-y-auto shrink-0"
        >
          <!-- Conditions Group -->
          <div class="space-y-3">
            <h3
              class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"
            >
              Conditions
              <div class="h-px bg-slate-100 flex-1"></div>
            </h3>
            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
              <div
                class="flex items-center gap-3 opacity-50 cursor-not-allowed"
                title="Coming Soon"
              >
                <input
                  type="checkbox"
                  disabled
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm font-medium text-slate-500">Switch 1</span>
              </div>
              <div
                class="flex items-center gap-3 opacity-50 cursor-not-allowed"
                title="Coming Soon"
              >
                <input
                  type="checkbox"
                  disabled
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm font-medium text-slate-500">Variable</span>
              </div>
              <div
                class="flex items-center gap-3 opacity-50 cursor-not-allowed"
                title="Coming Soon"
              >
                <input
                  type="checkbox"
                  disabled
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-sm font-medium text-slate-500">Self Switch</span>
              </div>
            </div>
          </div>

          <!-- Graphic Group -->
          <div class="space-y-3">
            <h3
              class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"
            >
              Appearance
              <div class="h-px bg-slate-100 flex-1"></div>
            </h3>

            <div class="flex gap-4">
              <div
                class="w-24 h-24 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2nk5uamNYwYP//8/xyM2jB4wYDBsIqKikq8Gg4dOoQXR21g8IIBg2EVg4AAAABJRU5ErkJggg==')] bg-repeat border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl flex items-center justify-center relative overflow-hidden cursor-pointer transition-colors group"
                @dblclick="setGraphicFromSelection"
              >
                <template v-if="activePage.graphic">
                  <!-- Placeholder for graphic renderer -->
                  <div class="text-center group-hover:scale-110 transition-transform">
                    <div class="text-2xl mb-1 drop-shadow-sm">🖼️</div>
                  </div>
                  <div
                    class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-mono text-center p-0.5 truncate backdrop-blur-sm"
                  >
                    {{ activePage.graphic.tilesetId }}
                  </div>
                </template>
                <div
                  v-else
                  class="text-slate-300 flex flex-col items-center group-hover:text-blue-400"
                >
                  <IconGhost size="24" />
                  <span class="text-[9px] font-bold uppercase mt-1">Empty</span>
                </div>
              </div>

              <div class="flex-1 flex flex-col gap-2 justify-center">
                <button
                  class="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors border border-blue-100"
                  @click="setGraphicFromSelection"
                >
                  Set from Selection
                </button>
                <button
                  class="px-3 py-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-500 text-xs font-bold rounded-lg transition-colors border border-slate-200 hover:border-red-200"
                  @click="clearGraphic"
                >
                  Clear Graphic
                </button>
                <p class="text-[10px] text-slate-400 leading-tight">
                  Select a tile in the main view, then use "Set from Selection".
                </p>
              </div>
            </div>
          </div>

          <!-- Trigger & Options -->
          <div class="space-y-3">
            <h3
              class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2"
            >
              Trigger & Options
              <div class="h-px bg-slate-100 flex-1"></div>
            </h3>

            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4">
              <div class="space-y-1">
                <label class="text-[10px] uppercase font-bold text-slate-500"
                  >Trigger Condition</label
                >
                <div class="relative">
                  <select
                    v-model="activePage.trigger"
                    class="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option :value="0">Action Button</option>
                    <option :value="1">Player Touch</option>
                    <option :value="2">Event Touch</option>
                    <option :value="3">Autorun</option>
                    <option :value="4">Parallel Process</option>
                  </select>
                  <div
                    class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="activePage.options.walkAnim"
                    type="checkbox"
                    class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all"
                  />
                  <span class="text-xs font-medium text-slate-600 group-hover:text-blue-700"
                    >Walking Anim</span
                  >
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="activePage.options.stepAnim"
                    type="checkbox"
                    class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all"
                  />
                  <span class="text-xs font-medium text-slate-600 group-hover:text-blue-700"
                    >Stepping Anim</span
                  >
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="activePage.options.directionFix"
                    type="checkbox"
                    class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all"
                  />
                  <span class="text-xs font-medium text-slate-600 group-hover:text-blue-700"
                    >Direction Fix</span
                  >
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input
                    v-model="activePage.options.through"
                    type="checkbox"
                    class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all"
                  />
                  <span class="text-xs font-medium text-slate-600 group-hover:text-blue-700"
                    >Through</span
                  >
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Command List -->
        <div class="flex-1 bg-white flex flex-col relative">
          <div
            class="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0"
          >
            <div class="flex items-center gap-2">
              <span
                v-if="activePage.trigger === 3 || activePage.trigger === 4"
                class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
              ></span>
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500"
                >Event Commands</span
              >
            </div>
            <span class="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full"
              >Page {{ activePageIndex + 1 }}</span
            >
          </div>

          <div class="flex-1 overflow-y-auto p-0 scrollbar-thin">
            <!-- Empty State -->
            <div
              v-if="activePage.list.length === 0"
              class="flex flex-col items-center justify-center py-20 text-slate-300 select-none"
            >
              <IconGhost size="48" class="mb-2 opacity-50" />
              <p class="text-xs font-medium">No commands yet</p>
              <p class="text-[10px]">Double click to insert</p>
            </div>

            <div class="flex flex-col font-mono text-sm">
              <div
                v-for="(cmd, idx) in activePage.list"
                :key="idx"
                class="group flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-white hover:border-blue-100 transition-colors"
              >
                <span class="text-slate-300 text-[10px] w-6 text-right select-none">{{
                  String(idx + 1).padStart(3, '0')
                }}</span>
                <!-- Command Logic Placeholder -->
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span class="text-slate-700 font-medium font-sans">Command {{ cmd.code }}</span>
                  <span class="text-slate-400 text-xs">--</span>
                </div>
              </div>

              <!-- Insert Line -->
              <div
                class="group flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors opacity-50 hover:opacity-100"
              >
                <span class="text-slate-300 text-[10px] w-6 text-right select-none">@</span>
                <span class="text-slate-400 text-xs italic group-hover:text-blue-500"
                  >Double click to add...</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #cbd5e1; /* slate-300 */
  border-radius: 3px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
</style>
