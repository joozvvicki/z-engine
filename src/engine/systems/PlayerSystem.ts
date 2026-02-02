import { ZEngineSignal, type ZMoveCommand } from '@engine/types'
import ZLogger from '@engine/utils/ZLogger'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'

export class PlayerSystem extends ZSystem {
  private physicsSystem: PhysicsSystem
  private tileSize: number

  // Player state (runtime)
  // In a full implementation, this should be in an Entity component
  public x: number = 0
  public y: number = 0
  public direction: 'down' | 'left' | 'right' | 'up' = 'down'
  public isMoving: boolean = false
  public moveSpeed: number = 2 // pixels per frame
  private isBooted: boolean = false

  // Visual offset for smooth movement
  public realX: number = 0
  public realY: number = 0

  private targetX: number = 0
  private targetY: number = 0
  private moveRoute: ZMoveCommand[] = []
  private moveRouteIndex: number = -1

  // Input blocking (e.g., during messages)
  private isInputBlocked: boolean = false
  public isThrough: boolean = false

  constructor(services: ServiceLocator, tileSize: number) {
    super(services)
    this.updateMode = SystemMode.PLAY
    this.tileSize = tileSize
    this.physicsSystem = undefined as unknown as PhysicsSystem // Will init in onBoot
  }

  public onBoot(): void {
    if (this.isBooted) return
    this.isBooted = true
    // We already have services via constructor (saved to private property)
    // But we need to make sure PhysicsSystem is available.
    this.physicsSystem = this.services.require(PhysicsSystem)

    const startEvent = this.map.currentMap?.events.find((e) => e.name === 'PlayerStart')

    if (startEvent) {
      this.x = startEvent.x
      this.y = startEvent.y
    }

    this.realX = this.x * this.tileSize
    this.realY = this.y * this.tileSize

    // Listen for message events to block/unblock input
    this.bus.on(ZEngineSignal.ShowMessage, () => {
      this.isInputBlocked = true
    })

    this.bus.on(ZEngineSignal.MessageClosed, () => {
      this.isInputBlocked = false
    })

    this.bus.on(ZEngineSignal.EventInternalStateChanged, (data) => {
      if (data.eventId === 'PLAYER' && data.moveRoute) {
        ZLogger.with('PlayerSystem').info('Received move route for player', data.moveRoute)
        this.moveRoute = data.moveRoute
        this.moveRouteIndex = 0
      }
    })

    this.snapToGrid()
  }

  public onUpdate(): void {
    this.updateMovement()
    if (!this.isMoving) {
      this.updateMoveRoute()
      this.updateInput()
    }
  }

  private updateMoveRoute(): void {
    if (this.moveRouteIndex < 0 || this.moveRouteIndex >= this.moveRoute.length) {
      if (this.moveRouteIndex >= 0) {
        this.moveRouteIndex = -1 // Finished
        this.moveRoute = []
      }
      return
    }

    const cmd = this.moveRoute[this.moveRouteIndex]
    let dx = 0
    let dy = 0
    let nextDir = this.direction

    const normalizedCode = cmd.code.startsWith('MOVE_') ? cmd.code : `MOVE_${cmd.code}`

    if (normalizedCode === 'MOVE_UP') {
      dy = -1
      nextDir = 'up'
    } else if (normalizedCode === 'MOVE_DOWN') {
      dy = 1
      nextDir = 'down'
    } else if (normalizedCode === 'MOVE_LEFT') {
      dx = -1
      nextDir = 'left'
    } else if (normalizedCode === 'MOVE_RIGHT') {
      dx = 1
      nextDir = 'right'
    } else if (cmd.code === 'TURN_UP') {
      this.direction = 'up'
      this.moveRouteIndex++
      return
    } else if (cmd.code === 'TURN_DOWN') {
      this.direction = 'down'
      this.moveRouteIndex++
      return
    } else if (cmd.code === 'TURN_LEFT') {
      this.direction = 'left'
      this.moveRouteIndex++
      return
    } else if (cmd.code === 'TURN_RIGHT') {
      this.direction = 'right'
      this.moveRouteIndex++
      return
    } else if (cmd.code === 'THROUGH_ON') {
      this.isThrough = true
      this.moveRouteIndex++
      this.updateMoveRoute()
      return
    } else if (cmd.code === 'THROUGH_OFF') {
      this.isThrough = false
      this.moveRouteIndex++
      this.updateMoveRoute()
      return
    } else if (cmd.code === 'WAIT') {
      // For now simple wait - just skip. Real wait would need a timer.
      // Actually let's add a simple wait counter if we have one.
      this.moveRouteIndex++
      this.updateMoveRoute()
      return
    } else {
      // Unknown command? Skip it.
      ZLogger.with('PlayerSystem').warn(`Unknown move command: ${cmd.code}`)
      this.moveRouteIndex++
      this.updateMoveRoute()
      return
    }

    if (dx !== 0 || dy !== 0) {
      this.direction = nextDir
      const result = this.physicsSystem.checkPassage(this.x, this.y, this.x + dx, this.y + dy, {
        isThrough: this.isThrough
      })
      ZLogger.with('PlayerSystem').info(
        `Move Route Command: ${cmd.code} (dir: ${nextDir}). Result: ${result} at ${this.x + dx},${
          this.y + dy
        }`
      )
      if (result) {
        this.targetX = this.x + dx
        this.targetY = this.y + dy
        this.isMoving = true
        this.moveRouteIndex++
      } else {
        ZLogger.with('PlayerSystem').warn(`Move Route Blocked: ${cmd.code}`)
      }
    }
  }

  private updateInput(): void {
    if (this.isMoving) return
    if (this.isInputBlocked) return // Don't process input during messages

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

      const result = this.physicsSystem.checkPassage(this.x, this.y, this.x + dx, this.y + dy)
      // LOG ENABLED FORCEFULLY
      ZLogger.with('PlayerSystem').info(
        `Move to ${this.x + dx},${this.y + dy}. Passable: ${result}`
      )

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

  private updateMovement(): void {
    if (!this.isMoving) return

    const speed = this.moveSpeed // * (delta / 16.6) // normalize speed
    const targetRealX = this.targetX * this.tileSize
    const targetRealY = this.targetY * this.tileSize

    let arrived = false

    if (this.realX < targetRealX) {
      this.realX = Math.min(this.realX + speed, targetRealX)
    } else if (this.realX > targetRealX) {
      this.realX = Math.max(this.realX - speed, targetRealX)
    }

    if (this.realY < targetRealY) {
      this.realY = Math.min(this.realY + speed, targetRealY)
    } else if (this.realY > targetRealY) {
      this.realY = Math.max(this.realY - speed, targetRealY)
    }

    if (this.realX === targetRealX && this.realY === targetRealY) {
      arrived = true
    }

    if (arrived) {
      const prevX = this.x
      const prevY = this.y
      this.isMoving = false
      this.x = this.targetX
      this.y = this.targetY

      this.bus.emit(ZEngineSignal.PlayerMoved, {
        x: this.x,
        y: this.y,
        prevX,
        prevY
      })
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
