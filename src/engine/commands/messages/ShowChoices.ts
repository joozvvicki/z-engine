import {
  ZCommandProcessor,
  ZCommandResult,
  ZEventInterpreter,
  ZEngineSignal,
  IEngineContext
} from '@engine/types'
import { InterpreterUtils } from '../InterpreterUtils'

/**
 * Command 102: Show Choices
 */
export const commandShowChoices: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const choices = params[0] as string[]
  engine.eventBus.emit(ZEngineSignal.ShowChoices, { choices })
  return 'wait'
}

/**
 * Command 402: When (Choice Branch)
 */
export const commandWhen: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter
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
