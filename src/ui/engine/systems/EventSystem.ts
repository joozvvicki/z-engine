import {
  ZSystem,
  type ZEvent,
  type ZEventPage,
  type ZEventCondition,
  type ZEventCommand,
  ZCommandCode,
  ZEngineSignal,
  ZEventTrigger,
  type ZCommandResult,
  type ZCommandProcessor
} from '@engine/types'
import { MapManager } from '@engine/managers/MapManager'
import { PlayerSystem } from './PlayerSystem'
import type { ZEngine } from '../core/ZEngine'
import { ZEventBus } from '../core/ZEventBus'

export class EventSystem extends ZSystem {
  // @ts-ignore - mapManager is used in trigger logic (WIP)
  private mapManager: MapManager
  // @ts-ignore - playerSystem is used for positioning (WIP)
  private playerSystem: PlayerSystem
  private engine: ZEngine
  private eventBus: ZEventBus

  // Runtime state
  // @ts-ignore - isProcessing tracks interpreter status
  private isProcessing: boolean = false
  private activeInterpreter: {
    list: ZEventCommand[]
    index: number
    eventId: string
  } | null = null

  // Command Processor Registry
  private processors: Map<number, ZCommandProcessor> = new Map()

  constructor(
    engine: ZEngine,
    mapManager: MapManager,
    playerSystem: PlayerSystem,
    eventBus: ZEventBus
  ) {
    super()
    this.engine = engine
    this.mapManager = mapManager
    this.playerSystem = playerSystem
    this.eventBus = eventBus

    this.registerCommands()
  }

  private registerCommands(): void {
    this.processors.set(ZCommandCode.TransferPlayer, this.commandTransferPlayer.bind(this))
    this.processors.set(ZCommandCode.ShowMessage, this.commandShowMessage.bind(this))
  }

  public onBoot(): void {
    this.eventBus.on(ZEngineSignal.EventTriggered, ({ event }) => {
      this.startEvent(event)
    })

    this.eventBus.on(ZEngineSignal.InteractionRequested, ({ x, y }) => {
      this.checkTrigger(x, y, ZEventTrigger.Action)
    })

    this.eventBus.on(ZEngineSignal.PlayerMoved, ({ x, y }) => {
      this.checkTrigger(x, y, ZEventTrigger.PlayerTouch)
    })
  }

  public onUpdate(): void {
    if (this.activeInterpreter && !this.isWaitingForMessage) {
      this.executeInterpreter()
    }
  }

  private isWaitingForMessage: boolean = false

  public finishMessage(): void {
    this.isWaitingForMessage = false
  }

  public startEvent(event: ZEvent): void {
    // Determine active page
    // For now, always take the first page that matches conditions
    // (Logic: higher index pages have higher priority)
    let activePage: ZEventPage | null = null
    for (let i = event.pages.length - 1; i >= 0; i--) {
      const page = event.pages[i]
      if (this.checkPageConditions(page.conditions)) {
        activePage = page
        break
      }
    }

    if (!activePage) return

    if (activePage.list && activePage.list.length > 0) {
      this.activeInterpreter = {
        list: activePage.list,
        index: 0,
        eventId: event.id
      }
      this.isProcessing = true
      console.log(`[EventSystem] Started event ${event.id} with ${activePage.list.length} commands`)
    } else {
      console.warn(`[EventSystem] Event ${event.id} has no commands on active page`)
    }
  }

  private checkPageConditions(_conditions: ZEventCondition): boolean {
    // TODO: Implement Switches/Variables check
    return true
  }

  public checkTrigger(x: number, y: number, trigger: ZEventTrigger): void {
    if (this.isProcessing) return // Don't interrupt

    const map = this.mapManager.currentMap
    if (!map) return

    const event = map.events.find((e) => e.x === x && e.y === y)
    if (!event) return

    // Find active page
    let activePage: ZEventPage | null = null
    for (let i = event.pages.length - 1; i >= 0; i--) {
      const page = event.pages[i]
      if (this.checkPageConditions(page.conditions)) {
        activePage = page
        break
      }
    }

    if (activePage && activePage.trigger === trigger) {
      this.startEvent(event)
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
      if (result === 'stop') {
        this.activeInterpreter = null
        this.isProcessing = false
        return
      }
    }

    // End of list
    this.activeInterpreter = null
    this.isProcessing = false
    console.log(`[EventSystem] Event finished`)
  }

  private executeCommand(cmd: ZEventCommand): ZCommandResult {
    const processor = this.processors.get(cmd.code)
    if (processor) {
      return processor(cmd.parameters)
    }

    // Unknown command, skip
    console.warn(`[EventSystem] Unknown command code: ${cmd.code}`)
    return 'continue'
  }

  // Command 201: Transfer Player
  // Params: [mapId, x, y, direction?, fadeType?]
  private commandTransferPlayer(params: unknown[]): ZCommandResult {
    const mapId = params[0] as number
    const x = params[1] as number
    const y = params[2] as number
    // const direction = params[3]

    // Orchestrate transfer via ZEngine (handles fades and store sync)
    this.engine.transferPlayer(mapId, x, y)

    return 'stop' // Stop processing current event (it will be destroyed on map switch)
  }

  // Command 101: Show Message
  // Params: [text, faceName?, faceIndex?]
  private commandShowMessage(params: unknown[]): ZCommandResult {
    const text = params[0] as string

    this.isWaitingForMessage = true

    // Emit signal for UI to show message
    this.eventBus.emit(ZEngineSignal.ShowMessage, { text })

    return 'wait'
  }
}
