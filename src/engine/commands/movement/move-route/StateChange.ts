import type { MovementProcessor } from '@engine/core/MovementProcessor'
import { ZMoveable } from '@engine/types'

export const wait = (_sys: MovementProcessor, m: ZMoveable, params: unknown[]): void => {
  m.waitTimer = Number(params[0] || 60)
  m.moveRouteIndex++
}

export const changeSpeed = (_sys: MovementProcessor, m: ZMoveable, params: unknown[]): void => {
  m.moveSpeed = Number(params[0] || 4)
  m.moveRouteIndex++
}
export const throughOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.isThrough = true
  m.moveRouteIndex++
}
export const throughOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.isThrough = false
  m.moveRouteIndex++
}
export const walkAnimOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.walkAnim = true
  m.moveRouteIndex++
}
export const walkAnimOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.walkAnim = false
  m.moveRouteIndex++
}
export const stepAnimOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.stepAnim = true
  m.moveRouteIndex++
}
export const stepAnimOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.stepAnim = false
  m.moveRouteIndex++
}
export const dirFixOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.directionFix = true
  m.moveRouteIndex++
}
export const dirFixOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.directionFix = false
  m.moveRouteIndex++
}
export const transparentOn = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.transparent = true
  m.moveRouteIndex++
}
export const transparentOff = (_sys: MovementProcessor, m: ZMoveable): void => {
  m.transparent = false
  m.moveRouteIndex++
}
export const changeOpacity = (_sys: MovementProcessor, m: ZMoveable, params: unknown[]): void => {
  m.opacity = Number(params[0] ?? 255)
  m.moveRouteIndex++
}
