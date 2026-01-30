import { ZHistoryEntry, ZTileDelta, ZLayer } from '@engine/types'
import ZLogger from '@engine/core/ZLogger'
import { RenderSystem } from '../systems/RenderSystem'
import { ServiceLocator } from '../core/ServiceLocator'
import { ZManager } from './ZManager'

/**
 * Manages editor history using a delta-based approach.
 */
export class HistoryManager extends ZManager {
  private undoStack: ZHistoryEntry[] = []
  private redoStack: ZHistoryEntry[] = []
  private currentEntry: ZHistoryEntry | null = null
  private maxHistory: number = 50

  constructor(services: ServiceLocator, maxHistory: number = 50) {
    super(services)
    this.maxHistory = maxHistory
  }

  private get renderSystem(): RenderSystem | undefined {
    return this.services.get(RenderSystem)
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
    const provider = this.dataProvider
    if (!provider) return

    const stack = isUndo ? delta.oldStack : delta.newStack

    // 1. Update the Data Store
    if (stack && stack.length > 0) {
      provider.setTileAt(delta.x, delta.y, null, false, delta.layer)
      stack.forEach((tile) => {
        provider.setTileAt(delta.x, delta.y, tile, true, delta.layer)
      })
    } else {
      provider.setTileAt(delta.x, delta.y, null, false, delta.layer)
    }

    // 2. Trigger Engine Render Update
    // After store update, the reference in mapManager should be updated too.
    const map = this.map.currentMap
    if (map) {
      const newStack = map.layers[delta.layer].data[delta.y]?.[delta.x]
      if (newStack) {
        this.renderSystem?.requestTileUpdate(delta.x, delta.y, newStack, delta.layer)
      } else {
        this.renderSystem?.clearTileAt(delta.x, delta.y, delta.layer)
      }
      this.refreshNeighbors(delta.x, delta.y, delta.layer)
    }
  }

  private refreshNeighbors(tx: number, ty: number, layer: ZLayer): void {
    const map = this.map.currentMap
    if (!map) return

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = tx + dx
        const ny = ty + dy
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
          const stack = map.layers[layer].data[ny]?.[nx]
          if (stack && stack.length > 0) {
            this.renderSystem?.requestTileUpdate(nx, ny, stack, layer)
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
