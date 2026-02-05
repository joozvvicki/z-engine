import { ZEventInterpreter, ZCommandCode } from '@engine/types'

export const InterpreterUtils = {
  advanceToElseOrEnd(interpreter: ZEventInterpreter): void {
    let depth = 0
    const list = interpreter.list
    for (let i = interpreter.index + 1; i < list.length; i++) {
      const cmd = list[i]
      if (cmd.code === ZCommandCode.ConditionalBranch) {
        depth++
      } else if (cmd.code === ZCommandCode.EndBranch) {
        if (depth === 0) {
          interpreter.index = i
          return
        }
        depth--
      } else if (cmd.code === ZCommandCode.Else) {
        if (depth === 0) {
          interpreter.index = i
          return
        }
      }
    }
  },

  advanceToEnd(interpreter: ZEventInterpreter): void {
    let depth = 0
    const list = interpreter.list
    for (let i = interpreter.index + 1; i < list.length; i++) {
      const cmd = list[i]
      if (cmd.code === ZCommandCode.ConditionalBranch) {
        depth++
      } else if (cmd.code === ZCommandCode.EndBranch) {
        if (depth === 0) {
          interpreter.index = i
          return
        }
        depth--
      }
    }
  },

  advanceToNextWhenOrEnd(interpreter: ZEventInterpreter): void {
    let depth = 0
    const list = interpreter.list
    for (let i = interpreter.index + 1; i < list.length; i++) {
      const cmd = list[i]
      if (cmd.code === ZCommandCode.ShowChoices) {
        depth++
      } else if (cmd.code === ZCommandCode.EndChoices) {
        if (depth === 0) {
          interpreter.index = i
          return
        }
        depth--
      } else if (cmd.code === ZCommandCode.When) {
        if (depth === 0) {
          interpreter.index = i
          return
        }
      }
    }
  }
}
