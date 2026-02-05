import { IEngineContext, ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'
import { SceneMap } from '@engine/scenes/SceneMap'

/**
 * Command 201: Transfer Player
 */
export const commandTransferPlayer: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const mapId = params[0] as number
  const x = params[1] as number
  const y = params[2] as number
  const dirValue = params[3] as number

  let direction: 'down' | 'left' | 'right' | 'up' | undefined
  if (dirValue === 2) direction = 'down'
  if (dirValue === 4) direction = 'left'
  if (dirValue === 6) direction = 'right'
  if (dirValue === 8) direction = 'up'

  engine.scenes.goto(SceneMap, { mapOrId: mapId, playerX: x, playerY: y, direction })

  return 'stop'
}
