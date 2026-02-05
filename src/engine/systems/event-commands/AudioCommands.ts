import { ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'
import { IEngineContext } from '@engine/managers'

/**
 * Command 241: Play BGM
 */
export const commandPlayBGM: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const config = params[0]

  audioManager.playBgm(config)

  return 'continue'
}

/**
 * Command 242: Fadeout BGM
 */
export const commandFadeOutBGM: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const duration = (params[0] as number) || 1 // seconds

  audioManager.fadeOutBgm(duration)

  return 'continue'
}

/**
 * Command 250: Play SE
 */
export const commandPlaySE: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const config = params[0]

  audioManager.playSe(config)

  return 'continue'
}

/**
 * Command 251: Stop SE
 */
export const commandStopSE: ZCommandProcessor = (): ZCommandResult => {
  // TODO: Implement stopAllSe in AudioManager if needed.
  // For now, SEs just play until finish.
  return 'continue'
}
