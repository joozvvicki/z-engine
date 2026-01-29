import { ZSystem, ZEventTrigger } from '@engine/types'
import { InputManager } from '@engine/managers/InputManager'
import { MapManager } from '@engine/managers/MapManager'

export class PlayerSystem extends ZSystem {
  private inputManager: InputManager
  private mapManager: MapManager
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

  constructor(inputManager: InputManager, mapManager: MapManager, tileSize: number) {
    super()
    this.inputManager = inputManager
    this.mapManager = mapManager
    this.tileSize = tileSize
  }

  public onBoot(): void {
    const startEvent = this.mapManager.currentMap?.events.find((e) => e.name === 'PlayerStart')

    if (startEvent) {
      this.x = startEvent.x
      this.y = startEvent.y
    } else {
      this.x = 5
      this.y = 5
    }

    this.snapToGrid()
  }

  public onUpdate(): void {
    this.updateMovement()
    this.updateInput()
  }

  private updateInput(): void {
    if (this.isMoving) return

    let dx = 0
    let dy = 0
    let nextDir = this.direction

    if (this.inputManager.isKeyDown('ArrowLeft')) {
      dx = -1
      nextDir = 'left'
    } else if (this.inputManager.isKeyDown('ArrowRight')) {
      dx = 1
      nextDir = 'right'
    } else if (this.inputManager.isKeyDown('ArrowUp')) {
      dy = -1
      nextDir = 'up'
    } else if (this.inputManager.isKeyDown('ArrowDown')) {
      dy = 1
      nextDir = 'down'
    }

    if (dx !== 0 || dy !== 0) {
      if (this.direction !== nextDir) {
        this.direction = nextDir
      }

      const result = this.mapManager.checkPassage(this.x, this.y, this.x + dx, this.y + dy)
      // LOG ENABLED FORCEFULLY
      console.log(`[PlayerSystem] Move to ${this.x + dx},${this.y + dy}. Passable: ${result}`)

      if (result) {
        this.targetX = this.x + dx
        this.targetY = this.y + dy
        this.isMoving = true
      }
    }

    if (this.inputManager.isKeyDown('Enter') || this.inputManager.isKeyDown(' ')) {
      this.checkTrigger(ZEventTrigger.Action)
    }
  }

  private checkTrigger(trigger: ZEventTrigger): void {
    if (this.isMoving && trigger === ZEventTrigger.Action) return

    let tx = this.x
    let ty = this.y

    if (trigger === ZEventTrigger.Action) {
      if (this.direction === 'left') tx--
      else if (this.direction === 'right') tx++
      else if (this.direction === 'up') ty--
      else if (this.direction === 'down') ty++
    }

    const events = this.mapManager.getEventsAt(tx, ty)
    const activeEvent = events.find((e) => {
      const page = e.pages[e.pages.length - 1] // TODO: Real condition check
      return page && page.trigger === trigger
    })

    if (activeEvent) {
      console.log(`[PlayerSystem] Triggered event ${activeEvent.id} via ${ZEventTrigger[trigger]}`)
      // @ts-ignore - $zEngine is a global debugging/access reference
      if (window.$zEngine?.eventSystem) {
        // @ts-ignore - $zEngine is a global debugging/access reference
        window.$zEngine.eventSystem.startEvent(activeEvent)
      }
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
      this.isMoving = false
      this.x = this.targetX
      this.y = this.targetY

      // Post-move trigger check (Player Touch)
      this.checkTrigger(ZEventTrigger.PlayerTouch)
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
