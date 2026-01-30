import { type Ref, type ComputedRef } from 'vue'
import {
  type ZMap,
  type ZEvent,
  type ZEventPage,
  ZEventTrigger,
  type ZEventGraphic
} from '@engine/types'

export const useEventManagement = (
  activeMap: ComputedRef<ZMap | undefined>,
  isTestMode: Ref<boolean>,
  playerPos: Ref<{ x: number; y: number }>,
  spawnPos: Ref<{ x: number; y: number }>,
  saveProject: () => void,
  history: { recordHistory: () => void }
): {
  addEvent: (x: number, y: number, eventData: Partial<ZEvent>) => void
  updateEvent: (eventId: string, updates: Partial<ZEvent>) => void
  deleteEvent: (eventId: string) => void
  toggleTestMode: () => void
  movePlayer: (dx: number, dy: number, mapWidth: number, mapHeight: number) => void
} => {
  // Helper for Default Page
  const createDefaultPage = (graphic: ZEventGraphic | null): ZEventPage => ({
    id: `page_${Date.now()}`,
    conditions: {},
    graphic,
    trigger: ZEventTrigger.Action, // Default: Action Button
    options: {
      moveRoute: null,
      walkAnim: true,
      stepAnim: false,
      directionFix: false,
      through: false
    },
    list: []
  })

  const addEvent = (x: number, y: number, eventData: Partial<ZEvent>): void => {
    if (!activeMap.value) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const initialGraphic = (eventData as any).graphic || null

    const newEvent: ZEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: eventData.name || `EV${activeMap.value.events.length + 1}`,
      x,
      y,
      // Graphic is now inside pages[0]
      pages: [createDefaultPage(initialGraphic)]
    }

    // Enforce uniqueness for PlayerStart
    if (newEvent.name === 'PlayerStart') {
      activeMap.value.events = activeMap.value.events.filter((e) => e.name !== 'PlayerStart')
    }

    activeMap.value.events.push(newEvent)
    saveProject()
    history.recordHistory()
  }

  const updateEvent = (eventId: string, updates: Partial<ZEvent>): void => {
    if (!activeMap.value) return
    const ev = activeMap.value.events.find((e) => e.id === eventId)
    if (ev) {
      // Handle graphic update for migration/backward compatibility
      // If 'graphic' is passed in updates (from old UI), update active page (Last page usually)
      if ('graphic' in updates) {
        // This is a temporary hack until UI generates pages
        // If pages exist, update the last one? Or first?
        if (ev.pages.length > 0) {
          ev.pages[0].graphic = updates.graphic as ZEventGraphic | null
        } else {
          ev.pages = [createDefaultPage(updates.graphic as ZEventGraphic | null)]
        }
        delete updates.graphic
      }

      Object.assign(ev, updates)

      // Enforce uniqueness for PlayerStart
      if (updates.name === 'PlayerStart') {
        activeMap.value.events = activeMap.value.events.filter(
          (e) => e.id === eventId || e.name !== 'PlayerStart'
        )
      }

      saveProject()
      history.recordHistory()
    }
  }

  const deleteEvent = (eventId: string): void => {
    if (!activeMap.value) return
    activeMap.value.events = activeMap.value.events.filter((e) => e.id !== eventId)
    saveProject()
    history.recordHistory()
  }

  const toggleTestMode = (): void => {
    isTestMode.value = !isTestMode.value
    if (isTestMode.value) {
      playerPos.value = { ...spawnPos.value }
    }
  }

  const movePlayer = (dx: number, dy: number, mapWidth: number, mapHeight: number): void => {
    const newX = playerPos.value.x + dx
    const newY = playerPos.value.y + dy
    if (newX >= 0 && newX < mapWidth && newY >= 0 && newY < mapHeight) {
      playerPos.value = { x: newX, y: newY }
    }
  }

  return {
    addEvent,
    updateEvent,
    deleteEvent,
    toggleTestMode,
    movePlayer
  }
}
