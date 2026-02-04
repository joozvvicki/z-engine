import { ZCommandProcessor, ZCommandResult, ZEventInterpreter, ZEngineSignal } from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZEventBus } from '@engine/core/ZEventBus'

/**
 * Command 213: Set Event Direction
 */
export const commandSetEventDirection: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const bus = services.require(ZEventBus)
  const direction = params[0] as 'down' | 'left' | 'right' | 'up'
  bus.emit(ZEngineSignal.EventInternalStateChanged, {
    eventId: interpreter.eventId,
    direction
  })
  return 'continue'
}
