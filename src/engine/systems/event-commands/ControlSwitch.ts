import { IEngineContext, ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'

/**
 * Command 121: Control Switch
 */
export const commandControlSwitch: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const switchId = params[0] as number
  const operation = params[1] as number

  if (operation === 0) {
    engine.gameState.setSwitch(switchId, false)
  } else if (operation === 1) {
    engine.gameState.setSwitch(switchId, true)
  } else if (operation === 2) {
    engine.gameState.toggleSwitch(switchId)
  }

  return 'continue'
}
