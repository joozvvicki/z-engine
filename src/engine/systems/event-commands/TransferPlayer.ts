import { ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SceneManager } from '@engine/managers/SceneManager'
import { SceneMap } from '@engine/scenes/SceneMap'

/**
 * Command 201: Transfer Player
 */
export const commandTransferPlayer: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  services: ServiceLocator
): ZCommandResult => {
  const sceneManager = services.require(SceneManager)
  const mapId = params[0] as number
  const x = params[1] as number
  const y = params[2] as number

  sceneManager.goto(SceneMap, { mapOrId: mapId, playerX: x, playerY: y })

  return 'stop'
}
