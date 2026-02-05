import {
  ZCommandProcessor,
  ZCommandResult,
  ZEventInterpreter,
  ZEngineSignal,
  IEngineContext
} from '@engine/types'

/**
 * Command 213: Set Event Direction
 */
export const commandSetEventDirection: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const direction = params[0] as 'down' | 'left' | 'right' | 'up'
  engine.eventBus.emit(ZEngineSignal.EventInternalStateChanged, {
    eventId: interpreter.eventId,
    direction
  })
  return 'continue'
}
