<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { ZCommandCode, type ZEventPage, ZEventTrigger } from '@engine/types'
import { ProjectService } from '@ui/services/ProjectService'
import CharacterSelector from '@ui/components/modal/CharacterSelector.vue'

// Sub-components
import EventEditorHeader from './event-editor/EventEditorHeader.vue'
import EventEditorPageTabs from './event-editor/EventEditorPageTabs.vue'
import EventEditorSidebar from './event-editor/EventEditorSidebar.vue'
import EventEditorCommandList from './event-editor/EventEditorCommandList.vue'
import EventEditorCommandSelector from './event-editor/EventEditorCommandSelector.vue'

const props = defineProps<{
  x: number
  y: number
  eventId?: string | null
}>()

const emit = defineEmits(['close'])
const store = useEditorStore()

const showCharacterSelector = ref(false)
const showCommandSelector = ref(false)
const activePageIndex = ref(0)
const selectedCommandIndex = ref<number | null>(null)
const commandListEl = ref<HTMLElement | null>(null)
const editingCommandIndex = ref<number | null>(null)

// --- State ---
const existingEvent = store.maps
  .find((map) => map.id === store.activeMapID)
  ?.events?.find((e) => e.id === props.eventId)

const eventName = ref(existingEvent?.name || '')
if (!existingEvent) {
  const count = store.maps.find((map) => map.id === store.activeMapID)?.events?.length || 0
  eventName.value = `EV${String(count + 1).padStart(3, '0')}`
}

const pages = ref<ZEventPage[]>([])

// Initialize pages
if (existingEvent && existingEvent.pages && existingEvent.pages.length > 0) {
  pages.value = JSON.parse(JSON.stringify(existingEvent.pages))
} else {
  pages.value = [
    {
      id: crypto.randomUUID(),
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
  ]
}

const activePage = computed(() => pages.value[activePageIndex.value])

// --- Presentation List Computation ---
const presentationList = computed((): any[] => {
  if (!activePage.value) return []
  const list = activePage.value.list
  const result: any[] = []
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
})

// --- Actions ---
const addPage = (): void => {
  const newPage = JSON.parse(JSON.stringify(pages.value[pages.value.length - 1]))
  newPage.id = crypto.randomUUID()
  pages.value.push(newPage)
  activePageIndex.value = pages.value.length - 1
}

const removePage = (index: number): void => {
  if (pages.value.length <= 1) return
  pages.value.splice(index, 1)
  activePageIndex.value = Math.max(0, activePageIndex.value - 1)
}

const copyPage = (): void => {
  const copy = JSON.parse(JSON.stringify(activePage.value))
  copy.id = crypto.randomUUID()
  pages.value.splice(activePageIndex.value + 1, 0, copy)
  activePageIndex.value++
}

const save = (): void => {
  const eventData = {
    name: eventName.value,
    pages: pages.value
  }

  if (props.eventId) {
    store.updateEvent(props.eventId, eventData)
  } else {
    store.addEvent(props.x, props.y, eventData)
  }
  emit('close')
}

const remove = (): void => {
  if (props.eventId) {
    store.deleteEvent(props.eventId)
    emit('close')
  }
}

const deleteCommand = (index: number): void => {
  activePage.value.list.splice(index, 1)
  selectedCommandIndex.value = null
}

const onSelectGraphic = (selection: any): void => {
  activePage.value.graphic = {
    assetId: selection.tilesetId,
    group: selection.isTile ? 'tile' : 'character',
    x: selection.x,
    y: selection.y,
    w: selection.w,
    h: selection.h,
    srcX: selection.pixelX,
    srcY: selection.pixelY,
    srcW: selection.pixelW,
    srcH: selection.pixelH
  }
  showCharacterSelector.value = false
}

const setGraphicFromSelection = (): void => {
  if (!store.selection) return
  // Logic to set graphic from current map selection
  activePage.value.graphic = {
    assetId: store.selection.tilesetId,
    group: 'tile',
    x: store.selection.x,
    y: store.selection.y,
    w: store.selection.w,
    h: store.selection.h
  }
}

const getCharacterUrl = (filename: string): string => ProjectService.resolveAssetUrl(filename)

const getChoiceName = (_itemIndex: number, choiceIndex: number): string => {
  // Simple fallback for choice name display
  return `Choice ${choiceIndex + 1}`
}

const openCommandEditor = (index: number | null = null, isInsert: boolean = false): void => {
  editingCommandIndex.value = isInsert ? null : index
  showCommandSelector.value = true
}

const handleCommandSave = (cmd: { code: number; params: any[] }): void => {
  if (editingCommandIndex.value !== null) {
    activePage.value.list[editingCommandIndex.value] = {
      code: cmd.code,
      parameters: cmd.params
    }
  } else {
    const index =
      selectedCommandIndex.value !== null
        ? selectedCommandIndex.value + 1
        : activePage.value.list.length
    activePage.value.list.splice(index, 0, {
      code: cmd.code,
      parameters: cmd.params
    })
  }
  showCommandSelector.value = false
}

// Keyboard shortcuts
const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && !showCommandSelector.value && !showCharacterSelector.value)
    emit('close')
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-6"
    @click.self="emit('close')"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-slate-800 font-sans border border-white/20 animate-in fade-in zoom-in-95 duration-200"
    >
      <EventEditorHeader
        v-model:event-name="eventName"
        :event-id="props.eventId"
        @save="save"
        @remove="remove"
        @close="emit('close')"
      />

      <div class="flex-1 flex overflow-hidden bg-slate-50/50">
        <EventEditorPageTabs
          v-model:active-page-index="activePageIndex"
          :pages="pages"
          @add-page="addPage"
          @copy-page="copyPage"
          @remove-page="removePage"
        />

        <EventEditorSidebar
          v-if="activePage"
          v-model:page="pages[activePageIndex]"
          :has-selection="!!store.selection"
          :character-url="getCharacterUrl"
          @select-graphic="showCharacterSelector = true"
          @clear-graphic="activePage.graphic = null"
          @set-graphic-from-selection="setGraphicFromSelection"
        />

        <EventEditorCommandList
          v-if="activePage"
          v-model:selected-command-index="selectedCommandIndex"
          v-model:command-list-el="commandListEl"
          :page="activePage"
          :presentation-list="presentationList"
          :active-page-index="activePageIndex"
          :get-choice-name="getChoiceName"
          @open-editor="openCommandEditor"
          @delete-command="deleteCommand"
        />
      </div>
    </div>

    <!-- Modals -->
    <CharacterSelector
      v-if="showCharacterSelector"
      :initial-tileset-id="activePage?.graphic?.assetId"
      :initial-x="activePage?.graphic?.x"
      :initial-y="activePage?.graphic?.y"
      @close="showCharacterSelector = false"
      @select="onSelectGraphic"
    />

    <EventEditorCommandSelector
      :show="showCommandSelector"
      :editing-command-index="editingCommandIndex"
      :system-switches="store.systemSwitches"
      @close="showCommandSelector = false"
      @save="handleCommandSave"
    />
  </div>
</template>
