import {
  type ZEvent,
  type ZEventPage,
  type ZEventCondition,
  ZEngineSignal,
  type ZEventRuntimeState,
  type ZSignalData,
  ZEventTrigger,
  IObstacleProvider,
  IPhysicsSystem
} from '@engine/types'
import { ZEventBus } from '@engine/core/ZEventBus'
import { MapManager } from '@engine/managers/MapManager'
import { GameStateManager } from '@engine/managers/GameStateManager'
import { MovementProcessor } from '@engine/core/MovementProcessor'

/**
 * Manages the lifecycle, state, and movement of events on the map.
 * Extracts "Physical" and "State" logic from EventSystem.
 */
export class EventManager implements IObstacleProvider {
  private physicsSystem: IPhysicsSystem
  private gameState: GameStateManager
  private mapManager: MapManager
  private bus: ZEventBus

  private movementProcessor: MovementProcessor
  private tileSize: number = 48

  // Runtime state for all events on the map
  private eventStates: Map<string, ZEventRuntimeState> = new Map()

  // Cache associated with the current map's events
  private _activePageCache: Map<string, number> = new Map()

  // Track pre-interaction directions to restore them
  private preInteractionDirections: Map<string, 'down' | 'left' | 'right' | 'up'> = new Map()

  constructor(
    physics: IPhysicsSystem,
    gameState: GameStateManager,
    mapManager: MapManager,
    bus: ZEventBus
  ) {
    this.physicsSystem = physics
    this.gameState = gameState
    this.mapManager = mapManager
    this.bus = bus

    this.movementProcessor = new MovementProcessor(this.physicsSystem)
  }

  public init(tileSize: number): void {
    this.tileSize = tileSize
  }

  public onBoot(): void {
    this.physicsSystem.registerProvider(this)

    this.bus.on(ZEngineSignal.MapWillLoad, () => {
      this._activePageCache.clear()
      this.eventStates.clear()
      this.preInteractionDirections.clear()
    })

    this.bus.on(ZEngineSignal.MapLoaded, () => {
      this.initializeEventStates()
    })

    this.bus.on(ZEngineSignal.GameStateChanged, () => {
      this.refreshAllEvents()
    })

    // Listen for internal state changes to update runtime state
    this.bus.on(ZEngineSignal.EventInternalStateChanged, this.onEventStateChanged.bind(this))
  }

  public initializeEventStates(): void {
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

  public getEventState(eventId: string): ZEventRuntimeState | undefined {
    return this.eventStates.get(eventId)
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
        directionFix: newPage?.options?.directionFix ?? false,
        trigger: newPage?.trigger
      })

      // FIX: Clear pre-interaction direction on page change
      this.preInteractionDirections.delete(event.id)
    }
  }

  private onEventStateChanged(data: ZSignalData[ZEngineSignal.EventInternalStateChanged]): void {
    const state = this.eventStates.get(data.eventId)
    if (!state) return

    // Using a partial update approach
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

  public update(delta: number, playerPos: { x: number; y: number }, isProcessing: boolean): void {
    const tileSize = this.mapManager.currentMap?.tileWidth || this.tileSize

    this.eventStates.forEach((state) => {
      // A. Process Logic (Command Selection)
      if (!state.isMoving) {
        const isCustomMove = state.moveType === 'custom'

        // Only update movement logic if NOT processing a blocking event (unless it's custom move route)
        // Note: EventSystem.isProcessing covers "is Player locked?".
        // If an event is running, other events usually stop moving in RM, unless "Parallel".
        // But here we'll assume isProcessing means "Player locked in cutscene".
        if (isCustomMove || !isProcessing) {
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
        const speed = baseSpeed * (delta / 16.66)

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

          // REMOVED: Sync back to ZEvent source of truth
          // We do NOT want to mutate the initial map data.
          // The ZEventRuntimeState is the source of truth for current position.
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

  public turnEventToward(eventId: string, targetPos: { x: number; y: number }): void {
    const state = this.eventStates.get(eventId)
    if (!state || state.directionFix) return
    this.movementProcessor.turnToward(state, targetPos)
  }

  public setEventDirection(eventId: string, direction: 'down' | 'left' | 'right' | 'up'): void {
    const state = this.eventStates.get(eventId)
    if (!state) return
    state.direction = direction
  }

  public savePreInteractionDirection(eventId: string): void {
    const state = this.eventStates.get(eventId)
    if (!state || state.directionFix) return

    if (!this.preInteractionDirections.has(eventId)) {
      this.preInteractionDirections.set(eventId, state.direction)
    }
  }

  public restorePreInteractionDirection(eventId: string, isTransitioning: boolean): void {
    if (isTransitioning) {
      this.preInteractionDirections.delete(eventId)
      return
    }

    const state = this.eventStates.get(eventId)
    if (!state) return

    const originalDir = this.preInteractionDirections.get(eventId)
    if (originalDir) {
      state.direction = originalDir
      this.preInteractionDirections.delete(eventId)
    }
  }

  public checkTrigger(
    x: number,
    y: number,
    trigger: ZEventTrigger
  ): { event: ZEvent; page: ZEventPage } | null {
    const map = this.mapManager.currentMap
    if (!map) return null

    // Look up event via Runtime State (to handle moved events correctly)
    for (const state of this.eventStates.values()) {
      if (state.x === x && state.y === y) {
        const event = map.events.find((e) => e.id === state.id)
        if (!event) continue

        const activePage = this.getActivePage(event)
        if (activePage && activePage.trigger === trigger) {
          return { event, page: activePage }
        }
      }
    }
    return null
  }
}
