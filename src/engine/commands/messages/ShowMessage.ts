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
  const style = params[1] as number | undefined
  let target = params[2] as number | string | undefined

  if (target === 0 || target === '0') {
    target = interpreter.eventId
  }

  engine.eventBus.emit(ZEngineSignal.ShowMessage, { text, style, target })

  engine.input.clearAction(ZInputAction.OK)
  engine.input.clearAction(ZInputAction.CANCEL)

  const nextCmd = interpreter.list[interpreter.index]
  const isNextChoices = nextCmd && nextCmd.code === 102

  if (isNextChoices) {
    return 'continue'
  }

  interpreter.isWaitingForMessage = true

  return 'wait'
}
