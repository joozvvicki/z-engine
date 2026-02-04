import { ZCommandProcessor, ZCommandResult, ZEventInterpreter, ZEngineSignal } from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZEventBus } from '@engine/core/ZEventBus'
import { InterpreterUtils } from './InterpreterUtils'

/**
 * Command 102: Show Choices
 */
export const commandShowChoices: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const bus = services.require(ZEventBus)
  const choices = params[0] as string[]
  bus.emit(ZEngineSignal.ShowChoices, { choices })
  return 'wait'
}

/**
 * Command 402: When (Choice Branch)
 */
export const commandWhen: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  _services: ServiceLocator
): ZCommandResult => {
  const choiceIndex = params[0] as number
  const it = interpreter as unknown as Record<string, unknown>
  const pendingChoice = it.pendingChoice as number | undefined

  if (pendingChoice === choiceIndex) {
    return 'continue'
  } else {
    InterpreterUtils.advanceToNextWhenOrEnd(interpreter)
    return 'continue'
  }
}
