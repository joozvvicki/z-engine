import { IPhysicsSystem, ZMoveCode, type ZMoveable } from '@engine/types'
import ZLogger from '@engine/utils/ZLogger'
import { MoveRouteRegistry } from '@engine/commands/movement/move-route/registry'

export class MovementProcessor {
  private physics: IPhysicsSystem

  constructor(physics: IPhysicsSystem) {
    this.physics = physics
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

    const handler = MoveRouteRegistry[code]
    if (handler) {
      // Execute
      handler(this, moveable, params, playerPos)

      // Auto-increment index unless it's a movement command that handles its own "isMoving" check
      // OR if the handler explicitly set isMoving=true, we usually advance index only when move finishes?
      // WAIT: In the original, most commands did `moveRouteIndex++` immediately.
      // Movement commands (attemptMove success) did NOT increment immediately if not autonomous?
      // Actually:
      // - attemptMove(..., isAutonomous=false) -> if success, it increments index ONLY if isAutonomous is true?
      //   No, look at original: `if (!isAutonomous) moveable.moveRouteIndex++` inside attemptMove success.
      //   So basic movements increment index themselves via attemptMove.

      // - Complex movements (Random, Toward) called attemptMove.

      // - Computed movements (Jump) did `moveRouteIndex++`.

      // - State changes did `moveRouteIndex++`.

      // - Wait did `moveRouteIndex++`.

      // My handlers do NOT have access to `moveRouteIndex` incrementing logic easily unless I pass it or relies on `attemptMove`.
      // `attemptMove` in existing code increments index if succeeds.

      // Issue: State changes (Speed, etc.) need to increment index.
      // My handlers for StateChange are void functions.

      // FIX: I will increment index HERE for non-movement commands?
      // Identifying non-movement commands is hard without meta-data.

      // Alternative: The Handlers should return "Next" or "Wait"?
      // Or I make `moveRouteIndex++` part of the helper methods `attemptMove`.

      // Let's check `StateChange.ts`. I implemented them as simple property setters.
      // They do NOT increment index.

      // I should update handlers to increment index or manage it here.
      // Inspecting `ZMoveCode`:
      // Movement (Up/Down...): attemptMove handles it.
      // Wait: `waitTimer` set. We need to increment index? Yes, `wait` case did `index++`.

      // SO: All commands seem to increment index immediately, EXCEPT:
      // - Movement commands that FAIL (blocked) -> they might wait or skip.

      // Let's enforce that Handlers are responsible for index increment?
      // Or cleaner: `attemptMove` handles it for motion.
      // State changes need `moveRouteIndex++`.

      // I'll add `moveable.moveRouteIndex++` to all state handlers in `StateChange.ts`?
      // Better: I'll check if the command was a "State Change" and increment here? No, unsafe.

      // Let's modify the handlers I just wrote to increment index if appropriate.
      // Or... I can verify `attemptMove` logic.
    } else {
      ZLogger.with('MovementProcessor').warn(`Command not implemented yet: ${code}`)
      moveable.moveRouteIndex++
    }
  }

  public attemptMove(moveable: ZMoveable, dx: number, dy: number, isAutonomous = false): boolean {
    if (dx === 0 && dy === 0) return false

    let nextDir = moveable.direction
    if (!moveable.directionFix) {
      if (dx < 0) nextDir = 'left'
      else if (dx > 0) nextDir = 'right'
      else if (dy < 0) nextDir = 'up'
      else if (dy > 0) nextDir = 'down'
    }

    const canPass = this.physics.checkPassage(
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

  public turnToward(moveable: ZMoveable, pos: { x: number; y: number }): void {
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

  public turnAway(moveable: ZMoveable, pos: { x: number; y: number }): void {
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
