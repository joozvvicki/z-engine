import {
  ZCommandProcessor,
  ZCommandResult,
  ZEventInterpreter,
  ZEngineSignal,
  ZMoveCommand,
  IEngineContext
} from '@engine/types'

/**
 * Command 205: Set Move Route
 */
export const commandSetMoveRoute: ZCommandProcessor = (
  params: unknown[],
  interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const targetId = params[0]
  const route = params[1] as ZMoveCommand[]
  const wait = params[2] as boolean
  const repeat = params[3] as boolean
  const skip = params[4] as boolean

  let eventId: string | null = null
  if (targetId === 0 || targetId === '0') {
    eventId = interpreter.eventId
  } else if (targetId === -1 || targetId === '-1' || targetId === 'PLAYER') {
    eventId = 'PLAYER'
  } else {
    eventId = String(targetId)
  }

  if (eventId) {
    engine.eventBus.emit(ZEngineSignal.EventInternalStateChanged, {
      eventId,
      moveRoute: route,
      moveType: 'custom',
      moveRouteRepeat: repeat,
      moveRouteSkip: skip
    })

    if (wait) {
      interpreter.waitingForMoveEventId = eventId
      return 'wait'
    }
  }

  return 'continue'
}
