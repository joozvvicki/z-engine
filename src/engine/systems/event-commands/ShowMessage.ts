import {
  ZCommandProcessor,
  ZCommandResult,
  ZEngineSignal,
  ZInputAction,
  ZEventInterpreter
} from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZEventBus } from '@engine/core/ZEventBus'
import { InputManager } from '@engine/managers/InputManager'

/**
 * Command 101: Show Message
 */
export const commandShowMessage: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const text = params[0] as string
  const bus = services.require(ZEventBus)
  const input = services.require(InputManager)

  bus.emit(ZEngineSignal.ShowMessage, { text })

  // Consume any lingering input that might have triggered the event
  input.clearAction(ZInputAction.OK)
  input.clearAction(ZInputAction.CANCEL)

  // Tag interpreter for update loop
  const it = interpreter as unknown as Record<string, unknown>
  it.isWaitingForMessage = true

  return 'wait'
}
