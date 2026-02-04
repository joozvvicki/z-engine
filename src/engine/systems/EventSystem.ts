import {
  type ZEvent,
  type ZEventPage,
  type ZEventCondition,
  type ZEventCommand,
  type ZCommandResult,
  ZEngineSignal,
  ZEventTrigger,
  type ZEventInterpreter
} from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { CommandRegistry } from './event-commands'

/**
 * Manages the execution of event command lists (interpreters).
 * Now refactored to use a decoupled CommandRegistry.
 */
export class EventSystem extends ZSystem {
  private playerSystem: PlayerSystem

  public isProcessing: boolean = false
  private activeInterpreter: ZEventInterpreter | null = null
  private parallelInterpreters: ZEventInterpreter[] = []

  constructor(services: ServiceLocator) {
    super(services)
    this.updateMode = SystemMode.PLAY

    this.playerSystem = undefined as unknown as PlayerSystem
  }

  /**
   * Initializes systems and event listeners.
   */
  public onBoot(): void {
    this.playerSystem = this.services.require(PlayerSystem)

    this.bus.on(ZEngineSignal.EventTriggered, ({ event }) => {
      this.startEvent(event)
    })

    this.bus.on(ZEngineSignal.MapWillLoad, () => {
      this._activePageCache.clear()
    })

    this.bus.on(ZEngineSignal.InteractionRequested, ({ x, y }) => {
      const playerPos = this.playerSystem
        ? { x: this.playerSystem.x, y: this.playerSystem.y }
        : undefined
      const handled = this.checkTrigger(x, y, ZEventTrigger.Action, playerPos)
      if (handled) return

      if (this.playerSystem) {
        this.checkTrigger(this.playerSystem.x, this.playerSystem.y, ZEventTrigger.Action, playerPos)
      }
    })

    this.bus.on(ZEngineSignal.GameStateChanged, () => {
      this.refreshAllEvents()
    })

    this.bus.on(ZEngineSignal.PlayerMoved, ({ x, y }) => {
      this.checkTrigger(x, y, ZEventTrigger.PlayerTouch, { x, y })
    })

    this.bus.on(ZEngineSignal.MoveRouteFinished, ({ eventId }) => {
      if (this.activeInterpreter && this.activeInterpreter.waitingForMoveEventId === eventId) {
        this.activeInterpreter.waitingForMoveEventId = null
        this.isProcessing = true
        this.executeInterpreter()
      }
    })
  }

  /**
   * Resumes a paused interpreter.
   */
  public resumeProcessing(): void {
    if (!this.activeInterpreter) return
    this.isProcessing = true
    this.executeInterpreter()
  }

  /**
   * Main update loop for processing interpreters.
   */
  public onUpdate(): void {
    if (this.activeInterpreter) {
      if (this.activeInterpreter.waitCount && this.activeInterpreter.waitCount > 0) {
        this.activeInterpreter.waitCount--
      } else if (
        !this.activeInterpreter.waitingForMoveEventId &&
        !this.activeInterpreter.isWaitingForMessage
      ) {
        this.executeInterpreter()
      }
    }
    this.updateParallelProcesses()
  }

  private updateParallelProcesses(): void {
    if (this.parallelInterpreters.length === 0) {
      this.checkParallelTriggers()
    }

    for (let i = this.parallelInterpreters.length - 1; i >= 0; i--) {
      const interpreter = this.parallelInterpreters[i]
      if (interpreter.waitCount && interpreter.waitCount > 0) {
        interpreter.waitCount--
        continue
      }
      this.executeParallelInterpreter(interpreter, i)
    }
  }

  private checkParallelTriggers(): void {
    const map = this.map.currentMap
    if (!map) return

    map.events.forEach((event) => {
      const page = this.getActivePage(event)
      if (page && page.trigger === ZEventTrigger.Parallel) {
        if (!this.parallelInterpreters.find((p) => p.eventId === event.id)) {
          this.parallelInterpreters.push({
            list: page.list,
            index: 0,
            eventId: event.id
          })
        }
      }
    })
  }

  /**
   * Clears the message wait flag on the active interpreter.
   */
  public finishMessage(): void {
    if (this.activeInterpreter) {
      this.activeInterpreter.isWaitingForMessage = false
    }
  }

  // Cache associated with the current map's events
  private _activePageCache: Map<string, number> = new Map()

  public refreshAllEvents(): void {
    const map = this.map.currentMap
    if (!map) return

    map.events.forEach((event) => {
      this.refreshEvent(event)
    })
  }

  public refreshEvent(event: ZEvent): void {
    const lastPageIndex = this._activePageCache.get(event.id) ?? -1
    const newPage = this.getActivePage(event)

    // Determine new page index
    let newPageIndex = -1
    if (newPage) {
      newPageIndex = event.pages.indexOf(newPage)
    }

    if (newPageIndex !== lastPageIndex) {
      this._activePageCache.set(event.id, newPageIndex)

      this.bus.emit(ZEngineSignal.EventInternalStateChanged, {
        eventId: event.id,
        graphic: newPage?.graphic ?? null,
        moveSpeed: newPage?.moveSpeed,
        moveFrequency: newPage?.moveFrequency,
        moveType: newPage?.moveType,
        moveRoute: newPage?.moveRoute,
        moveRouteRepeat: newPage?.moveRouteRepeat,
        moveRouteSkip: newPage?.moveRouteSkip,
        isThrough: newPage?.options?.through ?? false,
        walkAnim: newPage?.options?.walkAnim ?? true,
        stepAnim: newPage?.options?.stepAnim ?? false,
        directionFix: newPage?.options?.directionFix ?? false
      })

      // If switching to a page with Parallel trigger, ensure it gets picked up
      this.checkParallelTriggers()
    }
  }

  /**
   * Starts a new event interpreter.
   */
  public startEvent(event: ZEvent, triggererPos?: { x: number; y: number }): void {
    const activePage = this.getActivePage(event)
    if (!activePage) return

    if (activePage.list && activePage.list.length > 0) {
      this.activeInterpreter = {
        list: activePage.list,
        index: 0,
        eventId: event.id
      }
      this.isProcessing = true
      this.bus.emit(ZEngineSignal.EventExecutionStarted, {
        eventId: event.id,
        triggererPos
      })
    }
  }

  private checkPageConditions(conditions: ZEventCondition): boolean {
    const gameState = this.game

    if (conditions.switch1Id) {
      const val = gameState.getSwitch(Number(conditions.switch1Id))
      if (!val) return false
    }

    if (conditions.switch2Id) {
      const val = gameState.getSwitch(Number(conditions.switch2Id))
      if (!val) return false
    }

    if (conditions.variableId && conditions.variableValue !== undefined) {
      const val = gameState.getVariable(Number(conditions.variableId))
      if (val < conditions.variableValue) return false
    }

    // TODO: Implement inventory and actor condition checks

    return true
  }

  private checkPageConditionsWithEvent(conditions: ZEventCondition, eventId: string): boolean {
    if (!this.checkPageConditions(conditions)) return false

    if (conditions.selfSwitchCh) {
      const mapId = this.map.currentMap?.id || 0
      const val = this.game.getSelfSwitch(mapId, eventId, conditions.selfSwitchCh)
      if (!val) return false
    }

    return true
  }

  public getActivePage(event: ZEvent): ZEventPage | null {
    for (let i = event.pages.length - 1; i >= 0; i--) {
      const page = event.pages[i]
      if (this.checkPageConditionsWithEvent(page.conditions, event.id)) {
        event.isThrough = page.options.through
        return page
      }
    }
    event.isThrough = false
    return null
  }

  /**
   * Checks for event triggers at the specified coordinates.
   */
  public checkTrigger(
    x: number,
    y: number,
    trigger: ZEventTrigger,
    triggererPos?: { x: number; y: number }
  ): boolean {
    if (this.isProcessing) return false

    const map = this.map.currentMap
    if (!map) return false

    const event = map.events.find((e) => e.x === x && e.y === y)
    if (!event) return false

    const activePage = this.getActivePage(event)
    if (activePage && activePage.trigger === trigger) {
      this.startEvent(event, triggererPos)
      return true
    }
    return false
  }

  private executeInterpreter(): void {
    if (!this.activeInterpreter) return

    while (this.activeInterpreter.index < this.activeInterpreter.list.length) {
      if (this.activeInterpreter.waitCount && this.activeInterpreter.waitCount > 0) {
        return
      }

      const cmd = this.activeInterpreter.list[this.activeInterpreter.index]
      this.activeInterpreter.index++

      const result = this.executeCommand(cmd, this.activeInterpreter)
      if (result === 'wait') return
      if (result === 'stop') {
        this.terminateActiveInterpreter()
        return
      }
    }

    this.terminateActiveInterpreter()
  }

  private terminateActiveInterpreter(): void {
    if (!this.activeInterpreter) return
    const eventId = this.activeInterpreter.eventId
    this.activeInterpreter = null
    this.isProcessing = false
    this.bus.emit(ZEngineSignal.EventExecutionFinished, { eventId })
  }

  private executeParallelInterpreter(interpreter: ZEventInterpreter, index: number): void {
    while (interpreter.index < interpreter.list.length) {
      const cmd = interpreter.list[interpreter.index]
      interpreter.index++

      const result = this.executeCommand(cmd, interpreter)
      if (result === 'wait') return
      if (result === 'stop') {
        this.parallelInterpreters.splice(index, 1)
        return
      }
    }
    // Loop parallel process
    interpreter.index = 0
  }

  private executeCommand(cmd: ZEventCommand, interpreter: ZEventInterpreter): ZCommandResult {
    const processor = CommandRegistry[cmd.code]
    if (processor) {
      return processor(cmd.parameters, interpreter, this.services)
    }

    return 'continue'
  }

  /**
   * Submits a choice result to the active interpreter.
   */
  public submitChoice(index: number): void {
    if (this.activeInterpreter) {
      this.activeInterpreter.pendingChoice = index
    }
    this.resumeProcessing()
  }
}
