import { ZHistoryEntry, ZTileDelta, ZLayer, ZDataProvider } from '@engine/types'
import ZLogger from '@engine/utils/ZLogger'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { MapManager } from '@engine/managers/MapManager'

/**
 * Manages editor history using a delta-based approach.
 * Refactored for Manual Dependency Injection.
 */
export class HistoryManager {
  private undoStack: ZHistoryEntry[] = []
  private redoStack: ZHistoryEntry[] = []
  private currentEntry: ZHistoryEntry | null = null
  private maxHistory: number = 50

  // Dependencies
  private mapManager: MapManager
  private renderSystem: RenderSystem | null = null
  private dataProvider: ZDataProvider | null = null

  constructor(mapManager: MapManager, maxHistory: number = 50) {
    this.mapManager = mapManager
    this.maxHistory = maxHistory
  }

  /**
   * Links the DataProvider (called by ZEngine).
   */
  public setDataProvider(provider: ZDataProvider): void {
    this.dataProvider = provider
  }

  /**
   * Links the RenderSystem (called by ZEngine.init).
   * Needed because RenderSystem is created after HistoryManager.
   */
  public registerRenderer(renderSystem: RenderSystem): void {
    this.renderSystem = renderSystem
  }

  /**
   * Starts grouping multiple changes into a single history entry.
   */
  public beginEntry(label: string): void {
    if (this.currentEntry) {
      this.commitEntry()
    }
    this.currentEntry = {
      id: Math.random().toString(36).substring(7),
      label,
      deltas: []
    }
  }

  /**
   * Records a single tile change in the active entry.
   */
  public addDelta(delta: ZTileDelta): void {
    if (!this.currentEntry) {
      ZLogger.with('HistoryManager').warn(
        'Attempted to add delta without an active entry. Starting default entry.'
      )
      this.beginEntry('Manual Change')
    }
    this.currentEntry!.deltas.push(delta)
  }

  /**
   * Finishes grouping and pushes the entry to the undo stack.
   */
  public commitEntry(): void {
    if (!this.currentEntry) return
    if (this.currentEntry.deltas.length === 0) {
      this.currentEntry = null
      return
    }

    this.undoStack.push(this.currentEntry)
    this.redoStack = [] // Clear redo on new action

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift()
    }

    ZLogger.with('HistoryManager').info(
      `Committed entry: ${this.currentEntry.label} (${this.currentEntry.deltas.length} deltas)`
    )
    this.currentEntry = null
  }

  public undo(): void {
    const entry = this.undoStack.pop()
    if (!entry) return

    ZLogger.with('HistoryManager').info(`Undoing: ${entry.label}`)

    // Apply deltas in REVERSE order
    for (let i = entry.deltas.length - 1; i >= 0; i--) {
      const d = entry.deltas[i]
      this.applyDelta(d, true)
    }

    this.redoStack.push(entry)
  }

  public redo(): void {
    const entry = this.redoStack.pop()
    if (!entry) return

    ZLogger.with('HistoryManager').info(`Redoing: ${entry.label}`)

    // Apply deltas in ORIGINAL order
    for (const d of entry.deltas) {
      this.applyDelta(d, false)
    }

    this.undoStack.push(entry)
  }

  private applyDelta(delta: ZTileDelta, isUndo: boolean): void {
    if (!this.dataProvider) {
      ZLogger.with('HistoryManager').warn('Cannot apply delta: No DataProvider set')
      return
    }

    const stack = isUndo ? delta.oldStack : delta.newStack

    // 1. Update the Data Store
    if (stack && stack.length > 0) {
      this.dataProvider.setTileAt(delta.x, delta.y, null, false, delta.layer)
      stack.forEach((tile) => {
        this.dataProvider!.setTileAt(delta.x, delta.y, tile, true, delta.layer)
      })
    } else {
      this.dataProvider.setTileAt(delta.x, delta.y, null, false, delta.layer)
    }

    // 2. Trigger Engine Render Update
    const map = this.mapManager.currentMap
    if (map) {
      const newStack = map.layers[delta.layer].data[delta.y]?.[delta.x]

      // Use locally registered render system
      if (this.renderSystem) {
        if (newStack) {
          this.renderSystem.requestTileUpdate(delta.x, delta.y, newStack, delta.layer)
        } else {
          this.renderSystem.clearTileAt(delta.x, delta.y, delta.layer)
        }
      }

      this.refreshNeighbors(delta.x, delta.y, delta.layer)
    }
  }

  private refreshNeighbors(tx: number, ty: number, layer: ZLayer): void {
    const map = this.mapManager.currentMap
    if (!map || !this.renderSystem) return

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = tx + dx
        const ny = ty + dy
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          const stack = map.layers[layer].data[ny]?.[nx]
          if (stack && stack.length > 0) {
            this.renderSystem.requestTileUpdate(nx, ny, stack, layer)
          }
        }
      }
    }
  }

  public get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  public get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  public get undoCount(): number {
    return this.undoStack.length
  }

  public get redoCount(): number {
    return this.redoStack.length
  }

  public clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.currentEntry = null
  }
}
