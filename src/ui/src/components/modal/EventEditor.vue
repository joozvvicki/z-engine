<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useScrollLock } from '@vueuse/core'
import { useEditorStore } from '@ui/stores/editor'
import {
  ZCommandCode,
  ZEventTrigger,
  ZEngineSignal,
  type ZEventPage,
  type ZEventCommand,
  type ZMoveCommand
} from '@engine/types'
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

const emit = defineEmits(['close', 'open-editor', 'delete-command'])
const store = useEditorStore()
const isLocked = useScrollLock(document.body)

const showCharacterSelector = ref(false)
const showCommandSelector = ref(false)
const activePageIndex = ref(0)
const selectedCommandIndex = ref<number | null>(null)
const editingCommandIndex = ref<number | null>(null)
const isAutonomousRouteMode = ref(false)

const eventName = ref('')
const pages = ref<ZEventPage[]>([])

const activePage = computed(() => pages.value[activePageIndex.value])

const createDefaultPage = (): ZEventPage => ({
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
  list: []
})

const initialize = async (): Promise<void> => {
  if (props.eventId) {
    const event = store.activeMap?.events.find((e) => e.id === props.eventId)
    if (event) {
      eventName.value = event.name
      pages.value = JSON.parse(JSON.stringify(event.pages))
    }
  } else {
    eventName.value = 'New Event'
    pages.value = [createDefaultPage()]
  }
}

// --- Presentation List Computation ---
const presentationList = computed(
  (): { type: string; command?: ZEventCommand; index: number; indent: number }[] => {
    if (!activePage.value) return []
    const list = activePage.value.list
    const result: { type: string; command?: ZEventCommand; index: number; indent: number }[] = []
    let depth = 0

    const addPlaceholder = (idx: number, d: number): void => {
      result.push({ type: 'placeholder', index: idx, indent: d })
    }

    list.forEach((cmd, idx) => {
      // Commands that "reset" to parent indent before displaying themselves
      const isBranchMid = [ZCommandCode.Else, ZCommandCode.When].includes(cmd.code)
      const isBlockEnd = [ZCommandCode.EndBranch, ZCommandCode.EndChoices].includes(cmd.code)

      if (isBranchMid || isBlockEnd) {
        depth = Math.max(0, depth - 1)
      }

      addPlaceholder(idx, depth)
      result.push({ type: 'command', command: cmd, index: idx, indent: depth })

      // Commands that increase indent for FOLLOWING commands
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
    })

    addPlaceholder(list.length, depth)
    return result
  }
)

// --- Actions ---
const addPage = (): void => {
  pages.value.push(createDefaultPage())
  activePageIndex.value = pages.value.length - 1
}

const removePage = (index: number): void => {
  if (pages.value.length <= 1) return
  pages.value.splice(index, 1)
  activePageIndex.value = Math.max(0, activePageIndex.value - 1)
}

const copyPage = (): void => {
  if (!activePage.value) return
  const copy = JSON.parse(JSON.stringify(activePage.value))
  copy.id = crypto.randomUUID()
  pages.value.splice(activePageIndex.value + 1, 0, copy)
  activePageIndex.value++
}

watch(activePageIndex, () => {
  selectedCommandIndex.value = null
})

const save = (): void => {
  const eventData = {
    name: eventName.value,
    pages: pages.value
  }

  if (props.eventId) {
    store.updateEvent(props.eventId, eventData)

    // Notify engine of internal state changes for immediate feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engine = (window as any).$zEngine
    if (engine && activePage.value) {
      engine.eventBus.emit(ZEngineSignal.EventInternalStateChanged, {
        eventId: props.eventId,
        graphic: activePage.value.graphic,
        moveType: activePage.value.moveType,
        moveSpeed: activePage.value.moveSpeed,
        moveFrequency: activePage.value.moveFrequency,
        moveRoute: activePage.value.moveRoute,
        moveRouteRepeat: activePage.value.moveRouteRepeat,
        moveRouteSkip: activePage.value.moveRouteSkip,
        isThrough: activePage.value.options.through
      })
    }
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
  if (!activePage.value) return

  const cmd = activePage.value.list[index]
  if (!cmd) return

  // Cascaded deletion for hierarchical blocks
  let count = 1
  if ([ZCommandCode.ShowChoices, ZCommandCode.ConditionalBranch].includes(cmd.code)) {
    let depth = 0
    for (let i = index; i < activePage.value.list.length; i++) {
      const c = activePage.value.list[i]
      if ([ZCommandCode.ShowChoices, ZCommandCode.ConditionalBranch].includes(c.code)) {
        depth++
      } else if ([ZCommandCode.EndChoices, ZCommandCode.EndBranch].includes(c.code)) {
        depth--
        if (depth === 0) {
          count = i - index + 1
          break
        }
      }
    }
  }

  activePage.value.list.splice(index, count)
  selectedCommandIndex.value = null
}

const onSelectGraphic = (selection: {
  tilesetId: string
  isTile: boolean
  x: number
  y: number
  w?: number
  h?: number
  pixelX?: number
  pixelY?: number
  pixelW?: number
  pixelH?: number // We return both index-based (legacy/compat) and pixel-based values
  divW?: number
  divH?: number
}): void => {
  if (!activePage.value) return
  activePage.value.graphic = {
    assetId: selection.tilesetId,
    group: selection.isTile ? 'tile' : 'character',
    x: selection.x,
    y: selection.y,
    w: selection.w || 1,
    h: selection.h || 1,
    srcX: selection.pixelX,
    srcY: selection.pixelY,
    srcW: selection.pixelW,
    srcH: selection.pixelH,
    divW: selection.divW,
    divH: selection.divH
  }
  showCharacterSelector.value = false
}

const setGraphicFromSelection = (): void => {
  if (!store.selection || !activePage.value) return
  activePage.value.graphic = {
    assetId: store.selection.tilesetId,
    group: 'tile',
    x: store.selection.x,
    y: store.selection.y,
    w: store.selection.w || 1,
    h: store.selection.h || 1
  }
}

const getCharacterUrl = (filename: string): string => ProjectService.resolveAssetUrl(filename)

const getChoiceName = (itemIndex: number, choiceIndex: number): string => {
  if (choiceIndex === -1) return 'Cancel'

  // Try to find labels from the most recent ShowChoices command BEFORE this index
  const page = activePage.value
  if (page) {
    for (let i = itemIndex - 1; i >= 0; i--) {
      const cmd = page.list[i]
      if (cmd.code === ZCommandCode.ShowChoices) {
        const labels = cmd.parameters[0] as string[]
        return labels[choiceIndex] || `Choice ${choiceIndex + 1}`
      }
    }
  }

  return `Choice ${choiceIndex + 1}`
}

const insertionIndex = ref<number | null>(null)

const handleEditCommand = (index: number): void => {
  editingCommandIndex.value = index
  insertionIndex.value = null
  showCommandSelector.value = true
}

const handleAddCommand = (index: number): void => {
  editingCommandIndex.value = null
  insertionIndex.value = index // Explicit insertion index
  selectedCommandIndex.value = index
  showCommandSelector.value = true
}

const handleCommandSave = (cmd: { code: number; parameters: unknown[] }): void => {
  if (!activePage.value) return

  const createCommand = (code: number, params: unknown[] = []): ZEventCommand => ({
    code,
    parameters: params
  })

  // Prepare commands to insert
  const commandsToInsert: ZEventCommand[] = [createCommand(cmd.code, cmd.parameters)]

  // Expansion logic for NEW commands only
  if (editingCommandIndex.value === null) {
    if (cmd.code === ZCommandCode.ShowChoices) {
      const labels = cmd.parameters[0] as string[]
      const cancelType = cmd.parameters[1] as number

      // Add regular choices
      labels.forEach((_, idx) => {
        commandsToInsert.push(createCommand(ZCommandCode.When, [idx]))
      })

      // Add cancel branch if enabled (cancelType === 1 is "Branch")
      if (cancelType === 1) {
        commandsToInsert.push(createCommand(ZCommandCode.When, [-1])) // -1 for Cancel
      }

      commandsToInsert.push(createCommand(ZCommandCode.EndChoices))
    } else if (cmd.code === ZCommandCode.ConditionalBranch) {
      const hasElse = cmd.parameters[3] === 1
      if (hasElse) {
        commandsToInsert.push(createCommand(ZCommandCode.Else))
      }
      commandsToInsert.push(createCommand(ZCommandCode.EndBranch))
    }
  }

  if (editingCommandIndex.value !== null) {
    activePage.value.list[editingCommandIndex.value] = commandsToInsert[0]
  } else {
    let index = activePage.value.list.length

    if (insertionIndex.value !== null) {
      index = insertionIndex.value
    } else if (selectedCommandIndex.value !== null) {
      index = selectedCommandIndex.value + 1
    }

    activePage.value.list.splice(index, 0, ...commandsToInsert)
  }

  insertionIndex.value = null
  showCommandSelector.value = false
}

const handleEditMoveRoute = (): void => {
  isAutonomousRouteMode.value = true
  editingCommandIndex.value = null
  selectedCommandIndex.value = null
  showCommandSelector.value = true
}

const handleSaveAutonomousRoute = (route: ZMoveCommand[]): void => {
  if (!activePage.value) return
  activePage.value.moveRoute = route
  showCommandSelector.value = false
}

// Keyboard shortcuts
const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && !showCommandSelector.value && !showCharacterSelector.value)
    emit('close')
}

onMounted(() => {
  initialize()
  store.isEventEditorOpen = true
  isLocked.value = true
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  store.isEventEditorOpen = false
  isLocked.value = false
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-6"
    @click.self="emit('close')"
    @wheel.stop
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

      <div class="flex-1 flex overflow-hidden min-h-0 bg-slate-50/50">
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
          @edit-move-route="handleEditMoveRoute"
        />

        <EventEditorCommandList
          v-if="activePage"
          v-model:selected-command-index="selectedCommandIndex"
          :page="activePage"
          :presentation-list="presentationList"
          :active-page-index="activePageIndex"
          :get-choice-name="getChoiceName"
          @open-editor="
            (index, isInsert) => (isInsert ? handleAddCommand(index) : handleEditCommand(index))
          "
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
      :initial-pixel-w="activePage?.graphic?.srcW"
      :initial-pixel-h="activePage?.graphic?.srcH"
      @close="showCharacterSelector = false"
      @select="onSelectGraphic"
    />

    <EventEditorCommandSelector
      v-if="activePage"
      :show="showCommandSelector"
      :page="activePage"
      :initial-command="editingCommandIndex !== null ? activePage.list[editingCommandIndex] : null"
      :is-autonomous-mode="isAutonomousRouteMode"
      :system-switches="store.systemSwitches"
      @close="
        () => {
          showCommandSelector = false
          isAutonomousRouteMode = false
        }
      "
      @save="handleCommandSave"
      @save-autonomous-route="handleSaveAutonomousRoute"
    />
  </div>
</template>
