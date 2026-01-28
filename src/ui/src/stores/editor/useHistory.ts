import { ref, computed, type Ref, watch, nextTick, type ComputedRef } from 'vue'
import type { ZMap } from '@engine/types'

const MAX_HISTORY = 50

export const useHistory = (
  activeMap: Ref<ZMap | undefined>,
  activeMapID: Ref<number | null>,
  saveCallback: () => void
): {
  currentHistory: ComputedRef<{ stack: string[]; index: number } | null>
  historyIndex: ComputedRef<number>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  recordHistory: () => void
  undo: () => void
  redo: () => void
} => {
  // Historia per Mapa (ID mapy -> { stack, index })
  const historyMap = ref<Record<number, { stack: string[]; index: number }>>({})

  const currentHistory = computed(() => {
    if (!activeMapID.value) return null
    if (!historyMap.value[activeMapID.value]) {
      historyMap.value[activeMapID.value] = { stack: [], index: 0 }
    }
    return historyMap.value[activeMapID.value]
  })

  const historyIndex = computed(() => currentHistory.value?.index ?? -1)
  const canUndo = computed(() => (currentHistory.value?.index ?? -1) > 0)
  const canRedo = computed(
    () =>
      (currentHistory.value?.index ?? -1) < (currentHistory.value?.stack.length ?? 0) - 1 ||
      (currentHistory.value?.index ?? -1) < (currentHistory.value?.stack.length ?? 0)
  )

  // Pomocnicza funkcja przywracania stanu
  const restoreStateFromSnapshot = (map: ZMap, snapshot: string): void => {
    const data = JSON.parse(snapshot)
    map.layers = data.layers
    map.events = data.events
    map.width = data.width
    map.height = data.height
  }

  const recordHistory = (): void => {
    const map = activeMap.value
    const hist = currentHistory.value
    if (!map || !hist) return

    const snapshot = JSON.stringify({
      layers: map.layers,
      events: map.events,
      width: map.width,
      height: map.height
    })

    // Unikamy duplikatów
    if (hist.index >= 0 && hist.stack[hist.index] === snapshot) return

    // Ucinamy "przyszłość"
    if (hist.index < hist.stack.length - 1) {
      hist.stack = hist.stack.slice(0, hist.index + 1)
    }

    hist.stack.push(snapshot)

    if (hist.stack.length > MAX_HISTORY) {
      hist.stack.shift()
    }

    hist.index = hist.stack.length - 1
  }

  const undo = (): void => {
    const hist = currentHistory.value
    const map = activeMap.value
    if (!hist || !map) return

    const currentSnapshot = JSON.stringify({
      layers: map.layers,
      events: map.events,
      width: map.width,
      height: map.height
    })

    if (hist.index >= 0 && hist.stack[hist.index] !== currentSnapshot) {
      recordHistory()
    }

    if (hist.index <= 0) return

    hist.index--
    restoreStateFromSnapshot(map, hist.stack[hist.index])
    saveCallback()
  }

  const redo = (): void => {
    const hist = currentHistory.value
    const map = activeMap.value
    if (!hist || !map || hist.index >= hist.stack.length - 1) return

    hist.index++
    restoreStateFromSnapshot(map, hist.stack[hist.index])
    saveCallback()
  }

  // Auto-init historii przy zmianie mapy
  watch(
    activeMapID,
    () => {
      nextTick(() => {
        const hist = currentHistory.value
        if (hist && hist.stack.length === 0) {
          recordHistory()
        }
      })
    },
    { immediate: true }
  )

  return {
    currentHistory,
    historyIndex,
    canUndo,
    canRedo,
    recordHistory,
    undo,
    redo
  }
}
