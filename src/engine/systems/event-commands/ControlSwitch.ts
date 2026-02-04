import { ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { GameStateManager } from '@engine/managers/GameStateManager'

/**
 * Command 121: Control Switch
 */
export const commandControlSwitch: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const gameState = services.require(GameStateManager)
  const switchId = params[0] as number
  const operation = params[1] as number

  if (operation === 0) {
    gameState.setSwitch(switchId, false)
  } else if (operation === 1) {
    gameState.setSwitch(switchId, true)
  } else if (operation === 2) {
    gameState.toggleSwitch(switchId)
  }

  return 'continue'
}
