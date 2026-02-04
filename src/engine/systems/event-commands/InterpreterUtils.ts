import { ZCommandCode, ZEventInterpreter } from '@engine/types'

/**
 * Utility functions for navigating event command lists within an interpreter.
 */
export class InterpreterUtils {
  /**
   * Advances the interpreter index to the next 'Else' or 'End Branch' command at the current depth.
   */
  public static advanceToElseOrEnd(interpreter: ZEventInterpreter): void {
    let depth = 0
    const list = interpreter.list

    while (interpreter.index < list.length) {
      const cmd = list[interpreter.index]

      if (cmd.code === ZCommandCode.ConditionalBranch) {
        depth++
      } else if (cmd.code === ZCommandCode.EndBranch) {
        if (depth === 0) {
          return
        }
        depth--
      } else if (cmd.code === ZCommandCode.Else) {
        if (depth === 0) {
          interpreter.index++
          return
        }
      }

      interpreter.index++
    }
  }

  /**
   * Advances the interpreter index to the next 'End Branch' command at the current depth.
   */
  public static advanceToEnd(interpreter: ZEventInterpreter): void {
    let depth = 0
    const list = interpreter.list

    while (interpreter.index < list.length) {
      const cmd = list[interpreter.index]

      if (cmd.code === ZCommandCode.ConditionalBranch) {
        depth++
      } else if (cmd.code === ZCommandCode.EndBranch) {
        if (depth === 0) {
          return
        }
        depth--
      }
      interpreter.index++
    }
  }

  /**
   * Advances the interpreter index to the next 'When' or 'End Choices' command at the current depth.
   */
  public static advanceToNextWhenOrEnd(interpreter: ZEventInterpreter): void {
    let depth = 0
    const list = interpreter.list

    while (interpreter.index < list.length) {
      const cmd = list[interpreter.index]

      if (cmd.code === ZCommandCode.ShowChoices) {
        depth++
      } else if (cmd.code === ZCommandCode.EndChoices) {
        if (depth === 0) {
          return
        }
        depth--
      } else if (cmd.code === ZCommandCode.When) {
        if (depth === 0) {
          return
        }
      }
      interpreter.index++
    }
  }
}
