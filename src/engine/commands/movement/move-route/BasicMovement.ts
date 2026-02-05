import type { MovementProcessor } from '@engine/core/MovementProcessor'
import { ZMoveable } from '@engine/types'

export const moveDown = (sys: MovementProcessor, m: ZMoveable): void => {
  sys.attemptMove(m, 0, 1)
}
export const moveLeft = (sys: MovementProcessor, m: ZMoveable): void => {
  sys.attemptMove(m, -1, 0)
}
export const moveRight = (sys: MovementProcessor, m: ZMoveable): void => {
  sys.attemptMove(m, 1, 0)
}
export const moveUp = (sys: MovementProcessor, m: ZMoveable): void => {
  sys.attemptMove(m, 0, -1)
}
export const moveLowerLeft = (sys: MovementProcessor, m: ZMoveable): void => {
  sys.attemptMove(m, -1, 1)
}
export const moveLowerRight = (sys: MovementProcessor, m: ZMoveable): void => {
  sys.attemptMove(m, 1, 1)
}
export const moveUpperLeft = (sys: MovementProcessor, m: ZMoveable): void => {
  sys.attemptMove(m, -1, -1)
}
export const moveUpperRight = (sys: MovementProcessor, m: ZMoveable): void => {
  sys.attemptMove(m, 1, -1)
}
