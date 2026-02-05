import { ZEngineSignal, type ZMoveCommand, ZInputAction, type ZMoveable } from '@engine/types'
import { type IObstacleProvider } from '@engine/interfaces/IPhysicsSystem'
import ZLogger from '@engine/utils/ZLogger'
import type { IPhysicsSystem } from '@engine/interfaces/IPhysicsSystem'
import { MovementProcessor } from '@engine/core/MovementProcessor'
import { InputManager } from '@engine/managers/InputManager'
import { MapManager } from '@engine/managers/MapManager'
import { ZEventBus } from '@engine/core/ZEventBus'

/**
 * Handles Player controls, movement, and interaction.
 * Refactored for Manual Dependency Injection.
 */
export class PlayerSystem implements ZMoveable, IObstacleProvider {
  // Dependencies
  private input: InputManager
  private physicsSystem: IPhysicsSystem
  private bus: ZEventBus
  private mapManager: MapManager

  private movementProcessor: MovementProcessor
  private tileSize: number = 48 // Default, updated in init()

  // ZMoveable Implementation
  public readonly id = 'PLAYER'
  public x: number = 0
  public y: number = 0
  public direction: 'down' | 'left' | 'right' | 'up' = 'down'
  public isMoving: boolean = false
  public moveSpeed: number = 5
  public moveFrequency: number = 5
  public moveRoute: ZMoveCommand[] = []
  public moveRouteIndex: number = -1
  public moveRouteRepeat: boolean = false
  public moveRouteSkip: boolean = false
  public moveType: 'fixed' | 'random' | 'approach' | 'custom' = 'custom'
  public isThrough: boolean = false
  public waitTimer: number = 0

  public walkAnim: boolean = true
  public stepAnim: boolean = false
  public directionFix: boolean = false
  public transparent: boolean = false
  public opacity: number = 255

  public targetX: number = 0
  public targetY: number = 0
  public realX: number = 0
  public realY: number = 0

  private isBooted: boolean = false
  // Input Blocking State
  private blockState = {
    message: false,
    event: false,
    menu: false,
    transition: false
  }

  private get isInputBlocked(): boolean {
    return (
      this.blockState.message ||
      this.blockState.event ||
      this.blockState.menu ||
      this.blockState.transition
    )
  }

  constructor(
    input: InputManager,
    physics: IPhysicsSystem,
    bus: ZEventBus,
    mapManager: MapManager
  ) {
    this.input = input
    this.physicsSystem = physics
    this.bus = bus
    this.mapManager = mapManager

    // MovementProcessor can be instantiated immediately as we have physics
    this.movementProcessor = new MovementProcessor(this.physicsSystem)
  }

  /**
   * Called by ZEngine during initialization phase.
   */
  public init(tileSize: number): void {
    if (this.isBooted) return
    this.isBooted = true

    this.tileSize = tileSize

    // Register as obstacle
    this.physicsSystem.registerProvider(this)

    // Attempt to locate start position (if map is already loaded, though usually it loads later)
    this.resetPositionToStart()

    this.setupListeners()
    this.snapToGrid()
  }

  private setupListeners(): void {
    this.bus.on(ZEngineSignal.ShowMessage, () => {
      this.blockState.message = true
    })
    this.bus.on(ZEngineSignal.MessageClosed, () => {
      this.blockState.message = false
    })
    this.bus.on(ZEngineSignal.EventExecutionStarted, () => {
      this.blockState.event = true
    })
    this.bus.on(ZEngineSignal.EventExecutionFinished, () => {
      this.blockState.event = false
    })
    this.bus.on(ZEngineSignal.MenuRequested, () => {
      ZLogger.with('PlayerSystem').info('MenuRequested -> Blocking input')
      this.blockState.menu = true
    })
    this.bus.on(ZEngineSignal.MenuClosed, () => {
      this.blockState.menu = false
    })
    this.bus.on(ZEngineSignal.SceneTransitionStarted, () => {
      this.blockState.transition = true
    })
    this.bus.on(ZEngineSignal.SceneTransitionFinished, () => {
      this.blockState.transition = false
    })

    // Listen for Map Load to reset position if needed
    this.bus.on(ZEngineSignal.MapLoaded, () => {
      // Optional: If we want to move player to Start Position on map load
      // this.resetPositionToStart()
      // NOTE: Usually SceneMap sets player position manually via params,
      // so we might not want to force override here unless strictly necessary.
      // Keeping it manual for now via SceneMap.
    })

    this.bus.on(ZEngineSignal.EventInternalStateChanged, (data) => {
      if (data.eventId === 'PLAYER' && data.moveRoute) {
        ZLogger.with('PlayerSystem').info('Received move route for player', data.moveRoute)
        this.moveRoute = data.moveRoute
        this.moveRouteIndex = 0
        this.waitTimer = 0
        this.moveRouteRepeat = data.moveRouteRepeat ?? false
        this.moveRouteSkip = data.moveRouteSkip ?? false
        this.moveType = 'custom'
      }
    })
  }

  public resetPositionToStart(): void {
    const startEvent = this.mapManager.currentMap?.events.find((e) => e.name === 'PlayerStart')
    if (startEvent) {
      this.x = startEvent.x
      this.y = startEvent.y
      this.snapToGrid()
    }
  }

  public onUpdate(delta: number): void {
    this.updateMovement(delta)
    if (!this.isMoving) {
      this.updateMoveRoute(delta)
      this.updateInput()
    }
  }

  private updateMoveRoute(delta: number): void {
    if (this.isInputBlocked && this.moveRouteIndex < 0) return

    this.movementProcessor.processNextCommand(this, undefined, delta)

    const routeFinished = this.moveRouteIndex >= this.moveRoute.length

    if (
      routeFinished &&
      !this.isMoving &&
      this.waitTimer <= 0 &&
      !this.moveRouteRepeat &&
      this.moveRouteIndex !== -1
    ) {
      ZLogger.with('PlayerSystem').info('Player move route finished')
      this.moveRouteIndex = -1
      this.bus.emit(ZEngineSignal.MoveRouteFinished, { eventId: 'PLAYER' })
    }
  }

  private updateInput(): void {
    if (this.isMoving || this.isInputBlocked || this.moveRouteIndex >= 0) {
      return
    }

    let dx = 0
    let dy = 0
    let nextDir = this.direction

    if (this.input.isActionDown(ZInputAction.RUN)) {
      this.moveSpeed = 6
    } else {
      this.moveSpeed = 5
    }

    if (this.input.isActionDown(ZInputAction.LEFT)) {
      dx = -1
      nextDir = 'left'
    } else if (this.input.isActionDown(ZInputAction.RIGHT)) {
      dx = 1
      nextDir = 'right'
    } else if (this.input.isActionDown(ZInputAction.UP)) {
      dy = -1
      nextDir = 'up'
    } else if (this.input.isActionDown(ZInputAction.DOWN)) {
      dy = 1
      nextDir = 'down'
    }

    if (dx !== 0 || dy !== 0) {
      if (this.direction !== nextDir) {
        this.direction = nextDir
      }

      const isNoClip = this.input.isActionDown(ZInputAction.NOCLIP)

      const result = this.physicsSystem.checkPassage(this.x, this.y, this.x + dx, this.y + dy, {
        skipPlayer: true,
        isThrough: isNoClip
      })

      if (result) {
        this.targetX = this.x + dx
        this.targetY = this.y + dy
        this.isMoving = true
      }
    }

    if (this.input.isActionJustPressed(ZInputAction.OK)) {
      let tx = this.x
      let ty = this.y
      if (this.direction === 'left') tx--
      else if (this.direction === 'right') tx++
      else if (this.direction === 'up') ty--
      else if (this.direction === 'down') ty++

      this.bus.emit(ZEngineSignal.InteractionRequested, { x: tx, y: ty })
    }

    if (this.input.isActionJustPressed(ZInputAction.CANCEL)) {
      if (this.mapManager.currentMap) {
        this.bus.emit(ZEngineSignal.MenuRequested, {
          mapOrId: this.mapManager.currentMap,
          playerX: this.x,
          playerY: this.y,
          direction: this.direction
        })
      }
    }
  }

  private updateMovement(delta: number): void {
    if (!this.isMoving) return

    const baseSpeed = Math.pow(2, this.moveSpeed - 4) * (this.tileSize / 32)
    const speed = baseSpeed * (delta / 16.6)
    const targetRealX = this.targetX * this.tileSize
    const targetRealY = this.targetY * this.tileSize

    let arrived = false

    if (this.realX < targetRealX) this.realX = Math.min(this.realX + speed, targetRealX)
    else if (this.realX > targetRealX) this.realX = Math.max(this.realX - speed, targetRealX)

    if (this.realY < targetRealY) this.realY = Math.min(this.realY + speed, targetRealY)
    else if (this.realY > targetRealY) this.realY = Math.max(this.realY - speed, targetRealY)

    if (this.realX === targetRealX && this.realY === targetRealY) arrived = true

    if (arrived) {
      const prevX = this.x
      const prevY = this.y
      this.isMoving = false
      this.x = this.targetX
      this.y = this.targetY

      this.bus.emit(ZEngineSignal.PlayerMoved, { x: this.x, y: this.y, prevX, prevY })
    }
  }

  public snapToGrid(): void {
    this.targetX = this.x
    this.targetY = this.y
    this.realX = this.x * this.tileSize
    this.realY = this.y * this.tileSize
    this.isMoving = false
  }

  public isOccupied(
    x: number,
    y: number,
    options?: { isThrough?: boolean; skipPlayer?: boolean; excludeId?: string }
  ): boolean {
    if (options?.skipPlayer) return false
    if (options?.excludeId === this.id) return false
    if (this.isThrough) return false

    if (this.x === x && this.y === y) return true
    if (this.isMoving && this.targetX === x && this.targetY === y) return true
    return false
  }

  public getSaveData(): any {
    return {
      x: this.x,
      y: this.y,
      direction: this.direction,
      transparent: this.transparent,
      mapId: this.mapManager.currentMap?.id || 0
    }
  }

  public loadSaveData(data: any): void {
    if (!data) return
    this.x = data.x
    this.y = data.y
    this.direction = data.direction
    this.transparent = data.transparent
    this.snapToGrid()
  }
}
