import { ZCommandProcessor, ZCommandCode } from '@engine/types'

export const commandLoop: ZCommandProcessor = (params, interpreter, services) => {
  const loopIndex = interpreter.index - 1
  const mode = Number(params[0] || 0) // 0: Infinite, 1: Count, 2: Variable

  if (mode > 0) {
    if (!interpreter.loopStates) interpreter.loopStates = {}

    // Only initialize if we haven't already
    if (!interpreter.loopStates[loopIndex]) {
      let count = 0
      if (mode === 1) {
        count = Number(params[1] || 0)
      } else if (mode === 2) {
        const varId = Number(params[1] || 0)
        count = services.gameState.getVariable(varId)
      }

      if (count <= 0) {
        // Skip to EndLoop
        let depth = 0
        for (let i = interpreter.index; i < interpreter.list.length; i++) {
          const cmd = interpreter.list[i]
          if (cmd.code === ZCommandCode.Loop) depth++
          if (cmd.code === ZCommandCode.EndLoop) {
            if (depth === 0) {
              interpreter.index = i + 1
              return 'continue'
            }
            depth--
          }
        }
      }

      interpreter.loopStates[loopIndex] = { count }
    }
  }

  return 'continue'
}

export const commandEndLoop: ZCommandProcessor = (_params, interpreter) => {
  // Find matching Loop
  let depth = 0
  let loopIndex = -1

  for (let i = interpreter.index - 2; i >= 0; i--) {
    const cmd = interpreter.list[i]
    if (cmd.code === ZCommandCode.EndLoop) depth++
    if (cmd.code === ZCommandCode.Loop) {
      if (depth === 0) {
        loopIndex = i
        break
      }
      depth--
    }
  }

  if (loopIndex !== -1) {
    const state = interpreter.loopStates?.[loopIndex]
    if (state) {
      state.count--
      if (state.count > 0) {
        interpreter.index = loopIndex + 1 // Jump back to after Loop command
      } else {
        delete interpreter.loopStates![loopIndex]
      }
    } else {
      // Infinite loop
      interpreter.index = loopIndex + 1
    }
  }

  return 'continue'
}

export const commandBreakLoop: ZCommandProcessor = (_params, interpreter) => {
  let depth = 0
  for (let i = interpreter.index; i < interpreter.list.length; i++) {
    const cmd = interpreter.list[i]
    if (cmd.code === ZCommandCode.Loop) depth++
    if (cmd.code === ZCommandCode.EndLoop) {
      if (depth === 0) {
        interpreter.index = i + 1
        return 'continue'
      }
      depth--
    }
  }
  return 'continue'
}
