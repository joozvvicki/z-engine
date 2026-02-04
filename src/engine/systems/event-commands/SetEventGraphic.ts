import {
  ZCommandProcessor,
  ZCommandResult,
  ZEventInterpreter,
  ZEngineSignal,
  ZEventGraphic
} from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZEventBus } from '@engine/core/ZEventBus'

/**
 * Command 214: Set Event Graphic
 */
export const commandSetEventGraphic: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const bus = services.require(ZEventBus)
  const graphic = params[0] as ZEventGraphic
  bus.emit(ZEngineSignal.EventInternalStateChanged, {
    eventId: interpreter.eventId,
    graphic
  })
  return 'continue'
}
