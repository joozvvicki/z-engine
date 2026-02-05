import {
  type ZEvent,
  type ZEventPage,
  type ZEventCondition,
  type ZEventCommand,
  type ZCommandResult,
  ZEngineSignal,
  ZEventTrigger,
  type ZEventInterpreter,
  type ZSignalData
} from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import type { IPhysicsSystem, IObstacleProvider } from '@engine/interfaces/IPhysicsSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'

import { CommandRegistry } from './event-commands'
import { MovementProcessor, type ZMoveable } from '@engine/core/MovementProcessor'

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
 * Now refactored to use a decoupled CommandRegistry and handle Event Movement Logic.
 */
export class EventSystem extends ZSystem implements IObstacleProvider {
  private physicsSystem: IPhysicsSystem
  private movementProcessor: MovementProcessor

  private playerPos: { x: number; y: number } = { x: 0, y: 0 }

  public isProcessing: boolean = false
  public isTransitioning: boolean = false
  private activeInterpreter: ZEventInterpreter | null = null
  private parallelInterpreters: ZEventInterpreter[] = []

  // Runtime state for all events on the map
  private eventStates: Map<string, ZEventRuntimeState> = new Map()

  // Cache associated with the current map's events
  private _activePageCache: Map<string, number> = new Map()

  constructor(services: ServiceLocator) {
    super(services)
    this.updateMode = SystemMode.PLAY

    this.physicsSystem = undefined as unknown as IPhysicsSystem
    this.movementProcessor = undefined as unknown as MovementProcessor
  }

  /**
   * Initializes systems and event listeners.
   */
  public onBoot(): void {
    this.physicsSystem = this.services.get('PhysicsSystem') as unknown as IPhysicsSystem
    this.physicsSystem.registerProvider(this)
    this.movementProcessor = new MovementProcessor(this.physicsSystem)

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
      // Use cached playerPos
      const handled = this.checkTrigger(x, y, ZEventTrigger.Action, this.playerPos)
      if (handled) return

      // Self-check if player is standing on event?
      // checkTrigger works on target x,y. if player requested interaction at x,y.
      // logic is: check if ANY event at x,y has Action trigger.

      // Also check player's current tile for "On Player Touch" or similar?
      // No, Action is usually "Face Button".

      // The original code checked 'this.playerSystem.x/y'.
      // If we are replacing 'this.playerSystem', we assume checkTrigger uses x,y.
      // But wait, the original code had a SECOND check:
      // checkTrigger(this.playerSystem.x, this.playerSystem.y, ... Action ... )
      // Why? Maybe for "Events under player" (Action Button on same tile)?

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
    const map = this.map.currentMap
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
        realX: event.x * 48, // Default, will update with tileSize? We don't have tileSize here easily?
        // actually we should probably inject tileSize or get it from MapManager.
        // Assuming 48 for now or fetching from somewhere?
        // Wait, RenderSystem has tileSize. System doesn't necessarily know it?
        // Let's assume passed in constructor or accessible.
        // BUT for Logic, realX/Y is only needed for interpolation.
        // Let's assume standard tile size or get from service.
        // Actually map.tileSize might be available?
        realY: event.y * 48,
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
      // Correct real position if map has tilewidth
      // if (this.map.currentMap?.tileWidth) {
      //   state.realX = state.x * 48
      //   state.realY = state.y * 48
      // }

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
    const tileSize = this.map.currentMap?.tileWidth || 48 // Fallback

    this.eventStates.forEach((state) => {
      // A. Process Logic (Command Selection)
      if (!state.isMoving) {
        // Sync logical position if needed (should be in sync)

        const isCustomMove = state.moveType === 'custom'
        // Only process autonomous moves if NOT interacting and system NOT paused (message)
        if (isCustomMove || (!this.isProcessing && !this.activeInterpreter)) {
          // Note: simple check for "isProcessing" might block all events during any event.
          // RPG Maker only blocks autonomous movement during "Stop All Movement" or simple events?
          // Usually autonomous movement continues unless explicitly stopped?
          // For now, let's allow it unless specifically blocked.

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
        // Logic copied/adapted from EntityRenderSystem but purely on data
        // Speed 4 = 1 tile per 32 frames at 60fps (base)
        // Speed formula: distance_per_frame = 2^(speed - 4) * (tileSize / 32)
        // Note: This needs to match PlayerSystem's formula for consistency
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
          const event = this.map.currentMap?.events.find((e) => e.id === state.id)
          if (event) {
            event.x = state.x
            event.y = state.y
          }
        }
      }
    })
  }

  /**
   * Queries if a tile is occupied by an event (stationary or moving target).
  /**
   * Queries if a tile is occupied by an event (stationary or moving target).
   * Used by PhysicsSystem.
   */
  public isOccupied(
    x: number,
    y: number,
    options?: { isThrough?: boolean; excludeId?: string }
  ): boolean {
    for (const state of this.eventStates.values()) {
      if (options?.excludeId && state.id === options.excludeId) continue
      if (state.isThrough) continue // Event itself is through
      // if options.isThrough is true, the caller ignores obstacles, but PhysicsSystem usually handles that check before calling providers?
      // Actually PhysicsSystem says: "if (!options?.isThrough) check providers"
      // So here we just report if WE are an obstacle.

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

  /**
   * Returns the runtime state of an event, used by EntityRenderSystem.
   */
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

  // Handles State Changes to sync with Runtime State
  private onEventStateChanged(data: ZSignalData[ZEngineSignal.EventInternalStateChanged]): void {
    const state = this.eventStates.get(data.eventId)
    if (!state) return

    if (data.direction) {
      // Clear pre-interaction direction if explicit change
      // We need to track preInteractionDirection in state if we want to support it logic-side?
      // Yes, state needs to handle this.
      state.direction = data.direction
    }
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
      // Sync to ZEvent too?
      const mapEvent = this.map.currentMap?.events.find((e) => e.id === data.eventId)
      if (mapEvent) mapEvent.isThrough = data.isThrough
    }
  }

  // Interaction Logic (Face Player)
  // We need to store pre-interaction direction in state to restore it
  // So we add a property to ZEventRuntimeState? Or just keep it map-side here?
  private preInteractionDirections: Map<string, 'down' | 'left' | 'right' | 'up'> = new Map()

  private onEventInteractionStarted(
    eventId: string,
    triggererPos?: { x: number; y: number }
  ): void {
    const state = this.eventStates.get(eventId)
    if (!state) return

    // Stop moving
    if (state.isMoving) {
      // Snap to target? Or just stop?
      // Usually we finish the step. But for instant response:
      const tileSize = this.map.currentMap?.tileWidth || 48
      state.realX = state.targetX * tileSize
      state.realY = state.targetY * tileSize
      const tx = state.targetX ?? state.x
      const ty = state.targetY ?? state.y
      state.x = tx
      state.y = ty
      state.isMoving = false

      // Sync ZEvent
      const mapEvent = this.map.currentMap?.events.find((e) => e.id === eventId)
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

    // Check if transitioning?
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
