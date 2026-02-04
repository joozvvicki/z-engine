import { ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { GameStateManager } from '@engine/managers/GameStateManager'
import { MapManager } from '@engine/managers/MapManager'

/**
 * Command 123: Control Self Switch
 */
export const commandControlSelfSwitch: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const gameState = services.require(GameStateManager)
  const mapManager = services.require(MapManager)

  const mapId = mapManager.currentMap?.id || 0
  const eventId = interpreter.eventId
  const ch = params[0] as string
  const value = params[1] === 1

  gameState.setSelfSwitch(mapId, eventId, ch, value)
  return 'continue'
}
