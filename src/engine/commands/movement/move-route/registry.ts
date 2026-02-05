import { ZMoveCode, ZMoveable } from '@engine/types'
import type { MovementProcessor } from '@engine/core/MovementProcessor'
import * as Basic from './BasicMovement'
import * as Complex from './ComplexMovement'
import * as Turn from './Turning'
import * as State from './StateChange'

type MoveCommandHandler = (
  processor: MovementProcessor,
  moveable: ZMoveable,
  params: unknown[],
  playerPos?: { x: number; y: number }
) => void

export const MoveRouteRegistry: Record<string, MoveCommandHandler> = {
  [ZMoveCode.MOVE_DOWN]: Basic.moveDown,
  [ZMoveCode.MOVE_LEFT]: Basic.moveLeft,
  [ZMoveCode.MOVE_RIGHT]: Basic.moveRight,
  [ZMoveCode.MOVE_UP]: Basic.moveUp,
  [ZMoveCode.MOVE_LOWER_LEFT]: Basic.moveLowerLeft,
  [ZMoveCode.MOVE_LOWER_RIGHT]: Basic.moveLowerRight,
  [ZMoveCode.MOVE_UPPER_LEFT]: Basic.moveUpperLeft,
  [ZMoveCode.MOVE_UPPER_RIGHT]: Basic.moveUpperRight,

  [ZMoveCode.MOVE_RANDOM]: Complex.moveRandom,
  [ZMoveCode.MOVE_TOWARD_PLAYER]: Complex.moveTowardPlayer,
  [ZMoveCode.MOVE_AWAY_PLAYER]: Complex.moveAwayPlayer,
  [ZMoveCode.JUMP]: Complex.jump,
  [ZMoveCode.STEP_FORWARD]: Complex.stepForward,
  [ZMoveCode.STEP_BACKWARD]: Complex.stepBackward,

  [ZMoveCode.TURN_DOWN]: Turn.turnDown,
  [ZMoveCode.TURN_LEFT]: Turn.turnLeft,
  [ZMoveCode.TURN_RIGHT]: Turn.turnRight,
  [ZMoveCode.TURN_UP]: Turn.turnUp,
  [ZMoveCode.TURN_90_RIGHT]: Turn.turn90Right,
  [ZMoveCode.TURN_90_LEFT]: Turn.turn90Left,
  [ZMoveCode.TURN_180]: Turn.turn180,
  [ZMoveCode.TURN_90_RIGHT_LEFT]: Turn.turn90RightLeft,
  [ZMoveCode.TURN_RANDOM]: Turn.turnRandom,
  [ZMoveCode.TURN_TOWARD_PLAYER]: Turn.turnTowardPlayer,
  [ZMoveCode.TURN_AWAY_PLAYER]: Turn.turnAwayPlayer,

  [ZMoveCode.WAIT]: State.wait,
  [ZMoveCode.SPEED]: State.changeSpeed,
  [ZMoveCode.FREQUENCY]: (_sys, m, p) => {
    m.moveFrequency = Number(p[0] || 3)
  }, // Inline simple ones or add to StateChange
  [ZMoveCode.WALK_ANIM_ON]: State.walkAnimOn,
  [ZMoveCode.WALK_ANIM_OFF]: State.walkAnimOff,
  [ZMoveCode.STEP_ANIM_ON]: State.stepAnimOn,
  [ZMoveCode.STEP_ANIM_OFF]: State.stepAnimOff,
  [ZMoveCode.DIR_FIX_ON]: State.dirFixOn,
  [ZMoveCode.DIR_FIX_OFF]: State.dirFixOff,
  [ZMoveCode.THROUGH_ON]: State.throughOn,
  [ZMoveCode.THROUGH_OFF]: State.throughOff,
  [ZMoveCode.TRANSPARENT_ON]: State.transparentOn,
  [ZMoveCode.TRANSPARENT_OFF]: State.transparentOff,
  [ZMoveCode.CHANGE_OPACITY]: State.changeOpacity,

  [ZMoveCode.CHANGE_GRAPHIC]: (_sys, _m, _p) => {
    /* TODO: visual update needs signal or direct access? */
  },
  [ZMoveCode.CHANGE_BLEND]: (_sys, _m, _p) => {
    /* TODO */
  },
  [ZMoveCode.PLAY_SE]: (_sys, _m, _p) => {
    /* TODO: Audio needs ZEngine reference usually... */
  },
  [ZMoveCode.SCRIPT]: (_sys, _m, _p) => {
    /* TODO */
  }
}
