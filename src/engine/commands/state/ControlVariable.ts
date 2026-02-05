import { IEngineContext, ZCommandProcessor, ZCommandResult, ZEventInterpreter } from '@engine/types'

/**
 * Command 122: Control Variable
 */
export const commandControlVariable: ZCommandProcessor = (
  params: unknown[],
  _interpreter: ZEventInterpreter,
  engine: IEngineContext
): ZCommandResult => {
  const varId = params[0] as number
  const op = params[1] as number
  const value = params[2] as number

  let current = engine.gameState.getVariable(varId)

  switch (op) {
    case 0: // Set
      current = value
      break
    case 1: // Add
      current += value
      break
    case 2: // Sub
      current -= value
      break
    case 3: // Mul
      current *= value
      break
    case 4: // Div
      current = Math.floor(current / value)
      break
    case 5: // Mod
      current = current % value
      break
  }

  engine.gameState.setVariable(varId, current)
  return 'continue'
}
