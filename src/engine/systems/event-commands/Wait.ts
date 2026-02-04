import { ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'

/**
 * Command 230: Wait
 */
export const commandWait: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter
): ZCommandResult => {
  const frames = (params[0] as number) || 60
  interpreter.waitCount = frames
  // The services parameter is part of the ZCommandProcessor signature but not used here.
  return 'wait'
}
