import { ZCommandProcessor, ZCommandResult, ZEventInterpreter, ZAudioConfig } from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { AudioManager } from '@engine/managers/AudioManager'

/**
 * Command 241: Play BGM
 */
export const commandPlayBGM: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const audioManager = services.require(AudioManager)
  const config = params[0] as ZAudioConfig

  // Optional fade out previous BGM (default 0)
  // RM doesn't send this in PlayBGM usually, relies on separate FadeOut or auto-cut
  audioManager.playBgm(config)

  return 'continue'
}

/**
 * Command 242: Fadeout BGM
 */
export const commandFadeOutBGM: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const audioManager = services.require(AudioManager)
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
  services: ServiceLocator
): ZCommandResult => {
  const audioManager = services.require(AudioManager)
  const config = params[0] as ZAudioConfig

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
