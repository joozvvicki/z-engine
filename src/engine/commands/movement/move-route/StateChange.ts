import type { MovementProcessor } from '@engine/core/MovementProcessor'
import { ZMoveable } from '@engine/types'

export const wait = (_sys: MovementProcessor, m: ZMoveable, params: unknown[]): void => {
  m.waitTimer = Number(params[0] || 60)
}

export const changeSpeed = (_sys: MovementProcessor, m: ZMoveable, params: unknown[]): void => {
  m.moveSpeed = Number(params[0] || 4)
}
export const throughOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.isThrough = true
}
export const throughOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.isThrough = false
}
export const walkAnimOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.walkAnim = true
}
export const walkAnimOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.walkAnim = false
}
export const stepAnimOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.stepAnim = true
}
export const stepAnimOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.stepAnim = false
}
export const dirFixOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.directionFix = true
}
export const dirFixOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.directionFix = false
}
export const transparentOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.transparent = true
}
export const transparentOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.transparent = false
}
export const changeOpacity = (_sys: MovementProcessor, m: ZMoveable, params: unknown[]): void => {
  m.opacity = Number(params[0] ?? 255)
}
