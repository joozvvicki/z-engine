import {
  ZCommandProcessor,
  ZCommandResult,
  ZEngineSignal,
  ZInputAction,
  ZEventInterpreter,
  IEngineContext
} from '@engine/types'

/**
 * Command 101: Show Message
 */
export const commandShowMessage: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const text = params[0] as string

  engine.eventBus.emit(ZEngineSignal.ShowMessage, { text })

  // Consume any lingering input that might have triggered the event
  engine.input.clearAction(ZInputAction.OK)
  engine.input.clearAction(ZInputAction.CANCEL)

  // Tag interpreter for update loop
  const it = interpreter as unknown as Record<string, unknown>
  it.isWaitingForMessage = true

  return 'wait'
}
