import type { MovementProcessor } from '@engine/core/MovementProcessor'
import { ZMoveable } from '@engine/types'

export const turnDown = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (!m.directionFix) m.direction = 'down'
}
export const turnLeft = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (!m.directionFix) m.direction = 'left'
}
export const turnRight = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (!m.directionFix) m.direction = 'right'
}
export const turnUp = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (!m.directionFix) m.direction = 'up'
}

export const turn90Right = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (!m.directionFix) {
    const dirs: Record<string, 'down' | 'left' | 'right' | 'up'> = {
      down: 'left',
      left: 'up',
      up: 'right',
      right: 'down'
    }
    m.direction = dirs[m.direction]
  }
}

export const turn90Left = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (!m.directionFix) {
    const dirs: Record<string, 'down' | 'left' | 'right' | 'up'> = {
      down: 'right',
      right: 'up',
      up: 'left',
      left: 'down'
    }
    m.direction = dirs[m.direction]
  }
}

export const turn180 = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (!m.directionFix) {
    const dirs: Record<string, 'down' | 'left' | 'right' | 'up'> = {
      down: 'up',
      up: 'down',
      left: 'right',
      right: 'left'
    }
    m.direction = dirs[m.direction]
  }
}

export const turn90RightLeft = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (Math.random() > 0.5) turn90Right(_sys, m)
  else turn90Left(_sys, m)
}

export const turnRandom = (_sys: MovementProcessor, m: ZMoveable): void => {
  if (!m.directionFix) {
    const dirs: ('down' | 'left' | 'right' | 'up')[] = ['down', 'left', 'right', 'up']
    m.direction = dirs[Math.floor(Math.random() * 4)]
  }
}

export const turnTowardPlayer = (
  sys: MovementProcessor,
  m: ZMoveable,
  _p: unknown[],
  playerPos?: { x: number; y: number }
): void => {
  if (playerPos) sys.turnToward(m, playerPos)
}

export const turnAwayPlayer = (
  sys: MovementProcessor,
  m: ZMoveable,
  _p: unknown[],
  playerPos?: { x: number; y: number }
): void => {
  if (playerPos) sys.turnAway(m, playerPos)
}
