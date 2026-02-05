import { MovementProcessor } from '@engine/core/MovementProcessor'
import { ZMoveable } from '@engine/types'

export const moveRandom = (sys: MovementProcessor, m: ZMoveable): void => {
  const r = Math.floor(Math.random() * 4)
  if (r === 0) sys.attemptMove(m, 0, 1)
  else if (r === 1) sys.attemptMove(m, -1, 0)
  else if (r === 2) sys.attemptMove(m, 1, 0)
  else sys.attemptMove(m, 0, -1)
}

export const moveTowardPlayer = (
  sys: MovementProcessor,
  m: ZMoveable,
  _params: unknown[],
  playerPos?: { x: number; y: number }
): void => {
  if (!playerPos) return
  const diffX = playerPos.x - m.x
  const diffY = playerPos.y - m.y
  const adx = Math.abs(diffX)
  const ady = Math.abs(diffY)
  const dx1 = diffX > 0 ? 1 : diffX < 0 ? -1 : 0
  const dy1 = diffY > 0 ? 1 : diffY < 0 ? -1 : 0

  if (adx >= ady) {
    if (sys.attemptMove(m, dx1, 0)) return
    if (sys.attemptMove(m, 0, dy1)) return
  } else {
    if (sys.attemptMove(m, 0, dy1)) return
    if (sys.attemptMove(m, dx1, 0)) return
  }
  sys.turnToward(m, playerPos)
}

export const moveAwayPlayer = (
  sys: MovementProcessor,
  m: ZMoveable,
  _params: unknown[],
  playerPos?: { x: number; y: number }
): void => {
  if (!playerPos) return
  const diffX = playerPos.x - m.x
  const diffY = playerPos.y - m.y
  const adx = Math.abs(diffX)
  const ady = Math.abs(diffY)
  const dx1 = diffX > 0 ? -1 : diffX < 0 ? 1 : 0
  const dy1 = diffY > 0 ? -1 : diffY < 0 ? 1 : 0

  if (adx >= ady) {
    if (sys.attemptMove(m, dx1, 0)) return
    if (sys.attemptMove(m, 0, dy1)) return
  } else {
    if (sys.attemptMove(m, 0, dy1)) return
    if (sys.attemptMove(m, dx1, 0)) return
  }
  sys.turnAway(m, playerPos)
}

export const jump = (_sys: MovementProcessor, m: ZMoveable, params: unknown[]): void => {
  const jx = Number(params[0] || 0)
  const jy = Number(params[1] || 0)
  m.targetX = m.x + jx
  m.targetY = m.y + jy
  m.isMoving = true
  m.moveRouteIndex++
}

export const stepForward = (sys: MovementProcessor, m: ZMoveable): void => {
  let sdx = 0,
    sdy = 0
  if (m.direction === 'up') sdy = -1
  else if (m.direction === 'down') sdy = 1
  else if (m.direction === 'left') sdx = -1
  else sdx = 1
  sys.attemptMove(m, sdx, sdy)
}

export const stepBackward = (sys: MovementProcessor, m: ZMoveable): void => {
  let sdx = 0,
    sdy = 0
  if (m.direction === 'up') sdy = 1
  else if (m.direction === 'down') sdy = -1
  else if (m.direction === 'left') sdx = 1
  else sdx = -1

  sys.attemptMove(m, sdx, sdy)
}
