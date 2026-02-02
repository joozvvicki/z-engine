<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, type Component } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import {
  IconDeviceFloppy,
  IconGhost,
  IconPlus,
  IconCopy,
  IconTrash,
  IconX,
  IconMessage,
  IconList,
  IconVariable,
  IconArrowRight,
  IconArrowLeft,
  IconArrowUp,
  IconArrowDown,
  IconMapPin,
  IconWalk,
  IconFlare,
  IconHourglass,
  IconChevronLeft,
  IconSettings
} from '@tabler/icons-vue'
import {
  ZEventTrigger,
  type ZEventPage,
  ZCommandCode,
  type ZEventCommand,
  type ZEventGraphic
} from '@engine/types'
import { ProjectService } from '../../services/ProjectService'
import CharacterSelector from './CharacterSelector.vue'

const props = defineProps<{
  x: number
  y: number
  eventId?: string | null
}>()

const emit = defineEmits(['close'])
const store = useEditorStore()
const showCharacterSelector = ref(false)

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
      graphic: existingEvent ? ((existingEvent as any).graphic as ZEventGraphic | null) : null,
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

const presentationList = computed(() => {
  if (!activePage.value) return []
  const list = activePage.value.list
  type PresentationItem =
    | { type: 'command'; command: ZEventCommand; indent: number; index: number }
    | { type: 'add'; indent: number; index: number }
  const result: PresentationItem[] = []
  let depth = 0

  // Helper to add 'Add' button
  const addPlaceholder = (idx: number, d: number): void => {
    result.push({ type: 'add', indent: d, index: idx })
  }

  list.forEach((cmd, idx) => {
    let lineIndent = depth
    if (
      cmd.code === ZCommandCode.EndBranch ||
      cmd.code === ZCommandCode.Else ||
      cmd.code === ZCommandCode.When ||
      cmd.code === ZCommandCode.EndChoices
    ) {
      lineIndent = Math.max(0, depth - 1)
    }

    // Special case: before adding a structural continuation (Else, When, End),
    // we might want an 'Add' placeholder for the block ABOVE it.
    if (
      cmd.code === ZCommandCode.Else ||
      cmd.code === ZCommandCode.When ||
      cmd.code === ZCommandCode.EndBranch ||
      cmd.code === ZCommandCode.EndChoices
    ) {
      // Only add placeholder if the previous command wasn't already a starter or continuation
      // to avoid double placeholders, but RPG Maker usually shows them anyway at the bottom of blocks.
      addPlaceholder(idx, depth)
    }

    result.push({ type: 'command', command: cmd, indent: lineIndent, index: idx })

    // Update depth for next lines
    if (cmd.code === ZCommandCode.ConditionalBranch || cmd.code === ZCommandCode.ShowChoices) {
      depth++
    } else if (cmd.code === ZCommandCode.EndBranch || cmd.code === ZCommandCode.EndChoices) {
      depth = Math.max(0, depth - 1)
    }
  })

  // Final placeholder at the very end
  addPlaceholder(list.length, depth)

  return result
})

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
  if (activePage.value && store.selection) {
    // Convert TileSelection to ZEventGraphic
    const sel = store.selection
    // Simple heuristic: if likely a tile, use 'tile'. If likely a char, use 'character'.
    // Use 'tile' by default for map selections.
    activePage.value.graphic = {
      assetId: sel.tilesetId,
      group: 'tile',
      x: sel.x,
      y: sel.y,
      w: sel.w,
      h: sel.h,
      srcX: sel.pixelX,
      srcY: sel.pixelY,
      srcW: sel.pixelW,
      srcH: sel.pixelH
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onSelectGraphic = (selection: any): void => {
  let graphic: ZEventGraphic | null = null

  if ('assetId' in selection) {
    graphic = selection as ZEventGraphic
  } else {
    // Adapt old format from CharacterSelector
    const isCharacter = selection.tilesetId.endsWith('.png')
    const assetId = isCharacter ? `img/characters/${selection.tilesetId}` : selection.tilesetId

    graphic = {
      assetId: assetId,
      group: isCharacter ? 'character' : 'tile',
      x: selection.x || 0,
      y: selection.y || 0,
      w: selection.w || 1,
      h: selection.h || 1,
      srcX: selection.pixelX,
      srcY: selection.pixelY,
      srcW: selection.pixelW,
      srcH: selection.pixelH
    }
  }

  if (isSelectingGraphicForCommand.value) {
    cmdParams.value.graphic = graphic
    isSelectingGraphicForCommand.value = false
  } else if (activePage.value) {
    activePage.value.graphic = graphic
  }

  showCharacterSelector.value = false
}

const getCharacterUrl = (filename: string): string => {
  return ProjectService.resolveAssetUrl(filename)
}

const getMoveIcon = (code: string): Component => {
  if (code.endsWith('_UP')) return IconArrowUp
  if (code.endsWith('_DOWN')) return IconArrowDown
  if (code.endsWith('_LEFT')) return IconArrowLeft
  return IconArrowRight
}

const addMoveCommand = (code: string): void => {
  const current = cmdParams.value.moveRoute || []
  cmdParams.value.moveRoute = [...current, { code }]
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

const deleteCommand = (index: number): void => {
  if (!activePage.value) return
  const cmd = activePage.value.list[index]

  // If Conditional Branch, find and delete the whole block
  if (cmd.code === ZCommandCode.ConditionalBranch) {
    if (!confirm('Deleting this branch will remove everything inside it. Continue?')) return // Simple check

    let depth = 0
    let endIndex = index
    for (let i = index; i < activePage.value.list.length; i++) {
      const scan = activePage.value.list[i]
      if (scan.code === ZCommandCode.ConditionalBranch) {
        depth++
      } else if (scan.code === ZCommandCode.EndBranch) {
        depth--
        if (depth === 0) {
          endIndex = i
          break
        }
      }
    }
    // Delete range [index, endIndex]
    const count = endIndex - index + 1
    activePage.value.list.splice(index, count)
  } else {
    // Standard delete
    activePage.value.list.splice(index, 1)
  }

  // Update selection
  if (activePage.value.list.length === 0) {
    selectedCommandIndex.value = null
  } else if (selectedCommandIndex.value !== null) {
    if (selectedCommandIndex.value >= activePage.value.list.length) {
      selectedCommandIndex.value = activePage.value.list.length - 1
    }
  }
}

// Keyboard shortcuts
const handleKeydown = (e: KeyboardEvent): void => {
  if (showCommandSelector.value) return // Don't interfere with modal
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedCommandIndex.value !== null) {
      deleteCommand(selectedCommandIndex.value)
    }
  } else if (e.key === 'Enter') {
    if (selectedCommandIndex.value !== null) {
      openCommandEditor(selectedCommandIndex.value)
    }
  } else if (e.key === 'ArrowUp') {
    if (selectedCommandIndex.value === null) {
      selectedCommandIndex.value = 0
    } else {
      selectedCommandIndex.value = Math.max(0, selectedCommandIndex.value - 1)
    }
    e.preventDefault()
  } else if (e.key === 'ArrowDown') {
    if (selectedCommandIndex.value === null) {
      selectedCommandIndex.value = 0
    } else {
      selectedCommandIndex.value = Math.min(
        activePage.value.list.length - 1,
        selectedCommandIndex.value + 1
      )
    }
    e.preventDefault()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

// Command Editing
const showCommandSelector = ref(false)
const commandSelectorStep = ref<'grid' | 'params'>('grid') // NEW
const commandCategory = ref('Messages') // NEW
const editingCommandIndex = ref<number | null>(null)
const selectedCommandIndex = ref<number | null>(null)
const commandListEl = ref<HTMLElement | null>(null)
const selectedCommandType = ref(201)

// Command Categories Definition
const commandCategories = [
  {
    id: 'Messages',
    icon: IconMessage,
    commands: [
      { code: ZCommandCode.ShowMessage, name: 'Show Message', icon: IconMessage },
      { code: ZCommandCode.ShowChoices, name: 'Show Choices', icon: IconList }
    ]
  },
  {
    id: 'Progression',
    icon: IconVariable,
    commands: [
      { code: ZCommandCode.ControlSwitch, name: 'Control Switch', icon: IconSettings },
      { code: ZCommandCode.ControlVariable, name: 'Control Variable', icon: IconVariable },
      { code: ZCommandCode.ControlSelfSwitch, name: 'Self Switch', icon: IconSettings },
      { code: ZCommandCode.ConditionalBranch, name: 'Cond. Branch', icon: IconArrowRight }
    ]
  },
  {
    id: 'Scene',
    icon: IconMapPin,
    commands: [
      { code: ZCommandCode.TransferPlayer, name: 'Transfer Player', icon: IconMapPin },
      { code: ZCommandCode.SetMoveRoute, name: 'Move Route', icon: IconWalk },
      { code: ZCommandCode.SetEventDirection, name: 'Set Direction', icon: IconArrowRight },
      { code: ZCommandCode.SetEventGraphic, name: 'Change Graphic', icon: IconGhost },
      { code: ZCommandCode.Wait, name: 'Wait', icon: IconHourglass },
      { code: ZCommandCode.ShowAnimation, name: 'Show Animation', icon: IconFlare }
    ]
  }
]
const getChoiceName = (itemIndex: number, choiceIndex: number): string => {
  if (!activePage.value) return 'Choice'
  const parent = activePage.value.list.find(
    (c, i) => i < itemIndex && c.code === ZCommandCode.ShowChoices && i > itemIndex - 20
  )
  if (parent) {
    const choices = parent.parameters[0] as string[]
    return choices[choiceIndex] || 'Choice'
  }
  return 'Choice'
}

const cmdParams = ref({
  mapId: 1,
  x: 0,
  y: 0,
  switchId: 0,
  switchOp: 1, // 0=OFF, 1=ON, 2=TOGGLE
  variableId: 0,
  variableOp: 0, // 0=Set, 1=Add, 2=Sub...
  variableValue: 0,
  branchType: 0, // 0=Switch, 1=Variable
  branchId: 0,
  branchVal: 1, // ON/OFF
  branchVarOp: 0, // Equal
  branchVarVal: 0,
  branchSelfSwitch: 'A',
  branchItem: 0,
  branchActor: 0,
  hasElse: false,
  choices: ['', '', ''], // Default 3 choices max
  selfSwitch: 'A',
  selfSwitchVal: 1,
  animationId: 1,
  direction: 'down' as 'down' | 'left' | 'right' | 'up',
  graphic: null as ZEventGraphic | null,
  waitFrames: 60,
  moveRoute: [] as unknown[]
})
const messageText = ref('')
const isSelectingGraphicForCommand = ref(false)

const openCommandEditor = (index: number | null = null, isInsert: boolean = false): void => {
  if (isInsert) {
    // INSERT MODE
    editingCommandIndex.value = null
    // If index is provided, it's the absolute index where we want to insert.
    // Our saveCommand logic currently uses selectedCommandIndex + 1.
    // So we set selectedCommandIndex to index - 1.
    if (index !== null) {
      selectedCommandIndex.value = index - 1
    }
  } else {
    // EDIT MODE
    editingCommandIndex.value = index
  }

  if (index !== null && !isInsert && activePage.value) {
    const cmd = activePage.value.list[index]
    selectedCommandType.value = cmd.code

    if (selectedCommandType.value === ZCommandCode.TransferPlayer) {
      cmdParams.value.mapId = cmd.parameters[0] as number
      cmdParams.value.x = cmd.parameters[1] as number
      cmdParams.value.y = cmd.parameters[2] as number
    } else if (selectedCommandType.value === ZCommandCode.ShowMessage) {
      messageText.value = cmd.parameters[0] as string
    } else if (selectedCommandType.value === ZCommandCode.ControlSwitch) {
      cmdParams.value.switchId = cmd.parameters[0] as number
      cmdParams.value.switchOp = cmd.parameters[1] as number
    } else if (selectedCommandType.value === ZCommandCode.ControlVariable) {
      cmdParams.value.variableId = cmd.parameters[0] as number
      cmdParams.value.variableOp = cmd.parameters[1] as number
      cmdParams.value.variableValue = cmd.parameters[2] as number
    } else if (selectedCommandType.value === ZCommandCode.ConditionalBranch) {
      cmdParams.value.branchType = cmd.parameters[0] as number
      cmdParams.value.branchId = cmd.parameters[1] as number
      if (cmdParams.value.branchType === 0) {
        cmdParams.value.branchVal = cmd.parameters[2] as number
      } else {
        cmdParams.value.branchVarVal = cmd.parameters[2] as number
      }
    } else if (selectedCommandType.value === ZCommandCode.ShowChoices) {
      cmdParams.value.choices = ((cmd.parameters[0] as string[]) || [])
        .concat(['', '', ''])
        .slice(0, 3)
    } else if (selectedCommandType.value === ZCommandCode.ControlSelfSwitch) {
      cmdParams.value.selfSwitch = cmd.parameters[0] as string
      cmdParams.value.selfSwitchVal = cmd.parameters[1] as number
    } else if (selectedCommandType.value === ZCommandCode.ShowAnimation) {
      cmdParams.value.animationId = (cmd.parameters[0] as number) || 1
    } else if (selectedCommandType.value === ZCommandCode.SetMoveRoute) {
      cmdParams.value.moveRoute = (cmd.parameters[0] as unknown[]) || []
    } else if (selectedCommandType.value === ZCommandCode.SetEventDirection) {
      cmdParams.value.direction = (cmd.parameters[0] as 'down' | 'left' | 'right' | 'up') || 'down'
    } else if (selectedCommandType.value === ZCommandCode.SetEventGraphic) {
      cmdParams.value.graphic = (cmd.parameters[0] as ZEventGraphic | null) || null
    } else if (selectedCommandType.value === ZCommandCode.Wait) {
      cmdParams.value.waitFrames = (cmd.parameters[0] as number) || 60
    }
  } else {
    // Reset for new
    selectedCommandType.value = ZCommandCode.SetEventDirection
    cmdParams.value = {
      mapId: 1,
      x: 0,
      y: 0,
      switchId: 0,
      switchOp: 1,
      variableId: 0,
      variableOp: 0,
      variableValue: 0,
      branchType: 0,
      branchId: 0,
      branchVal: 1,
      branchVarOp: 0,
      branchVarVal: 0,
      branchSelfSwitch: 'A',
      branchItem: 0,
      branchActor: 0,
      hasElse: false,
      choices: ['', '', ''],
      selfSwitch: 'A',
      selfSwitchVal: 1,
      animationId: 1,
      direction: 'down',
      graphic: null,
      waitFrames: 60,
      moveRoute: []
    }
    messageText.value = ''
  }

  // Set initial step: Edit mode goes directly to params, Insert mode starts at grid
  commandSelectorStep.value = isInsert ? 'grid' : 'params'
  showCommandSelector.value = true
}

const selectGridCommand = (code: number): void => {
  selectedCommandType.value = code
  commandSelectorStep.value = 'params'
}

const saveCommand = (): void => {
  if (!activePage.value) return
  let newCommand
  if (selectedCommandType.value === ZCommandCode.TransferPlayer) {
    newCommand = {
      code: ZCommandCode.TransferPlayer,
      parameters: [cmdParams.value.mapId, cmdParams.value.x, cmdParams.value.y]
    }
  } else if (selectedCommandType.value === ZCommandCode.ShowMessage) {
    newCommand = {
      code: ZCommandCode.ShowMessage,
      parameters: [messageText.value]
    }
  } else if (selectedCommandType.value === ZCommandCode.ControlSwitch) {
    newCommand = {
      code: ZCommandCode.ControlSwitch,
      parameters: [cmdParams.value.switchId, cmdParams.value.switchOp]
    }
  } else if (selectedCommandType.value === ZCommandCode.ControlVariable) {
    newCommand = {
      code: ZCommandCode.ControlVariable,
      parameters: [
        cmdParams.value.variableId,
        cmdParams.value.variableOp,
        cmdParams.value.variableValue
      ]
    }
  } else if (selectedCommandType.value === ZCommandCode.ConditionalBranch) {
    newCommand = {
      code: ZCommandCode.ConditionalBranch,
      parameters: [
        cmdParams.value.branchType,
        cmdParams.value.branchId,
        cmdParams.value.branchType === 0 ? cmdParams.value.branchVal : cmdParams.value.branchVarVal
      ]
    }
  } else if (selectedCommandType.value === ZCommandCode.ShowChoices) {
    const validChoices = cmdParams.value.choices.filter((c) => c && c.trim().length > 0)
    if (validChoices.length === 0) return // Must have choices
    newCommand = {
      code: ZCommandCode.ShowChoices,
      parameters: [validChoices]
    }
  } else if (selectedCommandType.value === ZCommandCode.ControlSelfSwitch) {
    newCommand = {
      code: ZCommandCode.ControlSelfSwitch,
      parameters: [cmdParams.value.selfSwitch, cmdParams.value.selfSwitchVal]
    }
  } else if (selectedCommandType.value === ZCommandCode.ShowAnimation) {
    newCommand = {
      code: ZCommandCode.ShowAnimation,
      parameters: [cmdParams.value.animationId]
    }
  } else if (selectedCommandType.value === ZCommandCode.SetMoveRoute) {
    newCommand = {
      code: ZCommandCode.SetMoveRoute,
      parameters: [cmdParams.value.moveRoute]
    }
  } else if (selectedCommandType.value === ZCommandCode.SetEventDirection) {
    newCommand = {
      code: ZCommandCode.SetEventDirection,
      parameters: [cmdParams.value.direction]
    }
  } else if (selectedCommandType.value === ZCommandCode.SetEventGraphic) {
    newCommand = {
      code: ZCommandCode.SetEventGraphic,
      parameters: [cmdParams.value.graphic]
    }
  } else if (selectedCommandType.value === ZCommandCode.Wait) {
    newCommand = {
      code: ZCommandCode.Wait,
      parameters: [cmdParams.value.waitFrames]
    }
  } else {
    return
  }

  if (editingCommandIndex.value !== null) {
    // Editing existing
    activePage.value.list[editingCommandIndex.value] = newCommand
    selectedCommandIndex.value = editingCommandIndex.value // Keep selected
  } else {
    // Inserting new
    if (selectedCommandIndex.value !== null) {
      // Insert AFTER selected
      const targetIndex = selectedCommandIndex.value + 1
      activePage.value.list.splice(targetIndex, 0, newCommand)

      // Auto-add EndBranch if needed
      if (newCommand.code === ZCommandCode.ConditionalBranch) {
        if (cmdParams.value.hasElse) {
          activePage.value.list.splice(targetIndex + 1, 0, {
            code: ZCommandCode.Else,
            parameters: []
          })
          activePage.value.list.splice(targetIndex + 2, 0, {
            code: ZCommandCode.EndBranch,
            parameters: []
          })
        } else {
          activePage.value.list.splice(targetIndex + 1, 0, {
            code: ZCommandCode.EndBranch,
            parameters: []
          })
        }
      } else if (newCommand.code === ZCommandCode.ShowChoices) {
        // Add When blocks and EndChoices
        const choices = newCommand.parameters[0] as string[]
        let offset = 1
        choices.forEach((_, idx) => {
          activePage.value.list.splice(targetIndex + offset, 0, {
            code: ZCommandCode.When,
            parameters: [idx]
          })
          offset++
        })
        activePage.value.list.splice(targetIndex + offset, 0, {
          code: ZCommandCode.EndChoices,
          parameters: []
        })
      }

      // AUTO-SELECT for easier nesting
      // If we added a branch (If/ShowChoices), select the 'If'/'ShowChoices' line
      // so the NEXT insertion (which happens at selectedCommandIndex + 1)
      // goes INSIDE the branch.
      selectedCommandIndex.value = targetIndex
    } else {
      // Add to end
      const targetIndex = activePage.value.list.length
      activePage.value.list.push(newCommand)
      if (newCommand.code === ZCommandCode.ConditionalBranch) {
        if (cmdParams.value.hasElse) {
          activePage.value.list.push({ code: ZCommandCode.Else, parameters: [] })
        }
        activePage.value.list.push({ code: ZCommandCode.EndBranch, parameters: [] })
      } else if (newCommand.code === ZCommandCode.ShowChoices) {
        const choices = newCommand.parameters[0] as string[]
        choices.forEach((_, idx) => {
          activePage.value.list.push({ code: ZCommandCode.When, parameters: [idx] })
        })
        activePage.value.list.push({ code: ZCommandCode.EndChoices, parameters: [] })
      }
      selectedCommandIndex.value = targetIndex
    }
  }

  showCommandSelector.value = false
  editingCommandIndex.value = null

  // Scroll to selected
  if (selectedCommandIndex.value !== null) {
    nextTick(() => {
      const el = commandListEl.value?.querySelector(`[data-index="${selectedCommandIndex.value}"]`)
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }
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
              <div class="flex items-center gap-3">
                <input
                  v-model="activePage.conditions.switch1Id"
                  type="checkbox"
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-xs font-medium text-slate-500">Switch 1</span>
              </div>
              <div class="flex items-center gap-3">
                <input
                  v-model="activePage.conditions.variableId"
                  type="checkbox"
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-xs font-medium text-slate-500">Variable</span>
              </div>
              <div class="flex items-center gap-3">
                <input
                  v-model="activePage.conditions.selfSwitchCh"
                  type="checkbox"
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-xs font-medium text-slate-500">Self Switch</span>
              </div>
              <div class="flex items-center gap-3">
                <input
                  v-model="activePage.conditions.item"
                  type="checkbox"
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-xs font-medium text-slate-500">Item Possession</span>
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
                @dblclick="showCharacterSelector = true"
              >
                <template v-if="activePage.graphic">
                  <!-- Show Tile or Character -->
                  <!-- If it's a character, render it -->
                  <div
                    v-if="activePage.graphic.group === 'character'"
                    class="w-full h-full relative flex items-center justify-center transform scale-75"
                  >
                    <!-- Calculate offset based on selected frame (pixel or tile) -->
                    <div
                      class="pixelated"
                      :style="{
                        width: `${activePage.graphic.srcW || 48}px`,
                        height: `${activePage.graphic.srcH || 48}px`,
                        backgroundImage: `url(${getCharacterUrl(activePage.graphic.assetId)})`,
                        backgroundPosition:
                          activePage.graphic.srcX !== undefined
                            ? `-${activePage.graphic.srcX}px -${activePage.graphic.srcY}px`
                            : (() => {
                                // Default preview frame logic: calculate frame offset
                                if (activePage.graphic.group === 'character') {
                                  // Simplified guess: Use col 0/1 logic if we can detect it
                                  return `-${(activePage.graphic.x || 0) * 48}px -${(activePage.graphic.y || 0) * 48}px`
                                }
                                return `-${(activePage.graphic.x || 0) * 48}px -${(activePage.graphic.y || 0) * 48}px`
                              })()
                      }"
                    ></div>
                  </div>
                  <!-- Else it's a map tile -->
                  <div v-else class="text-center group-hover:scale-110 transition-transform">
                    <div class="text-2xl mb-1 drop-shadow-sm">🖼️</div>
                  </div>

                  <div
                    class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-mono text-center p-0.5 truncate backdrop-blur-sm"
                  >
                    {{ activePage.graphic.assetId }}
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
                  @click="showCharacterSelector = true"
                >
                  Select Graphic
                </button>
                <button
                  v-if="store.selection"
                  class="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-lg transition-colors border border-slate-200"
                  title="Use current map selection"
                  @click="setGraphicFromSelection"
                >
                  Use Map Selection
                </button>
                <button
                  class="px-3 py-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-500 text-xs font-bold rounded-lg transition-colors border border-slate-200 hover:border-red-200"
                  @click="clearGraphic"
                >
                  Clear Graphic
                </button>
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

          <div ref="commandListEl" class="flex-1 overflow-y-auto p-0 scrollbar-thin">
            <!-- Empty State -->
            <div
              v-if="activePage.list.length === 0"
              class="flex flex-col items-center justify-center py-20 text-slate-300 select-none"
            >
              <IconGhost size="48" class="mb-2 opacity-50" />
              <p class="text-xs font-medium">No commands yet</p>
              <p class="text-[10px]">Double click to insert</p>
            </div>

            <div class="flex flex-col font-mono text-sm pb-10">
              <template v-for="(item, idx) in presentationList" :key="idx">
                <!-- Command -->
                <div
                  v-if="item.type === 'command'"
                  :data-index="item.index"
                  class="group flex items-center gap-3 px-4 py-2 cursor-pointer border-b border-white transition-colors select-none"
                  :class="
                    selectedCommandIndex === item.index
                      ? 'bg-blue-100 border-blue-200'
                      : 'hover:bg-blue-50 hover:border-blue-100'
                  "
                  :style="{ paddingLeft: `${item.indent * 20 + 16}px` }"
                  @click="selectedCommandIndex = item.index"
                  @dblclick="openCommandEditor(item.index)"
                >
                  <span class="text-slate-300 text-[10px] w-6 text-right select-none shrink-0">{{
                    String(item.index + 1).padStart(3, '0')
                  }}</span>
                  <!-- Command Display Logic -->
                  <div class="flex items-center gap-2 flex-1">
                    <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      :class="{
                        'bg-sky-400': item.command.code === ZCommandCode.ShowMessage,
                        'bg-purple-400':
                          item.command.code === ZCommandCode.ConditionalBranch ||
                          item.command.code === ZCommandCode.Else ||
                          item.command.code === ZCommandCode.EndBranch,
                        'bg-orange-400':
                          item.command.code === ZCommandCode.ShowChoices ||
                          item.command.code === ZCommandCode.When ||
                          item.command.code === ZCommandCode.EndChoices,
                        'bg-rose-400':
                          item.command.code === ZCommandCode.ControlSwitch ||
                          item.command.code === ZCommandCode.ControlVariable ||
                          item.command.code === ZCommandCode.ControlSelfSwitch,
                        'bg-emerald-400':
                          item.command.code === ZCommandCode.TransferPlayer ||
                          item.command.code === ZCommandCode.SetMoveRoute,
                        'bg-yellow-400': item.command.code === ZCommandCode.ShowAnimation,
                        'bg-slate-500':
                          item.command.code === ZCommandCode.Wait ||
                          item.command.code === ZCommandCode.SetEventDirection ||
                          item.command.code === ZCommandCode.SetEventGraphic,
                        'bg-slate-300': !Object.values(ZCommandCode).includes(item.command.code)
                      }"
                    ></span>

                    <!-- Transfer Player -->
                    <span
                      v-if="item.command.code === ZCommandCode.TransferPlayer"
                      class="text-slate-700 font-medium font-sans"
                      >Transfer Player (Map {{ item.command.parameters[0] }},
                      {{ item.command.parameters[1] }}, {{ item.command.parameters[2] }})</span
                    >
                    <!-- Show Message -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.ShowMessage"
                      class="text-slate-700 font-medium font-sans"
                      >Show Message: "{{ item.command.parameters[0] }}"</span
                    >
                    <!-- Switch -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.ControlSwitch"
                      class="text-slate-700 font-medium font-sans"
                    >
                      Switch #{{ item.command.parameters[0] }} =
                      {{
                        item.command.parameters[1] === 0
                          ? 'OFF'
                          : item.command.parameters[1] === 1
                            ? 'ON'
                            : 'TOGGLE'
                      }}
                    </span>
                    <!-- Variable -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.ControlVariable"
                      class="text-slate-700 font-medium font-sans"
                    >
                      Var #{{ item.command.parameters[0] }}
                      {{
                        ['Set', 'Add', 'Sub', 'Mul', 'Div', 'Mod'][
                          item.command.parameters[1] as number
                        ]
                      }}
                      {{ item.command.parameters[2] }}
                    </span>
                    <!-- Conditional -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.ConditionalBranch"
                      class="text-purple-700 font-bold font-sans"
                    >
                      If
                      {{
                        item.command.parameters[0] === 0
                          ? `Switch #${item.command.parameters[1]} is ${item.command.parameters[2] ? 'ON' : 'OFF'}`
                          : `Var #${item.command.parameters[1]} == ${item.command.parameters[2]}`
                      }}
                    </span>
                    <!-- Else -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.Else"
                      class="text-purple-700 font-bold font-sans"
                    >
                      Else
                    </span>
                    <!-- End -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.EndBranch"
                      class="text-purple-700 font-bold font-sans"
                    >
                      End Branch
                    </span>

                    <!-- Show Choices -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.ShowChoices"
                      class="text-orange-700 font-bold font-sans"
                    >
                      Show Choices: {{ (item.command.parameters[0] as string[]).join(', ') }}
                    </span>
                    <!-- When -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.When"
                      class="text-orange-700 font-bold font-sans"
                    >
                      When "{{ getChoiceName(item.index, item.command.parameters[0] as number) }}"
                    </span>
                    <!-- End Choices -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.EndChoices"
                      class="text-orange-700 font-bold font-sans"
                    >
                      End Choices
                    </span>

                    <!-- Self Switch -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.ControlSelfSwitch"
                      class="text-rose-700 font-medium font-sans"
                    >
                      Self Switch {{ item.command.parameters[0] }} =
                      {{ item.command.parameters[1] ? 'ON' : 'OFF' }}
                    </span>

                    <!-- Animation -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.ShowAnimation"
                      class="text-yellow-700 font-medium font-sans"
                    >
                      Show Animation #{{ item.command.parameters[0] }}
                    </span>

                    <!-- Wait -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.Wait"
                      class="text-slate-600 font-medium font-sans"
                    >
                      Wait: {{ item.command.parameters[0] }} frames
                    </span>
                    <!-- Set Direction -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.SetEventDirection"
                      class="text-slate-600 font-medium font-sans"
                    >
                      Set Direction: {{ item.command.parameters[0] }}
                    </span>
                    <!-- Set Graphic -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.SetEventGraphic"
                      class="text-slate-600 font-medium font-sans"
                    >
                      Change Graphic:
                      {{
                        (item.command.parameters[0] as ZEventGraphic)?.assetId?.split('/').pop() ||
                        'None'
                      }}
                    </span>
                    <!-- Move Route -->
                    <span
                      v-else-if="item.command.code === ZCommandCode.SetMoveRoute"
                      class="text-emerald-700 font-medium font-sans"
                    >
                      Set Move Route ({{ (item.command.parameters[0] as any[])?.length || 0 }}
                      cmds)
                    </span>

                    <span v-else class="text-slate-400 font-medium font-sans italic"
                      >Unknown Command ({{ item.command.code }})</span
                    >
                    <IconTrash
                      v-if="
                        item.command.code !== ZCommandCode.Else &&
                        item.command.code !== ZCommandCode.EndBranch &&
                        item.command.code !== ZCommandCode.When &&
                        item.command.code !== ZCommandCode.EndChoices
                      "
                      size="14"
                      class="ml-auto text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      @click.stop="deleteCommand(item.index)"
                    />
                  </div>
                </div>

                <!-- Add Placeholder -->
                <div
                  v-else
                  class="group flex items-center gap-3 px-4 py-1.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  :style="{ paddingLeft: `${item.indent * 20 + 16}px` }"
                  @dblclick="openCommandEditor(item.index, true)"
                  @click="selectedCommandIndex = item.index - 1"
                >
                  <span
                    class="text-slate-300 text-[10px] w-6 text-right select-none opacity-0 shrink-0"
                    >@</span
                  >
                  <div
                    class="flex items-center gap-2 text-slate-300 group-hover:text-blue-400 transition-colors"
                  >
                    <span class="font-mono text-xs opacity-50">&lt;&gt;</span>
                    <span
                      class="text-[10px] uppercase tracking-widest font-bold opacity-0 group-hover:opacity-100"
                      >Add Command</span
                    >
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

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

    <div
      v-if="showCommandSelector"
      class="fixed inset-0 z-60 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
      @click.self="showCommandSelector = false"
    >
      <div
        class="bg-white rounded-xl shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        :class="commandSelectorStep === 'grid' ? 'w-[640px] h-[480px]' : 'w-[480px]'"
      >
        <!-- Modal Header -->
        <div
          class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0"
        >
          <div class="flex items-center gap-2">
            <button
              v-if="commandSelectorStep === 'params' && editingCommandIndex === null"
              class="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-500"
              @click="commandSelectorStep = 'grid'"
            >
              <IconChevronLeft size="16" />
            </button>
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500">
              {{
                editingCommandIndex !== null
                  ? 'Edit Command'
                  : commandSelectorStep === 'grid'
                    ? 'Insert Command'
                    : 'Command Parameters'
              }}
            </h3>
          </div>
          <button class="text-slate-400 hover:text-slate-600" @click="showCommandSelector = false">
            <IconX size="16" />
          </button>
        </div>

        <!-- NEW: Command Grid Step -->
        <div v-if="commandSelectorStep === 'grid'" class="flex-1 flex overflow-hidden">
          <!-- Sidebar Categories -->
          <div
            class="w-40 border-r border-slate-100 bg-slate-50/50 flex flex-col p-2 gap-1 uppercase tracking-tighter"
          >
            <button
              v-for="cat in commandCategories"
              :key="cat.id"
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[10px] font-black transition-all"
              :class="
                commandCategory === cat.id
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
              "
              @click="commandCategory = cat.id"
            >
              <component :is="cat.icon" size="14" stroke-width="2.5" />
              {{ cat.id }}
            </button>
          </div>

          <!-- Command Buttons Grid -->
          <div class="flex-1 overflow-y-auto p-4 content-start">
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="cmd in commandCategories.find((c) => c.id === commandCategory)?.commands"
                :key="cmd.code"
                class="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-400 hover:bg-blue-50/30 hover:scale-[1.02] active:scale-[0.98] transition-all group shadow-sm text-center"
                @click="selectGridCommand(cmd.code)"
              >
                <div
                  class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors"
                >
                  <component :is="cmd.icon" size="20" stroke-width="2.5" />
                </div>
                <span
                  class="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 leading-tight"
                >
                  {{ cmd.name }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Params Step (The existing content, wrapped) -->
        <div v-if="commandSelectorStep === 'params'" class="p-6 space-y-5 flex-1 overflow-y-auto">
          <!-- The category select is now hidden or converted to breadcrumb if needed -->
          <div class="pb-2 mb-4 border-b border-slate-50 flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"
            >
              <component
                :is="
                  commandCategories
                    .flatMap((c) => c.commands)
                    .find((c) => c.code === selectedCommandType)?.icon || IconSettings
                "
                size="16"
              />
            </div>
            <div>
              <div class="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                Editing Parameters
              </div>
              <div class="text-xs font-bold text-slate-800">
                {{
                  commandCategories
                    .flatMap((c) => c.commands)
                    .find((c) => c.code === selectedCommandType)?.name
                }}
              </div>
            </div>
          </div>

          <!-- Existing Param Fields... -->
          <div v-if="selectedCommandType === 101" class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Message Text</label
              >
              <textarea
                v-model="messageText"
                rows="4"
                placeholder="Enter message text..."
                class="w-full border border-slate-200 rounded px-3 py-2 text-sm font-sans resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              ></textarea>
            </div>
          </div>

          <!-- Show Choices Params -->
          <div v-if="selectedCommandType === ZCommandCode.ShowChoices" class="space-y-3">
            <div class="space-y-2">
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Choices (Max 3)</label
              >
              <div v-for="(_, idx) in cmdParams.choices" :key="idx" class="flex gap-2 items-center">
                <span class="text-[10px] font-mono text-slate-300 w-4">{{ idx + 1 }}.</span>
                <input
                  v-model="cmdParams.choices[idx]"
                  type="text"
                  :placeholder="'Choice ' + (idx + 1)"
                  class="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <p class="text-[9px] text-slate-400">
              Empty choices will be ignored. At least one choice is required.
            </p>
          </div>

          <!-- Control Switch Params -->
          <div v-if="selectedCommandType === ZCommandCode.ControlSwitch" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Switch ID</label
                >
                <select
                  v-model.number="cmdParams.switchId"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
                >
                  <option :value="0">0: None</option>
                  <option v-for="(name, idx) in store.systemSwitches" :key="idx" :value="idx + 1">
                    {{ String(idx + 1).padStart(3, '0') }}: {{ name || 'Unnamed' }}
                  </option>
                </select>
              </div>
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Operation</label
                >
                <select
                  v-model.number="cmdParams.switchOp"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-medium"
                >
                  <option :value="1">ON</option>
                  <option :value="0">OFF</option>
                  <option :value="2">TOGGLE</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Control Variable Params -->
          <div v-if="selectedCommandType === ZCommandCode.ControlVariable" class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Variable ID</label
              >
              <select
                v-model.number="cmdParams.variableId"
                class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
              >
                <option :value="0">0: None</option>
                <option v-for="(name, idx) in store.systemVariables" :key="idx" :value="idx + 1">
                  {{ String(idx + 1).padStart(3, '0') }}: {{ name || 'Unnamed' }}
                </option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Operation</label
                >
                <select
                  v-model.number="cmdParams.variableOp"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-medium"
                >
                  <option :value="0">Set (=)</option>
                  <option :value="1">Add (+)</option>
                  <option :value="2">Sub (-)</option>
                  <option :value="3">Mul (*)</option>
                  <option :value="4">Div (/)</option>
                  <option :value="5">Mod (%)</option>
                </select>
              </div>
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Value</label
                >
                <input
                  v-model.number="cmdParams.variableValue"
                  type="number"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <!-- Conditional Branch Params -->
          <div v-if="selectedCommandType === ZCommandCode.ConditionalBranch" class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Condition Type</label
              >
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model.number="cmdParams.branchType"
                    type="radio"
                    :value="0"
                    class="text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm font-medium text-slate-700">Switch</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model.number="cmdParams.branchType"
                    type="radio"
                    :value="1"
                    class="text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm font-medium text-slate-700">Variable</span>
                </label>
              </div>
            </div>

            <!-- Switch Condition -->
            <div v-if="cmdParams.branchType === 0" class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Switch</label
                >
                <select
                  v-model.number="cmdParams.branchId"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
                >
                  <option :value="0">0: None</option>
                  <option v-for="(name, idx) in store.systemSwitches" :key="idx" :value="idx + 1">
                    {{ String(idx + 1).padStart(3, '0') }}: {{ name || 'Unnamed' }}
                  </option>
                </select>
              </div>
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >State</label
                >
                <select
                  v-model.number="cmdParams.branchVal"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-medium"
                >
                  <option :value="1">ON</option>
                  <option :value="0">OFF</option>
                </select>
              </div>
            </div>

            <!-- Variable Condition -->
            <div v-if="cmdParams.branchType === 1" class="space-y-3">
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Variable</label
                >
                <select
                  v-model.number="cmdParams.branchId"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
                >
                  <option :value="0">0: None</option>
                  <option v-for="(name, idx) in store.systemVariables" :key="idx" :value="idx + 1">
                    {{ String(idx + 1).padStart(3, '0') }}: {{ name || 'Unnamed' }}
                  </option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                    >Operator</label
                  >
                  <select
                    disabled
                    class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-medium bg-gray-50 opacity-50"
                  >
                    <option :value="0">Equal To (=)</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                    >Value</label
                  >
                  <input
                    v-model.number="cmdParams.branchVarVal"
                    type="number"
                    class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <!-- Has Else Checkbox -->
            <div class="pt-2 border-t border-slate-100">
              <label class="flex items-center gap-2 cursor-pointer group">
                <input
                  v-model="cmdParams.hasElse"
                  type="checkbox"
                  :disabled="editingCommandIndex !== null"
                  class="accent-blue-600 w-4 h-4 rounded border-slate-300 group-hover:ring-2 ring-blue-100 transition-all disabled:opacity-50"
                />
                <div class="flex flex-col">
                  <span class="text-xs font-bold text-slate-600 group-hover:text-blue-700"
                    >Create Else Branch</span
                  >
                  <span
                    v-if="editingCommandIndex !== null"
                    class="text-[9px] text-slate-400 font-normal"
                    >Cannot modify structure (Else) after creation</span
                  >
                </div>
              </label>
            </div>
          </div>

          <!-- Control Self Switch Params -->
          <div v-if="selectedCommandType === ZCommandCode.ControlSelfSwitch" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Self Switch</label
                >
                <select
                  v-model="cmdParams.selfSwitch"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-bold"
                >
                  <option v-for="ch in ['A', 'B', 'C', 'D']" :key="ch" :value="ch">{{ ch }}</option>
                </select>
              </div>
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >State</label
                >
                <select
                  v-model.number="cmdParams.selfSwitchVal"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-medium"
                >
                  <option :value="1">ON</option>
                  <option :value="0">OFF</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Transfer Player Params -->
          <div v-if="selectedCommandType === ZCommandCode.TransferPlayer" class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Target Map</label
              >
              <select
                v-model.number="cmdParams.mapId"
                class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-medium"
              >
                <option v-for="map in store.maps" :key="map.id" :value="map.id">
                  {{ map.name }} (ID: {{ map.id }})
                </option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >X Coordinate</label
                >
                <input
                  v-model.number="cmdParams.x"
                  type="number"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
                />
              </div>
              <div>
                <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                  >Y Coordinate</label
                >
                <input
                  v-model.number="cmdParams.y"
                  type="number"
                  class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
                />
              </div>
            </div>
            <div
              class="p-2 bg-blue-50 border border-blue-100 rounded-lg text-[10px] text-blue-600 italic"
            >
              Tip: You can find coordinates by looking at the status bar in the map editor.
            </div>
          </div>

          <!-- Wait Params -->
          <div v-if="selectedCommandType === ZCommandCode.Wait" class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Wait Duration (Frames)</label
              >
              <div class="flex items-center gap-3">
                <input
                  v-model.number="cmdParams.waitFrames"
                  type="number"
                  min="1"
                  max="999"
                  class="flex-1 border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:border-blue-500 outline-none transition-all"
                />
                <span class="text-xs text-slate-400 w-24">
                  ≈ {{ (cmdParams.waitFrames / 60).toFixed(2) }}s
                </span>
              </div>
            </div>
          </div>

          <!-- Set Event Direction Params -->
          <div v-if="selectedCommandType === ZCommandCode.SetEventDirection" class="space-y-3">
            <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
              >New Direction</label
            >
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="dir in ['down', 'left', 'right', 'up']"
                :key="dir"
                class="px-2 py-3 rounded-lg border flex flex-col items-center gap-1 transition-all uppercase text-[10px] font-bold"
                :class="
                  cmdParams.direction === dir
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400'
                "
                @click="cmdParams.direction = dir as 'down' | 'left' | 'right' | 'up'"
              >
                <component :is="getMoveIcon(dir.toUpperCase())" size="16" />
                {{ dir }}
              </button>
            </div>
          </div>

          <!-- Set Event Graphic Params -->
          <div v-if="selectedCommandType === ZCommandCode.SetEventGraphic" class="space-y-4">
            <label class="text-[10px] font-bold uppercase text-slate-400 block"
              >Change Graphic To</label
            >
            <div
              class="w-full h-32 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white hover:border-blue-400 transition-all group"
              @click="
                () => {
                  isSelectingGraphicForCommand = true
                  showCharacterSelector = true
                }
              "
            >
              <div v-if="!cmdParams.graphic" class="flex flex-col items-center text-slate-400">
                <IconGhost size="32" stroke-width="1.5" />
                <span class="text-[10px] font-bold uppercase mt-2">Cliquez pour choisir</span>
              </div>
              <div v-else class="flex flex-col items-center">
                <!-- Simple text preview of graphic -->
                <div
                  class="text-[10px] font-mono text-slate-600 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100"
                >
                  {{ cmdParams.graphic.assetId.split('/').pop() }}
                </div>
                <div class="text-[9px] text-slate-400 mt-1 uppercase font-black">
                  Click to change
                </div>
              </div>
            </div>
          </div>

          <!-- Show Animation Params -->
          <div v-if="selectedCommandType === ZCommandCode.ShowAnimation" class="space-y-3">
            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1"
                >Animation ID</label
              >
              <input
                v-model.number="cmdParams.animationId"
                type="number"
                class="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-mono"
              />
            </div>
          </div>

          <!-- Set Move Route Params -->
          <div v-if="selectedCommandType === ZCommandCode.SetMoveRoute" class="space-y-4">
            <div>
              <label class="text-[10px] font-bold uppercase text-slate-400 block mb-2"
                >Movement Route</label
              >
              <div
                class="bg-slate-900 rounded-lg p-3 min-h-[120px] max-h-[200px] overflow-y-auto scrollbar-thin"
              >
                <div
                  v-if="!cmdParams.moveRoute || cmdParams.moveRoute.length === 0"
                  class="text-[10px] text-slate-500 italic text-center mt-8"
                >
                  No movement commands
                </div>
                <div v-else class="space-y-1">
                  <div
                    v-for="(cmd, idx) in cmdParams.moveRoute"
                    :key="idx"
                    class="group flex items-center justify-between bg-white/5 hover:bg-white/10 rounded px-2 py-1 border border-white/5 transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <component
                        :is="getMoveIcon((cmd as any).code)"
                        v-if="
                          (cmd as any).code.startsWith('MOVE_') ||
                          (cmd as any).code.startsWith('TURN_')
                        "
                        size="12"
                        class="text-blue-400"
                      />
                      <IconHourglass
                        v-else-if="(cmd as any).code === 'WAIT'"
                        size="12"
                        class="text-orange-400"
                      />
                      <IconPlus v-else size="12" class="text-slate-500" />
                      <span class="text-[10px] font-bold text-slate-200">
                        {{
                          (cmd as any).code === 'WAIT'
                            ? `Wait (${(cmd as any).params?.[0] || 60}f)`
                            : (cmd as any).code.replace('MOVE_', 'Move ').replace('TURN_', 'Turn ')
                        }}
                      </span>
                    </div>
                    <button
                      class="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      @click="cmdParams.moveRoute.splice(idx, 1)"
                    >
                      <IconTrash size="12" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="move in [
                  'UP',
                  'DOWN',
                  'LEFT',
                  'RIGHT',
                  'TURN_UP',
                  'TURN_DOWN',
                  'TURN_LEFT',
                  'TURN_RIGHT'
                ]"
                :key="move"
                class="aspect-square bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg flex flex-col items-center justify-center transition-all border border-slate-200 hover:border-blue-600 active:scale-95"
                :title="move.replace('_', ' ')"
                @click="addMoveCommand(move)"
              >
                <component :is="getMoveIcon(move)" size="20" stroke-width="3" />
              </button>
              <button
                class="col-span-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-slate-600 uppercase transition-all active:scale-95"
                @click="
                  cmdParams.moveRoute = [
                    ...((cmdParams.moveRoute as any[]) || []),
                    { code: 'WAIT', params: [60] }
                  ]
                "
              >
                Wait (1s)
              </button>
              <button
                class="col-span-2 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-[10px] font-bold text-red-600 uppercase transition-all active:scale-95"
                @click="cmdParams.moveRoute = []"
              >
                Reset
              </button>
            </div>
          </div>

          <button
            class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs uppercase"
            @click="saveCommand"
          >
            {{ editingCommandIndex !== null ? 'Update Command' : 'Insert Command' }}
          </button>
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
