import { ZSystem, type ZEvent, type ZEventCommand, ZCommandCode } from '@engine/types'
import { MapManager } from '@engine/managers/MapManager'
import { PlayerSystem } from './PlayerSystem'
import type { ZEngine } from '../core/ZEngine'

export class EventSystem extends ZSystem {
  // @ts-ignore - mapManager is used in trigger logic (WIP)
  private mapManager: MapManager
  // @ts-ignore - playerSystem is used for positioning (WIP)
  private playerSystem: PlayerSystem
  private engine: ZEngine

  // Runtime state
  // @ts-ignore - isProcessing tracks interpreter status
  private isProcessing: boolean = false
  private activeInterpreter: {
    list: ZEventCommand[]
    index: number
    eventId: string
  } | null = null

  constructor(engine: ZEngine, mapManager: MapManager, playerSystem: PlayerSystem) {
    super()
    this.engine = engine
    this.mapManager = mapManager
    this.playerSystem = playerSystem
  }

  public onUpdate(): void {
    if (this.activeInterpreter) {
      this.executeInterpreter()
    }
  }

  public startEvent(event: ZEvent): void {
    // Determine active page
    // For now, always take the last page (highest priority)
    if (event.pages.length === 0) return
    const page = event.pages[event.pages.length - 1] // TODO: Real condition check

    if (page.list && page.list.length > 0) {
      this.activeInterpreter = {
        list: page.list,
        index: 0,
        eventId: event.id
      }
      this.activeInterpreter = {
        list: page.list,
        index: 0,
        eventId: event.id
      }
      this.isProcessing = true
      console.log(`[EventSystem] Started event ${event.id} with ${page.list.length} commands`)
    } else {
      console.warn(`[EventSystem] Event ${event.id} has no commands on active page`)
    }
  }

  private executeInterpreter(): void {
    if (!this.activeInterpreter) return

    // Execute commands until one yields (wait) or list ends
    while (this.activeInterpreter.index < this.activeInterpreter.list.length) {
      const cmd = this.activeInterpreter.list[this.activeInterpreter.index]
      this.activeInterpreter.index++

      console.log(`[EventSystem] Executing command ${cmd.code}`)

      const result = this.executeCommand(cmd)
      if (result === 'wait') {
        return // Stop processing this frame
      }
    }

    // End of list
    this.activeInterpreter = null
    this.isProcessing = false
    console.log(`[EventSystem] Event finished`)
  }

  private executeCommand(cmd: ZEventCommand): 'continue' | 'wait' {
    switch (cmd.code) {
      case ZCommandCode.TransferPlayer:
        return this.commandTransferPlayer(cmd.parameters)
      default:
        // Unknown command, skip
        return 'continue'
    }
  }

  // Command 201: Transfer Player
  // Params: [mapId, x, y, direction?, fadeType?]
  private commandTransferPlayer(params: unknown[]): 'wait' {
    const mapId = params[0] as number
    const x = params[1] as number
    const y = params[2] as number
    // const direction = params[3]

    // Orchestrate transfer via ZEngine (handles fades and store sync)
    this.engine.transferPlayer(mapId, x, y)

    // Stop processing current event (it will be destroyed on map switch)
    this.activeInterpreter = null
    this.isProcessing = false

    return 'wait'
  }
}
