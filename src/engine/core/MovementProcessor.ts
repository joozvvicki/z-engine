import { ZMoveCode, type ZMoveCommand } from '@engine/types'
import ZLogger from '@engine/utils/ZLogger'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'

export interface ZMoveable {
  id: string
  x: number
  y: number
  direction: 'down' | 'left' | 'right' | 'up'
  isMoving: boolean
  moveSpeed: number
  moveFrequency: number // 1-5 (RPG Maker style)
  moveRoute: ZMoveCommand[]
  moveRouteIndex: number
  moveRouteRepeat: boolean
  moveRouteSkip: boolean
  moveType: 'fixed' | 'random' | 'approach' | 'custom'
  isThrough: boolean
  waitTimer: number // in frames

  // State flags
  walkAnim: boolean
  stepAnim: boolean
  directionFix: boolean
  transparent: boolean
  opacity: number

  // Target for interpolation
  targetX: number
  targetY: number
}

export class MovementProcessor {
  private physicsSystem: PhysicsSystem

  constructor(physicsSystem: PhysicsSystem) {
    this.physicsSystem = physicsSystem
  }
  public processNextCommand(
    moveable: ZMoveable,
    playerPos?: { x: number; y: number },
    delta: number = 16.6
  ): void {
    if (moveable.moveType === 'fixed') return

    // If custom/random/approach but we have a wait timer, wait
    if (moveable.waitTimer > 0) {
      moveable.waitTimer -= delta / 16.6
      if (moveable.waitTimer < 0) moveable.waitTimer = 0
      return
    }

    // Frequency Delay (for autonomous movement)
    // 5: Highest (0 delay), 4: High (30), 3: Normal (60), 2: Low (120), 1: Lowest (240)
    // This only applies to autonomous movement between steps.
    // FIX: Do not apply to 'custom' (Set Move Route), strictly for autonomous.
    if (moveable.id !== 'PLAYER' && moveable.moveType !== 'custom') {
      const frequencyDelays = [0, 240, 120, 60, 30, 0]
      const delay = frequencyDelays[moveable.moveFrequency] || 0
      if (delay > 0) {
        moveable.waitTimer = delay
      }
    }

    // Handle preset types (Random, Approach)
    if (moveable.moveType === 'random') {
      const r = Math.floor(Math.random() * 4)
      const dx = r === 1 ? -1 : r === 2 ? 1 : 0
      const dy = r === 0 ? 1 : r === 3 ? -1 : 0
      this.attemptMove(moveable, dx, dy, true)
      return
    }

    if (moveable.moveType === 'approach' && playerPos) {
      const diffX = playerPos.x - moveable.x
      const diffY = playerPos.y - moveable.y
      const dx1 = diffX > 0 ? 1 : diffX < 0 ? -1 : 0
      const dy1 = diffY > 0 ? 1 : diffY < 0 ? -1 : 0

      // Try primary axis
      if (Math.abs(diffX) >= Math.abs(diffY)) {
        if (this.attemptMove(moveable, dx1, 0, true)) return
        if (this.attemptMove(moveable, 0, dy1, true)) return
      } else {
        if (this.attemptMove(moveable, 0, dy1, true)) return
        if (this.attemptMove(moveable, dx1, 0, true)) return
      }
      return
    }

    // If we reach here, it's 'custom'
    if (moveable.moveRouteIndex < 0 || moveable.moveRouteIndex >= moveable.moveRoute.length) {
      if (moveable.moveRouteRepeat && moveable.moveRoute.length > 0) {
        moveable.moveRouteIndex = 0
      } else {
        return
      }
    }

    const cmd = moveable.moveRoute[moveable.moveRouteIndex]
    const code = cmd.code as ZMoveCode
    const params = cmd.params || []

    switch (code) {
      // Basic Movement
      case ZMoveCode.MOVE_DOWN:
        this.attemptMove(moveable, 0, 1)
        return
      case ZMoveCode.MOVE_LEFT:
        this.attemptMove(moveable, -1, 0)
        return
      case ZMoveCode.MOVE_RIGHT:
        this.attemptMove(moveable, 1, 0)
        return
      case ZMoveCode.MOVE_UP:
        this.attemptMove(moveable, 0, -1)
        return

      // Diagonal Movement
      case ZMoveCode.MOVE_LOWER_LEFT:
        this.attemptMove(moveable, -1, 1)
        return
      case ZMoveCode.MOVE_LOWER_RIGHT:
        this.attemptMove(moveable, 1, 1)
        return
      case ZMoveCode.MOVE_UPPER_LEFT:
        this.attemptMove(moveable, -1, -1)
        return
      case ZMoveCode.MOVE_UPPER_RIGHT:
        this.attemptMove(moveable, 1, -1)
        return

      // Random / Toward Player
      case ZMoveCode.MOVE_RANDOM: {
        const r = Math.floor(Math.random() * 4)
        if (r === 0) this.attemptMove(moveable, 0, 1)
        else if (r === 1) this.attemptMove(moveable, -1, 0)
        else if (r === 2) this.attemptMove(moveable, 1, 0)
        else this.attemptMove(moveable, 0, -1)
        return
      }
      case ZMoveCode.MOVE_TOWARD_PLAYER:
        if (playerPos) {
          const diffX = playerPos.x - moveable.x
          const diffY = playerPos.y - moveable.y
          const adx = Math.abs(diffX)
          const ady = Math.abs(diffY)
          const dx1 = diffX > 0 ? 1 : diffX < 0 ? -1 : 0
          const dy1 = diffY > 0 ? 1 : diffY < 0 ? -1 : 0

          if (adx >= ady) {
            if (this.attemptMove(moveable, dx1, 0)) return
            if (this.attemptMove(moveable, 0, dy1)) return
          } else {
            if (this.attemptMove(moveable, 0, dy1)) return
            if (this.attemptMove(moveable, dx1, 0)) return
          }
          // If blocked, just turn toward them
          this.turnToward(moveable, playerPos)
          moveable.moveRouteIndex++
        }
        return
      case ZMoveCode.MOVE_AWAY_PLAYER:
        if (playerPos) {
          const diffX = playerPos.x - moveable.x
          const diffY = playerPos.y - moveable.y
          const adx = Math.abs(diffX)
          const ady = Math.abs(diffY)
          const dx1 = diffX > 0 ? -1 : diffX < 0 ? 1 : 0
          const dy1 = diffY > 0 ? -1 : diffY < 0 ? 1 : 0

          // Away logic: prefer the axis where we are CLOSER to player to increase distance?
          // Actually RM prefers the axis where we are FARTHER to keep going that way?
          // Standard is same as Toward but inverted directions
          if (adx >= ady) {
            if (this.attemptMove(moveable, dx1, 0)) return
            if (this.attemptMove(moveable, 0, dy1)) return
          } else {
            if (this.attemptMove(moveable, 0, dy1)) return
            if (this.attemptMove(moveable, dx1, 0)) return
          }
          // If blocked, turn away
          this.turnAway(moveable, playerPos)
          moveable.moveRouteIndex++
        }
        return
      case ZMoveCode.JUMP: {
        const jx = Number(params[0] || 0)
        const jy = Number(params[1] || 0)
        // Jump ignores passage usually, but we check if target is inside map
        moveable.targetX = moveable.x + jx
        moveable.targetY = moveable.y + jy
        moveable.isMoving = true
        moveable.moveRouteIndex++
        return
      }

      // Step Forward / Backward
      case ZMoveCode.STEP_FORWARD: {
        let sdx = 0,
          sdy = 0
        if (moveable.direction === 'up') sdy = -1
        else if (moveable.direction === 'down') sdy = 1
        else if (moveable.direction === 'left') sdx = -1
        else sdx = 1
        this.attemptMove(moveable, sdx, sdy)
        return
      }
      case ZMoveCode.STEP_BACKWARD: {
        let sdx = 0,
          sdy = 0
        if (moveable.direction === 'up') sdy = 1
        else if (moveable.direction === 'down') sdy = -1
        else if (moveable.direction === 'left') sdx = 1
        else sdx = -1
        // For Step Backward, we don't turn! So we use a special flag or just manual check
        const canPass = this.physicsSystem.checkPassage(
          moveable.x,
          moveable.y,
          moveable.x + sdx,
          moveable.y + sdy,
          { isThrough: moveable.isThrough }
        )
        if (canPass) {
          moveable.targetX = moveable.x + sdx
          moveable.targetY = moveable.y + sdy
          moveable.isMoving = true
          moveable.moveRouteIndex++
        }
        return
      }

      // Turning
      case ZMoveCode.TURN_DOWN:
        if (!moveable.directionFix) moveable.direction = 'down'
        moveable.moveRouteIndex++
        return
      case ZMoveCode.TURN_LEFT:
        if (!moveable.directionFix) moveable.direction = 'left'
        moveable.moveRouteIndex++
        return
      case ZMoveCode.TURN_RIGHT:
        if (!moveable.directionFix) moveable.direction = 'right'
        moveable.moveRouteIndex++
        return
      case ZMoveCode.TURN_UP:
        if (!moveable.directionFix) moveable.direction = 'up'
        moveable.moveRouteIndex++
        return
      case ZMoveCode.TURN_90_RIGHT: {
        if (!moveable.directionFix) {
          const dirs: Record<string, 'down' | 'left' | 'right' | 'up'> = {
            down: 'left',
            left: 'up',
            up: 'right',
            right: 'down'
          }
          moveable.direction = dirs[moveable.direction]
        }
        moveable.moveRouteIndex++
        return
      }
      case ZMoveCode.TURN_90_LEFT: {
        if (!moveable.directionFix) {
          const dirs: Record<string, 'down' | 'left' | 'right' | 'up'> = {
            down: 'right',
            right: 'up',
            up: 'left',
            left: 'down'
          }
          moveable.direction = dirs[moveable.direction]
        }
        moveable.moveRouteIndex++
        return
      }
      case ZMoveCode.TURN_180: {
        if (!moveable.directionFix) {
          const dirs: Record<string, 'down' | 'left' | 'right' | 'up'> = {
            down: 'up',
            up: 'down',
            left: 'right',
            right: 'left'
          }
          moveable.direction = dirs[moveable.direction]
        }
        moveable.moveRouteIndex++
        return
      }
      case ZMoveCode.TURN_90_RIGHT_LEFT: {
        if (!moveable.directionFix) {
          const roll = Math.random() > 0.5
          const dirsR: Record<string, 'down' | 'left' | 'right' | 'up'> = {
            down: 'left',
            left: 'up',
            up: 'right',
            right: 'down'
          }
          const dirsL: Record<string, 'down' | 'left' | 'right' | 'up'> = {
            down: 'right',
            right: 'up',
            up: 'left',
            left: 'down'
          }
          moveable.direction = roll ? dirsR[moveable.direction] : dirsL[moveable.direction]
        }
        moveable.moveRouteIndex++
        return
      }
      case ZMoveCode.TURN_RANDOM: {
        if (!moveable.directionFix) {
          const dirs: ('down' | 'left' | 'right' | 'up')[] = ['down', 'left', 'right', 'up']
          moveable.direction = dirs[Math.floor(Math.random() * 4)]
        }
        moveable.moveRouteIndex++
        return
      }
      case ZMoveCode.TURN_TOWARD_PLAYER:
        if (playerPos) this.turnToward(moveable, playerPos)
        moveable.moveRouteIndex++
        return
      case ZMoveCode.TURN_AWAY_PLAYER:
        if (playerPos) this.turnAway(moveable, playerPos)
        moveable.moveRouteIndex++
        return

      // Wait
      case ZMoveCode.WAIT:
        moveable.waitTimer = Number(params[0] || 60)
        moveable.moveRouteIndex++
        return

      // State changes
      case ZMoveCode.SPEED:
        moveable.moveSpeed = Number(params[0] || 4)
        moveable.moveRouteIndex++
        return
      case ZMoveCode.THROUGH_ON:
        moveable.isThrough = true
        moveable.moveRouteIndex++
        return
      case ZMoveCode.THROUGH_OFF:
        moveable.isThrough = false
        moveable.moveRouteIndex++
        return
      case ZMoveCode.WALK_ANIM_ON:
        moveable.walkAnim = true
        moveable.moveRouteIndex++
        return
      case ZMoveCode.WALK_ANIM_OFF:
        moveable.walkAnim = false
        moveable.moveRouteIndex++
        return
      case ZMoveCode.STEP_ANIM_ON:
        moveable.stepAnim = true
        moveable.moveRouteIndex++
        return
      case ZMoveCode.STEP_ANIM_OFF:
        moveable.stepAnim = false
        moveable.moveRouteIndex++
        return
      case ZMoveCode.DIR_FIX_ON:
        moveable.directionFix = true
        moveable.moveRouteIndex++
        return
      case ZMoveCode.DIR_FIX_OFF:
        moveable.directionFix = false
        moveable.moveRouteIndex++
        return
      case ZMoveCode.TRANSPARENT_ON:
        moveable.transparent = true
        moveable.moveRouteIndex++
        return
      case ZMoveCode.TRANSPARENT_OFF:
        moveable.transparent = false
        moveable.moveRouteIndex++
        return
      case ZMoveCode.CHANGE_OPACITY:
        moveable.opacity = Number(params[0] ?? 255)
        moveable.moveRouteIndex++
        return

      default:
        ZLogger.with('MovementProcessor').warn(`Command not implemented yet: ${code}`)
        moveable.moveRouteIndex++
        return
    }
  }

  private attemptMove(moveable: ZMoveable, dx: number, dy: number, isAutonomous = false): boolean {
    if (dx === 0 && dy === 0) return false

    let nextDir = moveable.direction
    if (!moveable.directionFix) {
      if (dx < 0) nextDir = 'left'
      else if (dx > 0) nextDir = 'right'
      else if (dy < 0) nextDir = 'up'
      else if (dy > 0) nextDir = 'down'
    }

    const canPass = this.physicsSystem.checkPassage(
      moveable.x,
      moveable.y,
      moveable.x + dx,
      moveable.y + dy,
      { isThrough: moveable.isThrough }
    )

    if (canPass) {
      moveable.direction = nextDir
      moveable.targetX = moveable.x + dx
      moveable.targetY = moveable.y + dy
      moveable.isMoving = true
      if (!isAutonomous) moveable.moveRouteIndex++
      return true
    } else {
      // If blocked, should we skip or wait?
      // For autonomous, we don't increment index if it's not custom
      // For custom, check moveRouteSkip
      if (!isAutonomous && moveable.moveRouteSkip) {
        moveable.moveRouteIndex++
      }
    }
    return false
  }

  private turnToward(moveable: ZMoveable, pos: { x: number; y: number }): void {
    if (moveable.directionFix) return
    const diffX = pos.x - moveable.x
    const diffY = pos.y - moveable.y
    if (Math.abs(diffX) > Math.abs(diffY)) {
      moveable.direction = diffX > 0 ? 'right' : 'left'
    } else if (Math.abs(diffY) > 0) {
      moveable.direction = diffY > 0 ? 'down' : 'up'
    } else if (Math.abs(diffX) > 0) {
      moveable.direction = diffX > 0 ? 'right' : 'left'
    }
  }

  private turnAway(moveable: ZMoveable, pos: { x: number; y: number }): void {
    if (moveable.directionFix) return
    const diffX = pos.x - moveable.x
    const diffY = pos.y - moveable.y
    if (Math.abs(diffX) > Math.abs(diffY)) {
      moveable.direction = diffX > 0 ? 'left' : 'right'
    } else if (Math.abs(diffY) > 0) {
      moveable.direction = diffY > 0 ? 'up' : 'down'
    } else if (Math.abs(diffX) > 0) {
      moveable.direction = diffX > 0 ? 'left' : 'right'
    }
  }
}
