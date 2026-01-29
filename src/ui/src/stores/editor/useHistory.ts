import { ref, computed, type Ref, type ComputedRef, onMounted, onUnmounted } from 'vue'
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
    const engine = window.$zEngine
    if (engine?.historyManager) {
      canUndo.value = engine.historyManager.canUndo
      canRedo.value = engine.historyManager.canRedo
      undoCount.value = engine.historyManager.undoCount
      redoCount.value = engine.historyManager.redoCount
    }
  }

  onMounted(() => {
    timer = setInterval(syncStatus, 200)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  const undo = (): void => {
    const engine = window.$zEngine
    if (engine?.historyManager) {
      engine.historyManager.undo()
      saveCallback()
      syncStatus()
    }
  }

  const redo = (): void => {
    const engine = window.$zEngine
    if (engine?.historyManager) {
      engine.historyManager.redo()
      saveCallback()
      syncStatus()
    }
  }

  // Engine's ToolManager handles recordHistory (beginEntry/commitEntry) automatically.
  // This remains for manual/UI triggered snapshots if needed, but mostly it's a no-op or
  // can be used to commit currently open entry.
  const recordHistory = (): void => {
    const engine = window.$zEngine
    if (engine?.historyManager) {
      engine.historyManager.commitEntry()
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
