import { ZEngineSignal, type ZMoveCommand } from '@engine/types'
import ZLogger from '@engine/utils/ZLogger'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'
import { MovementProcessor, type ZMoveable } from '@engine/core/MovementProcessor'

export class PlayerSystem extends ZSystem implements ZMoveable {
  private physicsSystem: PhysicsSystem
  private movementProcessor: MovementProcessor
  private tileSize: number

  // ZMoveable Implementation
  public readonly id = 'PLAYER'
  public x: number = 0
  public y: number = 0
  public direction: 'down' | 'left' | 'right' | 'up' = 'down'
  public isMoving: boolean = false
  public moveSpeed: number = 4
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
  private isInputBlocked: boolean = false

  constructor(services: ServiceLocator, tileSize: number) {
    super(services)
    this.updateMode = SystemMode.PLAY
    this.tileSize = tileSize
    this.physicsSystem = undefined as unknown as PhysicsSystem
    this.movementProcessor = undefined as unknown as MovementProcessor
  }

  public onBoot(): void {
    if (this.isBooted) return
    this.isBooted = true
    this.physicsSystem = this.services.require(PhysicsSystem)
    this.movementProcessor = new MovementProcessor(this.physicsSystem)

    const startEvent = this.map.currentMap?.events.find((e) => e.name === 'PlayerStart')

    if (startEvent) {
      this.x = startEvent.x
      this.y = startEvent.y
    }

    this.realX = this.x * this.tileSize
    this.realY = this.y * this.tileSize

    this.bus.on(ZEngineSignal.ShowMessage, () => {
      this.isInputBlocked = true
    })
    this.bus.on(ZEngineSignal.MessageClosed, () => {
      this.isInputBlocked = false
    })
    this.bus.on(ZEngineSignal.EventExecutionStarted, () => {
      this.isInputBlocked = true
    })
    this.bus.on(ZEngineSignal.EventExecutionFinished, () => {
      this.isInputBlocked = false
    })

    this.bus.on(ZEngineSignal.EventInternalStateChanged, (data) => {
      if (data.eventId === 'PLAYER' && data.moveRoute) {
        ZLogger.with('PlayerSystem').info('Received move route for player', data.moveRoute)
        this.moveRoute = data.moveRoute
        this.moveRouteIndex = 0
        this.waitTimer = 0
      }
    })

    this.snapToGrid()
  }

  public onUpdate(delta: number): void {
    this.updateMovement(delta)
    if (!this.isMoving) {
      this.updateMoveRoute(delta)
      this.updateInput()
    }
  }

  private updateMoveRoute(delta: number): void {
    // The instruction "In EntityRenderSystem, pass delta to processNextCommand(moveable, playerPos, delta)"
    // seems to refer to a different system or a general pattern.
    // In PlayerSystem, the player itself is the 'moveable', and 'playerPos' is not directly used here
    // as the player's own position is implicit.
    // The `delta` argument is already being passed correctly.
    this.movementProcessor.processNextCommand(this, undefined, delta)
  }

  private updateInput(): void {
    if (this.isMoving || this.isInputBlocked || this.moveRouteIndex >= 0) return

    let dx = 0
    let dy = 0
    let nextDir = this.direction

    if (this.input.isKeyDown('ArrowLeft')) {
      dx = -1
      nextDir = 'left'
    } else if (this.input.isKeyDown('ArrowRight')) {
      dx = 1
      nextDir = 'right'
    } else if (this.input.isKeyDown('ArrowUp')) {
      dy = -1
      nextDir = 'up'
    } else if (this.input.isKeyDown('ArrowDown')) {
      dy = 1
      nextDir = 'down'
    }

    if (dx !== 0 || dy !== 0) {
      if (this.direction !== nextDir) {
        this.direction = nextDir
      }

      const result = this.physicsSystem.checkPassage(this.x, this.y, this.x + dx, this.y + dy, {
        skipPlayer: true
      })
      if (result) {
        this.targetX = this.x + dx
        this.targetY = this.y + dy
        this.isMoving = true
      }
    }

    if (
      this.input.isKeyDown('Enter') ||
      this.input.isKeyDown('Space') ||
      this.input.isKeyDown('KeyZ')
    ) {
      let tx = this.x
      let ty = this.y
      if (this.direction === 'left') tx--
      else if (this.direction === 'right') tx++
      else if (this.direction === 'up') ty--
      else if (this.direction === 'down') ty++

      this.bus.emit(ZEngineSignal.InteractionRequested, { x: tx, y: ty })
    }
  }

  private updateMovement(delta: number): void {
    if (!this.isMoving) return

    // speed in RPG Maker: 4 is normal, 3 is slow, 5 is fast
    // Let's map it roughly: 4 -> 4px/frame? No, standard 1/15 per frame?
    // Current speed 4 is 4 pixels per frame (at 60fps = 240px/s).
    // Tile size is usually 48 or 64. 48/4 = 12 frames to cross a tile.
    // RPG Maker style speed: Speed 4 = 1 tile per 32 frames (at 60fps)
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
}
