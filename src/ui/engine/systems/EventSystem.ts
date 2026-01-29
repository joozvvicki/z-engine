import { ZSystem, type ZEvent, type ZEventCommand, ZCommandCode } from '@engine/types'
import { MapManager } from '@engine/managers/MapManager'
import { PlayerSystem } from './PlayerSystem'

export class EventSystem extends ZSystem {
  // @ts-ignore
  private mapManager: MapManager
  // @ts-ignore
  private playerSystem: PlayerSystem

  // Runtime state
  // @ts-ignore
  private isProcessing: boolean = false
  private activeInterpreter: {
    list: ZEventCommand[]
    index: number
    eventId: string
  } | null = null

  constructor(mapManager: MapManager, playerSystem: PlayerSystem) {
    super()
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

    console.log(`[EventSystem] Transfer to Map ${mapId} @ ${x},${y}`)

    // Load new map
    // We assume MapManager.loadMap is async or handles switching?
    // MapManager currently just holds the map data.
    // We need to trigger a global Map Load.
    // Since we don't have a full wrapper, we might need to modify Store?
    // Or MapManager should have a 'loadMapById' if it had access to a DB.
    // Currently, Stores hold the maps. MapManager just receives the active ZMap.

    // Workaround: Call into global store via window or event bus?
    // Or more cleanly, EventSystem emits an event that GameViewport listens to?
    // For now, let's use the window.$zEngine hack or window.dispatchEvent?

    window.dispatchEvent(
      new CustomEvent('z-transfer-player', {
        detail: { mapId, x, y }
      })
    )

    // Stop processing current event (it will be destroyed on map switch)
    this.activeInterpreter = null
    this.isProcessing = false

    return 'wait'
  }
}
