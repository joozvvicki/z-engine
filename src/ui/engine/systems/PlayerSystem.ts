import { ZEngineSignal } from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import ZLogger from '@engine/core/ZLogger'

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

  // Visual offset for smooth movement
  public realX: number = 0
  public realY: number = 0

  private targetX: number = 0
  private targetY: number = 0

  // Input blocking (e.g., during messages)
  private isInputBlocked: boolean = false

  constructor(services: ServiceLocator, tileSize: number) {
    super(services)
    this.updateMode = SystemMode.PLAY
    this.tileSize = tileSize
    this.physicsSystem = undefined as unknown as PhysicsSystem // Will init in onBoot
  }

  public onBoot(): void {
    // We already have services via constructor (saved to private property)
    // But we need to make sure PhysicsSystem is available.
    this.physicsSystem = this.services.require(PhysicsSystem)

    const startEvent = this.map.currentMap?.events.find((e) => e.name === 'PlayerStart')

    if (startEvent) {
      this.x = startEvent.x
      this.y = startEvent.y
    } else {
      this.x = 5
      this.y = 5
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
    this.snapToGrid()
  }

  public onUpdate(): void {
    this.updateMovement()
    this.updateInput()
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

  private snapToGrid(): void {
    this.targetX = this.x
    this.targetY = this.y
    this.realX = this.x * this.tileSize
    this.realY = this.y * this.tileSize
    this.isMoving = false
  }
}
