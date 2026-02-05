import {
  type ZEvent,
  ZEngineSignal,
  ZEventTrigger,
  IEngineContext,
  type ZEventRuntimeState,
  ZEventPage
} from '@engine/types'
import type { IPhysicsSystem, IObstacleProvider } from '@engine/interfaces/IPhysicsSystem'
import { ZEventBus } from '@engine/core/ZEventBus'
import { MapManager } from '@engine/managers/MapManager'
import { GameStateManager } from '@engine/managers/GameStateManager'

import { EventManager } from '@engine/managers/EventManager'
import { InterpreterSystem } from './InterpreterSystem'

/**
 * Orchestrator for Event Logic.
 * Delegates State to EventManager.
 * Delegates Execution to InterpreterSystem.
 */
export class EventSystem implements IObstacleProvider {
  // Dependencies
  private bus: ZEventBus
  private mapManager: MapManager

  // Sub-Systems
  public eventManager: EventManager
  public interpreterSystem: InterpreterSystem

  private playerPos: { x: number; y: number } = { x: 0, y: 0 }

  constructor(
    physics: IPhysicsSystem,
    gameState: GameStateManager,
    bus: ZEventBus,
    mapManager: MapManager
  ) {
    this.bus = bus
    this.mapManager = mapManager

    this.eventManager = new EventManager(physics, gameState, mapManager, bus)
    this.interpreterSystem = new InterpreterSystem(bus)
  }

  public init(tileSize: number): void {
    this.eventManager.init(tileSize)
  }

  public setEngineContext(engine: IEngineContext): void {
    this.interpreterSystem.setEngineContext(engine)
  }

  public onBoot(): void {
    // 1. Boot Sub-systems
    this.eventManager.onBoot()
    // InterpreterSystem doesn't need explicit boot, just bus usage

    // 3. Listen to Signals (Orchestration)
    this.bus.on(ZEngineSignal.EventTriggered, ({ event }) => {
      this.startEvent(event)
    })

    this.bus.on(ZEngineSignal.InteractionRequested, ({ x, y }) => {
      // Logic: Ask Manager if there's a trigger?
      const result = this.eventManager.checkTrigger(x, y, ZEventTrigger.Action)
      if (result) {
        // Fix: Don't interact if moving
        const state = this.eventManager.getEventState(result.event.id)
        if (state && state.isMoving) return

        this.startEvent(result.event, this.playerPos)
        return
      }

      // Check under player
      const result2 = this.eventManager.checkTrigger(
        this.playerPos.x,
        this.playerPos.y,
        ZEventTrigger.Action
      )
      if (result2) {
        // Fix: Don't interact if moving
        const state = this.eventManager.getEventState(result2.event.id)
        if (state && state.isMoving) return

        this.startEvent(result2.event, this.playerPos)
      }
    })

    this.bus.on(ZEngineSignal.PlayerMoved, ({ x, y }) => {
      this.playerPos = { x, y }
      const result = this.eventManager.checkTrigger(x, y, ZEventTrigger.PlayerTouch)
      if (result) {
        this.startEvent(result.event, { x, y })
      }
    })

    this.bus.on(ZEngineSignal.MoveRouteFinished, ({ eventId }) => {
      this.interpreterSystem.onMoveRouteFinished(eventId)
    })

    this.bus.on(ZEngineSignal.EventExecutionFinished, ({ eventId }) => {
      this.eventManager.restorePreInteractionDirection(eventId, this.isTransitioning)
    })

    this.bus.on(ZEngineSignal.SceneTransitionStarted, () => {
      this.isTransitioning = true
    })
    this.bus.on(ZEngineSignal.SceneTransitionFinished, () => {
      this.isTransitioning = false
    })

    this.bus.on(ZEngineSignal.EventInternalStateChanged, ({ eventId, trigger }) => {
      if (trigger === ZEventTrigger.Autorun || trigger === ZEventTrigger.Parallel) {
        const event = this.mapManager.currentMap?.events.find((e) => e.id === eventId)
        if (!event) return

        const page = this.eventManager.getActivePage(event)
        if (!page) return

        if (trigger === ZEventTrigger.Autorun) {
          this.startEvent(event)
        } else if (trigger === ZEventTrigger.Parallel) {
          this.interpreterSystem.addParallelInterpreter(page, event.id)
        }
      }
    })
  }

  private isTransitioning: boolean = false

  public onUpdate(delta: number): void {
    // Delegate Updates
    this.interpreterSystem.update()
    this.eventManager.update(delta, this.playerPos, this.interpreterSystem.isProcessing)
  }

  public startEvent(event: ZEvent, triggererPos?: { x: number; y: number }): void {
    const page = this.eventManager.getActivePage(event)
    if (!page) return

    // Prevent freeze on empty events
    if (!page.list || page.list.length === 0) return

    this.eventManager.savePreInteractionDirection(event.id)

    if (triggererPos) {
      this.eventManager.turnEventToward(event.id, triggererPos)
    }

    this.interpreterSystem.startInterpreter(page, event.id)

    this.bus.emit(ZEngineSignal.EventExecutionStarted, {
      eventId: event.id,
      triggererPos
    })
  }

  public isOccupied(
    x: number,
    y: number,
    options?: { isThrough?: boolean; excludeId?: string }
  ): boolean {
    return this.eventManager.isOccupied(x, y, options)
  }

  public getEventState(eventId: string): ZEventRuntimeState | undefined {
    return this.eventManager.getEventState(eventId)
  }

  public getActivePage(event: ZEvent): ZEventPage | null {
    return this.eventManager.getActivePage(event)
  }

  // Delegate Methods
  public resumeProcessing(): void {
    this.interpreterSystem.resumeProcessing()
  }

  public finishMessage(): void {
    this.interpreterSystem.finishMessage()
  }

  public submitChoice(index: number): void {
    this.interpreterSystem.submitChoice(index)
  }

  public get isProcessing(): boolean {
    return this.interpreterSystem.isProcessing
  }

  public refreshAllEvents(): void {
    this.eventManager.refreshAllEvents()
  }

  public refreshEvent(event: ZEvent): void {
    this.eventManager.refreshEvent(event)
  }

  public setEventDirection(eventId: string, direction: 'down' | 'left' | 'right' | 'up'): void {
    this.eventManager.setEventDirection(eventId, direction)
  }
}
