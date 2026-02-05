import {
  ref,
  computed,
  type Ref,
  type ComputedRef,
  onMounted,
  onUnmounted,
  getCurrentInstance
} from 'vue'
import type { ZMap } from '@engine/types'

export const useHistory = (
  _activeMap: Ref<ZMap | undefined>,
  _activeMapID: Ref<number | null>,
  saveCallback: () => void
): {
  currentHistory: ComputedRef<{ stack: unknown[]; index: number } | null>
  historyIndex: ComputedRef<number>
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  undoCount: Ref<number>
  redoCount: Ref<number>
  recordHistory: () => void
  undo: () => void
  redo: () => void
} => {
  const canUndo = ref(false)
  const canRedo = ref(false)
  const undoCount = ref(0)
  const redoCount = ref(0)

  // We poll the status from the engine or could use an EventBus signal
  let timer: ReturnType<typeof setInterval> | null = null

  const syncStatus = (): void => {
    const history = window.$zEngine.history
    if (history) {
      canUndo.value = history.canUndo
      canRedo.value = history.canRedo
      undoCount.value = history.undoCount
      redoCount.value = history.redoCount
    }
  }

  const startPolling = (): void => {
    timer = setInterval(syncStatus, 200)
  }

  const stopPolling = (): void => {
    if (timer) clearInterval(timer)
  }

  if (getCurrentInstance()) {
    onMounted(startPolling)
    onUnmounted(stopPolling)
  } else {
    // If used outside a component (e.g., inside a Pinia store initialized by Router),
    // start polling immediately. We assume the store lives for the app's lifetime.
    startPolling()
  }

  const undo = (): void => {
    const history = window.$zEngine.history
    if (history) {
      history.undo()
      saveCallback()
      syncStatus()
    }
  }

  const redo = (): void => {
    const history = window.$zEngine.history
    if (history) {
      history.redo()
      saveCallback()
      syncStatus()
    }
  }

  // Engine's ToolManager handles recordHistory (beginEntry/commitEntry) automatically.
  // This remains for manual/UI triggered snapshots if needed, but mostly it's a no-op or
  // can be used to commit currently open entry.
  const recordHistory = (): void => {
    const history = window.$zEngine.history
    if (history) {
      history.commitEntry()
      syncStatus()
    }
  }

  return {
    currentHistory: computed(() => null), // No longer using snapshots
    historyIndex: computed(() => -1),
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    recordHistory,
    undo,
    redo
  }
}
