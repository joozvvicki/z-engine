import {
  ZCommandProcessor,
  ZCommandResult,
  ZEventInterpreter,
  ZEngineSignal,
  ZEventGraphic,
  IEngineContext
} from '@engine/types'

/**
 * Command 214: Set Event Graphic
 */
export const commandSetEventGraphic: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const graphic = params[0] as ZEventGraphic
  engine.eventBus.emit(ZEngineSignal.EventInternalStateChanged, {
    eventId: interpreter.eventId,
    graphic
  })
  return 'continue'
}
