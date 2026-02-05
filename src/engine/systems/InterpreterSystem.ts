import {
  type ZEventInterpreter,
  type ZEventCommand,
  type ZCommandResult,
  type ZEventPage,
  ZEngineSignal,
  IEngineContext
} from '@engine/types'
import { ZEventBus } from '@engine/core/ZEventBus'
import { CommandRegistry } from './event-commands'
import ZLogger from '@engine/utils/ZLogger'

/**
 * Manages the execution of event interpreters (active and parallel).
 * Extracts "Logical Execution" from EventSystem.
 */
export class InterpreterSystem {
  private bus: ZEventBus
  private engine: IEngineContext | null = null

  public isProcessing: boolean = false
  public activeInterpreter: ZEventInterpreter | null = null
  public parallelInterpreters: ZEventInterpreter[] = []

  constructor(bus: ZEventBus) {
    this.bus = bus
  }

  public setEngineContext(engine: IEngineContext): void {
    this.engine = engine
  }

  public startInterpreter(page: ZEventPage, eventId: string): void {
    if (page.list && page.list.length > 0) {
      this.activeInterpreter = {
        list: page.list,
        index: 0,
        eventId: eventId
      }
      this.isProcessing = true
    }
  }

  public addParallelInterpreter(page: ZEventPage, eventId: string): void {
    if (!this.parallelInterpreters.find((p) => p.eventId === eventId)) {
      this.parallelInterpreters.push({
        list: page.list,
        index: 0,
        eventId: eventId
      })
    }
  }

  public update(): void {
    // 1. Process Active
    if (this.activeInterpreter) {
      if (this.activeInterpreter.waitCount && this.activeInterpreter.waitCount > 0) {
        this.activeInterpreter.waitCount--
      } else if (
        !this.activeInterpreter.waitingForMoveEventId &&
        !this.activeInterpreter.isWaitingForMessage
      ) {
        this.executeInterpreterLoop(this.activeInterpreter, false)
      }
    }

    // 2. Process Parallel
    for (let i = this.parallelInterpreters.length - 1; i >= 0; i--) {
      const interpreter = this.parallelInterpreters[i]
      if (interpreter.waitCount && interpreter.waitCount > 0) {
        interpreter.waitCount--
        continue
      }
      this.executeInterpreterLoop(interpreter, true, i)
    }
  }

  private executeInterpreterLoop(
    interpreter: ZEventInterpreter,
    isParallel: boolean,
    parallelIndex: number = -1
  ): void {
    while (interpreter.index < interpreter.list.length) {
      if (interpreter.waitCount && interpreter.waitCount > 0) {
        return
      }

      const cmd = interpreter.list[interpreter.index]
      interpreter.index++

      const result = this.executeCommand(cmd, interpreter)
      if (result === 'wait') return
      if (result === 'stop') {
        if (isParallel) {
          this.parallelInterpreters.splice(parallelIndex, 1)
        } else {
          this.terminateActiveInterpreter()
        }
        return
      }
    }

    // End of list
    if (isParallel) {
      interpreter.index = 0 // Loop parallel
    } else {
      this.terminateActiveInterpreter()
    }
  }

  public resumeProcessing(): void {
    if (!this.activeInterpreter) return
    this.isProcessing = true
    // Logic will pick up in next update() or we can force a step here.
    // EventSystem called executeInterpreter() directly. We can wait for update().
  }

  public finishMessage(): void {
    if (this.activeInterpreter) {
      this.activeInterpreter.isWaitingForMessage = false
    }
  }

  public submitChoice(index: number): void {
    if (this.activeInterpreter) {
      this.activeInterpreter.pendingChoice = index
    }
    this.resumeProcessing()
  }

  public onMoveRouteFinished(eventId: string): void {
    if (this.activeInterpreter && this.activeInterpreter.waitingForMoveEventId === eventId) {
      this.activeInterpreter.waitingForMoveEventId = null
      this.isProcessing = true
      // We can let the next update loop handle it, or force execution.
      // Force execution feels snappier.
      this.executeInterpreterLoop(this.activeInterpreter, false)
    }
  }

  private terminateActiveInterpreter(): void {
    if (!this.activeInterpreter) return
    const eventId = this.activeInterpreter.eventId
    this.activeInterpreter = null
    this.isProcessing = false
    this.bus.emit(ZEngineSignal.EventExecutionFinished, { eventId })
  }

  private executeCommand(cmd: ZEventCommand, interpreter: ZEventInterpreter): ZCommandResult {
    const processor = CommandRegistry[cmd.code]
    if (processor) {
      if (!this.engine) {
        ZLogger.with('InterpreterSystem').error('Engine context not set! Cannot execute commands.')
        return 'continue'
      }
      return processor(cmd.parameters, interpreter, this.engine)
    }
    return 'continue'
  }
}
