import {
  type ZEvent,
  type ZEventPage,
  type ZEventCondition,
  type ZEventCommand,
  type ZCommandResult,
  ZEngineSignal,
  ZEventTrigger,
  type ZEventInterpreter,
  type ZSignalData,
  IEngineContext
} from '@engine/types'
import type { IPhysicsSystem, IObstacleProvider } from '@engine/interfaces/IPhysicsSystem'
import { ZEventBus } from '@engine/core/ZEventBus'
import { MapManager } from '@engine/managers/MapManager'
import { GameStateManager } from '@engine/managers/GameStateManager'

import { CommandRegistry } from './event-commands'
import { MovementProcessor, type ZMoveable } from '@engine/core/MovementProcessor'
import ZLogger from '@engine/utils/ZLogger'

/**
 * Runtime state for an event, tracking movement and visual properties logically.
 */
export interface ZEventRuntimeState extends ZMoveable {
  eventId: string
  realX: number
  realY: number
}

/**
 * Manages the execution of event command lists (interpreters).
 * Refactored for Manual Dependency Injection.
 */
export class EventSystem implements IObstacleProvider {
  // Dependencies
  private physicsSystem: IPhysicsSystem
  private gameState: GameStateManager
  private bus: ZEventBus
  private mapManager: MapManager

  private engine: IEngineContext | null = null

  private movementProcessor: MovementProcessor
  private tileSize: number = 48 // Default, updated in init()

  private playerPos: { x: number; y: number } = { x: 0, y: 0 }

  public isProcessing: boolean = false
  public isTransitioning: boolean = false
  private activeInterpreter: ZEventInterpreter | null = null
  private parallelInterpreters: ZEventInterpreter[] = []

  // Runtime state for all events on the map
  private eventStates: Map<string, ZEventRuntimeState> = new Map()

  // Cache associated with the current map's events
  private _activePageCache: Map<string, number> = new Map()

  constructor(
    physics: IPhysicsSystem,
    gameState: GameStateManager,
    bus: ZEventBus,
    mapManager: MapManager
  ) {
    this.physicsSystem = physics
    this.gameState = gameState
    this.bus = bus
    this.mapManager = mapManager

    this.movementProcessor = new MovementProcessor(this.physicsSystem)
  }

  /**
   * Called by ZEngine after constructor to set environment details.
   */
  public init(tileSize: number): void {
    this.tileSize = tileSize
  }

  public setEngineContext(engine: IEngineContext): void {
    this.engine = engine
  }

  /**
   * Initializes event listeners.
   */
  public onBoot(): void {
    this.physicsSystem.registerProvider(this)

    this.bus.on(ZEngineSignal.EventTriggered, ({ event }) => {
      this.startEvent(event)
    })

    this.bus.on(ZEngineSignal.MapWillLoad, () => {
      this._activePageCache.clear()
      this.eventStates.clear()
    })

    this.bus.on(ZEngineSignal.MapLoaded, () => {
      this.initializeEventStates()
    })

    this.bus.on(ZEngineSignal.InteractionRequested, ({ x, y }) => {
      const handled = this.checkTrigger(x, y, ZEventTrigger.Action, this.playerPos)
      if (handled) return

      this.checkTrigger(this.playerPos.x, this.playerPos.y, ZEventTrigger.Action, this.playerPos)
    })

    this.bus.on(ZEngineSignal.GameStateChanged, () => {
      this.refreshAllEvents()
    })

    this.bus.on(ZEngineSignal.PlayerMoved, ({ x, y }) => {
      this.playerPos = { x, y }
      this.checkTrigger(x, y, ZEventTrigger.PlayerTouch, { x, y })
    })

    this.bus.on(ZEngineSignal.MoveRouteFinished, ({ eventId }) => {
      if (this.activeInterpreter && this.activeInterpreter.waitingForMoveEventId === eventId) {
        this.activeInterpreter.waitingForMoveEventId = null
        this.isProcessing = true
        this.executeInterpreter()
      }
    })

    // Listen for internal state changes to update runtime state
    this.bus.on(ZEngineSignal.EventInternalStateChanged, this.onEventStateChanged.bind(this))
    this.bus.on(ZEngineSignal.EventExecutionStarted, ({ eventId, triggererPos }) => {
      this.onEventInteractionStarted(eventId, triggererPos)
    })
    this.bus.on(ZEngineSignal.EventExecutionFinished, ({ eventId }) => {
      this.onEventInteractionFinished(eventId)
    })

    this.bus.on(ZEngineSignal.SceneTransitionStarted, () => {
      this.isTransitioning = true
    })
    this.bus.on(ZEngineSignal.SceneTransitionFinished, () => {
      this.isTransitioning = false
    })
  }

  private initializeEventStates(): void {
    const map = this.mapManager.currentMap
    if (!map || !map.events) return

    // Clean existing (though MapWillLoad clears it)
    this.eventStates.clear()

    for (const event of map.events) {
      if (event.name === 'PlayerStart') continue

      const activePage = this.getActivePage(event)

      const state: ZEventRuntimeState = {
        id: event.id,
        eventId: event.id,
        x: event.x,
        y: event.y,
        realX: event.x * this.tileSize,
        realY: event.y * this.tileSize,
        direction: 'down',
        isMoving: false,
        targetX: event.x,
        targetY: event.y,
        moveSpeed: activePage?.moveSpeed || 3,
        moveFrequency: activePage?.moveFrequency || 3,
        moveRoute: activePage?.moveRoute || [],
        moveRouteIndex: (activePage?.moveRoute?.length || 0) > 0 ? 0 : -1,
        moveRouteRepeat: activePage?.moveRouteRepeat ?? true,
        moveRouteSkip: activePage?.moveRouteSkip ?? true,
        moveType: activePage?.moveType || 'fixed',
        isThrough: event.isThrough || (activePage?.options?.through ?? false),
        waitTimer: 0,
        walkAnim: activePage?.options?.walkAnim ?? true,
        stepAnim: activePage?.options?.stepAnim ?? false,
        directionFix: activePage?.options?.directionFix ?? false,
        transparent: false, // Default
        opacity: 255
      }

      this.eventStates.set(event.id, state)
    }
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
   * Main update loop for processing interpreters and movement.
   */
  public onUpdate(delta: number): void {
    // 1. Process Interpreters
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

    // 2. Process Event Movement
    this.updateEventMovements(delta)
  }

  private updateEventMovements(delta: number): void {
    const tileSize = this.mapManager.currentMap?.tileWidth || this.tileSize

    this.eventStates.forEach((state) => {
      // A. Process Logic (Command Selection)
      if (!state.isMoving) {
        const isCustomMove = state.moveType === 'custom'

        if (isCustomMove || (!this.isProcessing && !this.activeInterpreter)) {
          // Need Player Position for 'Approach' type
          const playerPos = this.playerPos
          this.movementProcessor.processNextCommand(state, playerPos, delta)

          const routeFinished = state.moveRouteIndex >= state.moveRoute.length
          if (
            routeFinished &&
            !state.isMoving &&
            state.waitTimer <= 0 &&
            !state.moveRouteRepeat &&
            state.moveRouteIndex !== -1
          ) {
            state.moveRouteIndex = -1
            this.bus.emit(ZEngineSignal.MoveRouteFinished, { eventId: state.id })
          }
        }
      }

      // B. Process Motion (Interpolation)
      if (state.isMoving) {
        const baseSpeed = Math.pow(2, state.moveSpeed - 4) * (tileSize / 32)
        const speed = baseSpeed * (delta / 16.66) // delta normalized to ~1 frame

        const tx = state.targetX ?? state.x
        const ty = state.targetY ?? state.y
        const targetRealX = tx * tileSize
        const targetRealY = ty * tileSize

        let arrived = false

        if (state.realX < targetRealX) state.realX = Math.min(state.realX + speed, targetRealX)
        else if (state.realX > targetRealX) state.realX = Math.max(state.realX - speed, targetRealX)

        if (state.realY < targetRealY) state.realY = Math.min(state.realY + speed, targetRealY)
        else if (state.realY > targetRealY) state.realY = Math.max(state.realY - speed, targetRealY)

        if (
          Math.abs(state.realX - targetRealX) < 0.1 &&
          Math.abs(state.realY - targetRealY) < 0.1
        ) {
          state.realX = targetRealX
          state.realY = targetRealY
          arrived = true
        }

        if (arrived) {
          state.isMoving = false
          state.x = tx
          state.y = ty

          // Sync back to ZEvent source of truth
          const event = this.mapManager.currentMap?.events.find((e) => e.id === state.id)
          if (event) {
            event.x = state.x
            event.y = state.y
          }
        }
      }
    })
  }

  public isOccupied(
    x: number,
    y: number,
    options?: { isThrough?: boolean; excludeId?: string }
  ): boolean {
    for (const state of this.eventStates.values()) {
      if (options?.excludeId && state.id === options.excludeId) continue
      if (state.isThrough) continue // Event itself is through

      if (state.x === x && state.y === y) return true
      // Also check target if moving (claimed)
      if (state.isMoving) {
        const tx = state.targetX ?? state.x
        const ty = state.targetY ?? state.y
        if (tx === x && ty === y) {
          return true
        }
      }
    }
    return false
  }

  public getEventState(eventId: string): ZEventRuntimeState | undefined {
    return this.eventStates.get(eventId)
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
    const map = this.mapManager.currentMap
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

  public finishMessage(): void {
    if (this.activeInterpreter) {
      this.activeInterpreter.isWaitingForMessage = false
    }
  }

  public refreshAllEvents(): void {
    const map = this.mapManager.currentMap
    if (!map) return

    map.events.forEach((event) => {
      this.refreshEvent(event)
    })
  }

  public refreshEvent(event: ZEvent): void {
    const lastPageIndex = this._activePageCache.get(event.id) ?? -1
    const newPage = this.getActivePage(event)

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

      this.checkParallelTriggers()
    }
  }

  private onEventStateChanged(data: ZSignalData[ZEngineSignal.EventInternalStateChanged]): void {
    const state = this.eventStates.get(data.eventId)
    if (!state) return

    if (data.direction) state.direction = data.direction
    if (data.moveRoute) {
      state.moveRoute = data.moveRoute
      state.moveRouteIndex = 0
    }
    if (data.moveType) state.moveType = data.moveType

    if (data.moveSpeed !== undefined) state.moveSpeed = data.moveSpeed
    if (data.moveFrequency !== undefined) state.moveFrequency = data.moveFrequency
    if (data.moveRouteRepeat !== undefined) state.moveRouteRepeat = data.moveRouteRepeat
    if (data.moveRouteSkip !== undefined) state.moveRouteSkip = data.moveRouteSkip

    if (data.walkAnim !== undefined) state.walkAnim = data.walkAnim
    if (data.stepAnim !== undefined) state.stepAnim = data.stepAnim
    if (data.directionFix !== undefined) state.directionFix = data.directionFix
    if (data.isThrough !== undefined) {
      state.isThrough = data.isThrough
      const mapEvent = this.mapManager.currentMap?.events.find((e) => e.id === data.eventId)
      if (mapEvent) mapEvent.isThrough = data.isThrough
    }
  }

  private preInteractionDirections: Map<string, 'down' | 'left' | 'right' | 'up'> = new Map()

  private onEventInteractionStarted(
    eventId: string,
    triggererPos?: { x: number; y: number }
  ): void {
    const state = this.eventStates.get(eventId)
    if (!state) return

    if (state.isMoving) {
      state.realX = state.targetX! * this.tileSize
      state.realY = state.targetY! * this.tileSize
      const tx = state.targetX ?? state.x
      const ty = state.targetY ?? state.y
      state.x = tx
      state.y = ty
      state.isMoving = false

      const mapEvent = this.mapManager.currentMap?.events.find((e) => e.id === eventId)
      if (mapEvent) {
        mapEvent.x = state.x
        mapEvent.y = state.y
      }
    }

    if (!triggererPos || state.directionFix) return

    if (!this.preInteractionDirections.has(eventId)) {
      this.preInteractionDirections.set(eventId, state.direction)
    }

    const dx = triggererPos.x - state.x
    const dy = triggererPos.y - state.y

    if (Math.abs(dx) > Math.abs(dy)) {
      state.direction = dx > 0 ? 'right' : 'left'
    } else if (dy !== 0 || dx !== 0) {
      state.direction = dy > 0 ? 'down' : 'up'
    }
  }

  private onEventInteractionFinished(eventId: string): void {
    const state = this.eventStates.get(eventId)
    if (!state) return

    if (this.isTransitioning) {
      this.preInteractionDirections.delete(eventId)
      return
    }

    const originalDir = this.preInteractionDirections.get(eventId)
    if (originalDir) {
      state.direction = originalDir
      this.preInteractionDirections.delete(eventId)
    }
  }

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
    const gameState = this.gameState

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

    return true
  }

  private checkPageConditionsWithEvent(conditions: ZEventCondition, eventId: string): boolean {
    if (!this.checkPageConditions(conditions)) return false

    if (conditions.selfSwitchCh) {
      const mapId = this.mapManager.currentMap?.id || 0
      const val = this.gameState.getSelfSwitch(mapId, eventId, conditions.selfSwitchCh)
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

  public checkTrigger(
    x: number,
    y: number,
    trigger: ZEventTrigger,
    triggererPos?: { x: number; y: number }
  ): boolean {
    if (this.isProcessing) return false

    const map = this.mapManager.currentMap
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
      if (!this.engine) {
        ZLogger.with(EventSystem.name).error('Engine context not set! Cannot execute commands.')
        return 'continue'
      }

      return processor(cmd.parameters, interpreter, this.engine)
    }

    return 'continue'
  }

  public submitChoice(index: number): void {
    if (this.activeInterpreter) {
      this.activeInterpreter.pendingChoice = index
    }
    this.resumeProcessing()
  }
}
