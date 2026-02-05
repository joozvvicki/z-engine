import { IEngineContext, ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'

/**
 * Command 123: Control Self Switch
 */
export const commandControlSelfSwitch: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const mapId = engine.map.currentMap?.id || 0
  const eventId = interpreter.eventId
  const ch = params[0] as string
  const value = params[1] === 1

  engine.gameState.setSelfSwitch(mapId, eventId, ch, value)
  return 'continue'
}
