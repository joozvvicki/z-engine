import {
  IEngineContext,
  ZAudioConfig,
  ZCommandProcessor,
  ZCommandResult,
  ZEventInterpreter
} from '@engine/types'

/**
 * Command 241: Play BGM
 */
export const commandPlayBGM: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const config = params[0] as ZAudioConfig

  engine.audio.playBgm(config)

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

  engine.audio.fadeOutBgm(duration)

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
  const config = params[0] as ZAudioConfig

  engine.audio.playSe(config)

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
