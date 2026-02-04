import { ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { GameStateManager } from '@engine/managers/GameStateManager'
import { InterpreterUtils } from './InterpreterUtils'

/**
 * Command 111: Conditional Branch
 */
export const commandConditionalBranch: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const gameState = services.require(GameStateManager)
  const type = params[0] as number
  let result = false

  if (type === 0) {
    const switchId = params[1] as number
    const requiredState = params[2] === 1
    const currentVal = gameState.getSwitch(switchId)
    result = currentVal === requiredState
  } else if (type === 1) {
    const varId = params[1] as number
    const neededVal = params[2] as number
    const currentVal = gameState.getVariable(varId)
    result = currentVal === neededVal
  }

  if (result) {
    return 'continue'
  } else {
    InterpreterUtils.advanceToElseOrEnd(interpreter)
    return 'continue'
  }
}

/**
 * Command 411: Else
 */
export const commandElse: ZCommandProcessor = (
  _params: unknown[],
  interpreter: ZEventInterpreter,
  _services: ServiceLocator
): ZCommandResult => {
  InterpreterUtils.advanceToEnd(interpreter)
  return 'continue'
}
