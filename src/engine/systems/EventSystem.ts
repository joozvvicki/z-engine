import {
  type ZEvent,
  type ZEventPage,
  type ZEventCondition,
  type ZEventCommand,
  type ZCommandResult,
  type ZCommandProcessor,
  type ZEventGraphic,
  ZCommandCode,
  ZEngineSignal,
  ZEventTrigger,
  type ZMoveCommand
} from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'

import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SceneManager } from '@engine/managers/SceneManager'
import { SceneMap } from '@engine/scenes/SceneMap'

export class EventSystem extends ZSystem {
  private playerSystem: PlayerSystem
  private sceneManager: SceneManager

  private isProcessing: boolean = false
  private activeInterpreter: {
    list: ZEventCommand[]
    index: number
    eventId: string
    waitCount?: number
  } | null = null

  private processors: Map<number, ZCommandProcessor> = new Map()
  private parallelInterpreters: {
    list: ZEventCommand[]
    index: number
    eventId: string
    waitCount?: number
  }[] = []

  constructor(services: ServiceLocator) {
    super(services)
    this.updateMode = SystemMode.PLAY

    this.sceneManager = undefined as unknown as SceneManager
    this.playerSystem = undefined as unknown as PlayerSystem

    this.registerCommands()
  }

  private registerCommands(): void {
    this.processors.set(ZCommandCode.TransferPlayer, this.commandTransferPlayer.bind(this))
    this.processors.set(ZCommandCode.ShowMessage, this.commandShowMessage.bind(this))
    this.processors.set(ZCommandCode.ControlSwitch, this.commandControlSwitch.bind(this))
    this.processors.set(ZCommandCode.ControlVariable, this.commandControlVariable.bind(this))
    this.processors.set(ZCommandCode.ControlSelfSwitch, this.commandControlSelfSwitch.bind(this))
    this.processors.set(ZCommandCode.ConditionalBranch, this.commandConditionalBranch.bind(this))
    this.processors.set(ZCommandCode.Else, this.commandElse.bind(this))
    this.processors.set(ZCommandCode.EndBranch, () => 'continue')
    this.processors.set(ZCommandCode.ShowChoices, this.commandShowChoices.bind(this))
    this.processors.set(ZCommandCode.When, this.commandWhen.bind(this))
    this.processors.set(ZCommandCode.EndChoices, () => 'continue')
    this.processors.set(ZCommandCode.ShowAnimation, this.commandShowAnimation.bind(this))
    this.processors.set(ZCommandCode.SetMoveRoute, this.commandSetMoveRoute.bind(this))
    this.processors.set(ZCommandCode.SetEventDirection, this.commandSetEventDirection.bind(this))
    this.processors.set(ZCommandCode.SetEventGraphic, this.commandSetEventGraphic.bind(this))
    this.processors.set(ZCommandCode.Wait, this.commandWait.bind(this))
  }

  public onBoot(): void {
    this.sceneManager = this.services.require(SceneManager)
    this.playerSystem = this.services.require(PlayerSystem)

    this.bus.on(ZEngineSignal.EventTriggered, ({ event }) => {
      this.startEvent(event)
    })

    this.bus.on(ZEngineSignal.InteractionRequested, ({ x, y }) => {
      const handled = this.checkTrigger(x, y, ZEventTrigger.Action)
      if (handled) return

      if (this.playerSystem) {
        this.checkTrigger(this.playerSystem.x, this.playerSystem.y, ZEventTrigger.Action)
      }
    })

    this.bus.on(ZEngineSignal.PlayerMoved, ({ x, y }) => {
      this.checkTrigger(x, y, ZEventTrigger.PlayerTouch)
    })
  }

  public resumeProcessing(): void {
    if (!this.activeInterpreter) return
    this.isProcessing = true
    this.executeInterpreter()
  }

  public onUpdate(): void {
    if (this.activeInterpreter) {
      if (this.activeInterpreter.waitCount && this.activeInterpreter.waitCount > 0) {
        this.activeInterpreter.waitCount--
      } else if (!this.isWaitingForMessage) {
        this.executeInterpreter()
      }
    }
    this.updateParallelProcesses()
  }

  private updateParallelProcesses(): void {
    // If we have no parallel interpreters, check if we need to start some
    if (this.parallelInterpreters.length === 0) {
      this.checkParallelTriggers()
    }

    // Update existing parallel interpreters
    for (let i = this.parallelInterpreters.length - 1; i >= 0; i--) {
      const interpreter = this.parallelInterpreters[i]
      if (interpreter.waitCount && interpreter.waitCount > 0) {
        interpreter.waitCount--
        continue
      }
      this.executeParallelInterpreter(interpreter, i)
    }
  }

  private checkParallelTriggers(): void {
    const map = this.map.currentMap
    if (!map) return

    map.events.forEach((event) => {
      const page = this.getActivePage(event)
      if (page && page.trigger === ZEventTrigger.Parallel) {
        // Start parallel process if not already running (simplified check)
        if (!this.parallelInterpreters.find((p) => p.eventId === event.id)) {
          this.parallelInterpreters.push({
            list: page.list,
            index: 0,
            eventId: event.id
          })
        }
      }
    })
  }

  private isWaitingForMessage: boolean = false

  public finishMessage(): void {
    this.isWaitingForMessage = false
  }

  public startEvent(event: ZEvent): void {
    const activePage = this.getActivePage(event)
    if (!activePage) return

    if (activePage.list && activePage.list.length > 0) {
      this.activeInterpreter = {
        list: activePage.list,
        index: 0,
        eventId: event.id
      }
      this.isProcessing = true
      this.bus.emit(ZEngineSignal.EventExecutionStarted, { eventId: event.id })
    }
  }

  private checkPageConditions(conditions: ZEventCondition): boolean {
    const gameState = this.game

    if (conditions.switch1Id) {
      const val = gameState.getSwitch(Number(conditions.switch1Id))
      if (!val) return false
    }

    if (conditions.switch2Id) {
      const val = gameState.getSwitch(Number(conditions.switch2Id))
      if (!val) return false
    }

    if (conditions.variableId && conditions.variableValue !== undefined) {
      const val = gameState.getVariable(Number(conditions.variableId))
      if (val < conditions.variableValue) return false
    }

    // Item check
    if (conditions.item) {
      // TODO: Implement inventory check
    }

    // Actor check
    if (conditions.actor) {
      // TODO: Implement party check
    }

    return true
  }

  // Overload checkPageConditions to support self-switch
  private checkPageConditionsWithEvent(conditions: ZEventCondition, eventId: string): boolean {
    if (!this.checkPageConditions(conditions)) return false

    if (conditions.selfSwitchCh) {
      const mapId = this.map.currentMap?.id || 0
      const val = this.game.getSelfSwitch(mapId, eventId, conditions.selfSwitchCh)
      if (!val) return false
    }

    return true
  }

  private getActivePage(event: ZEvent): ZEventPage | null {
    for (let i = event.pages.length - 1; i >= 0; i--) {
      const page = event.pages[i]
      if (this.checkPageConditionsWithEvent(page.conditions, event.id)) {
        // Sync through status for PhysicsSystem
        event.isThrough = page.options.through
        return page
      }
    }
    event.isThrough = false
    return null
  }

  public checkTrigger(x: number, y: number, trigger: ZEventTrigger): boolean {
    if (this.isProcessing) return false

    const map = this.map.currentMap
    if (!map) return false

    const event = map.events.find((e) => e.x === x && e.y === y)
    if (!event) return false

    const activePage = this.getActivePage(event)
    if (activePage && activePage.trigger === trigger) {
      this.startEvent(event)
      return true
    }
    return false
  }

  private executeInterpreter(): void {
    if (!this.activeInterpreter) return

    while (this.activeInterpreter.index < this.activeInterpreter.list.length) {
      if (this.activeInterpreter.waitCount && this.activeInterpreter.waitCount > 0) {
        return
      }

      const cmd = this.activeInterpreter.list[this.activeInterpreter.index]
      this.activeInterpreter.index++

      const result = this.executeCommand(cmd, this.activeInterpreter)
      if (result === 'wait') {
        return
      }
      if (result === 'stop') {
        const eventId = this.activeInterpreter.eventId
        this.activeInterpreter = null
        this.isProcessing = false
        this.bus.emit(ZEngineSignal.EventExecutionFinished, { eventId })
        return
      }
    }

    const eventId = this.activeInterpreter.eventId
    this.activeInterpreter = null
    this.isProcessing = false
    this.bus.emit(ZEngineSignal.EventExecutionFinished, { eventId })
  }

  private executeParallelInterpreter(
    interpreter: { list: ZEventCommand[]; index: number; eventId: string },
    index: number
  ): void {
    while (interpreter.index < interpreter.list.length) {
      const cmd = interpreter.list[interpreter.index]
      interpreter.index++

      const result = this.executeCommand(cmd, interpreter)
      if (result === 'wait') {
        return
      }
      if (result === 'stop') {
        this.parallelInterpreters.splice(index, 1)
        return
      }
    }
    // Loop parallel process
    interpreter.index = 0
  }

  private executeCommand(
    cmd: ZEventCommand,
    interpreter: { list: ZEventCommand[]; index: number; eventId: string }
  ): ZCommandResult {
    const processor = this.processors.get(cmd.code)
    if (processor) {
      return processor(cmd.parameters, interpreter)
    }

    return 'continue'
  }

  private commandTransferPlayer(params: unknown[]): ZCommandResult {
    const mapId = params[0] as number
    const x = params[1] as number
    const y = params[2] as number
    this.sceneManager.goto(SceneMap, { mapOrId: mapId, playerX: x, playerY: y })

    return 'stop'
  }

  private commandShowMessage(params: unknown[]): ZCommandResult {
    const text = params[0] as string

    this.isWaitingForMessage = true

    this.bus.emit(ZEngineSignal.ShowMessage, { text })

    const inputManager = this.input
    if (inputManager) {
      inputManager.clearKey('Enter')
      inputManager.clearKey('Space')
      inputManager.clearKey('KeyZ')
    }

    return 'wait'
  }

  private commandControlSwitch(params: unknown[]): ZCommandResult {
    const gameState = this.game
    const switchId = params[0] as number
    const operation = params[1] as number

    if (operation === 0) {
      gameState.setSwitch(switchId, false)
    } else if (operation === 1) {
      gameState.setSwitch(switchId, true)
    } else if (operation === 2) {
      gameState.toggleSwitch(switchId)
    }

    return 'continue'
  }

  private commandControlSelfSwitch(
    params: unknown[],
    interpreter: { eventId: string }
  ): ZCommandResult {
    const mapId = this.map.currentMap?.id || 0
    const eventId = interpreter.eventId
    const ch = params[0] as string
    const value = params[1] === 1

    this.game.setSelfSwitch(mapId, eventId, ch, value)
    return 'continue'
  }

  private commandControlVariable(params: unknown[]): ZCommandResult {
    const gameState = this.game
    const varId = params[0] as number
    const op = params[1] as number
    const value = params[2] as number

    let current = gameState.getVariable(varId)

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

    gameState.setVariable(varId, current)
    return 'continue'
  }

  private pendingChoice: number | null = null

  private commandShowChoices(params: unknown[]): ZCommandResult {
    const choices = params[0] as string[]
    this.bus.emit(ZEngineSignal.ShowChoices, { choices })
    return 'wait'
  }

  public submitChoice(index: number): void {
    this.pendingChoice = index
    this.resumeProcessing()
  }

  private commandWhen(
    params: unknown[],
    interpreter: { list: ZEventCommand[]; index: number }
  ): ZCommandResult {
    const choiceIndex = params[0] as number

    if (this.pendingChoice === choiceIndex) {
      return 'continue'
    } else {
      this.advanceToNextWhenOrEnd(interpreter)
      return 'continue'
    }
  }

  private commandConditionalBranch(
    params: unknown[],
    interpreter: { list: ZEventCommand[]; index: number }
  ): ZCommandResult {
    const gameState = this.game
    const type = params[0] as number
    let result = false

    if (type === 0) {
      const switchId = params[1] as number
      const requiredState = params[2] === 1
      const currentVal = gameState.getSwitch(switchId)
      result = currentVal === requiredState
    } else if (type === 1) {
      const varId = params[1] as number
      const neededVal = params[2] as number
      const currentVal = gameState.getVariable(varId)
      result = currentVal === neededVal
    }

    if (result) {
      return 'continue'
    } else {
      this.advanceToElseOrEnd(interpreter)
      return 'continue'
    }
  }

  private commandElse(
    _params: unknown[],
    interpreter: { list: ZEventCommand[]; index: number }
  ): ZCommandResult {
    this.advanceToEnd(interpreter)
    return 'continue'
  }

  private commandShowAnimation(): ZCommandResult {
    // TODO: Implement animation system
    return 'continue'
  }

  private commandSetEventDirection(
    params: unknown[],
    interpreter: { eventId: string }
  ): ZCommandResult {
    const direction = params[0] as 'down' | 'left' | 'right' | 'up'
    this.bus.emit(ZEngineSignal.EventInternalStateChanged, {
      eventId: interpreter.eventId,
      direction
    })
    return 'continue'
  }

  private commandSetEventGraphic(
    params: unknown[],
    interpreter: { eventId: string }
  ): ZCommandResult {
    const graphic = params[0] as ZEventGraphic
    this.bus.emit(ZEngineSignal.EventInternalStateChanged, {
      eventId: interpreter.eventId,
      graphic
    })
    return 'continue'
  }

  private commandSetMoveRoute(params: unknown[], interpreter: { eventId: string }): ZCommandResult {
    const targetId = params[0] as number // 0 = This Event, -1 = Player
    const route = params[1] as ZMoveCommand[]

    const eventId = targetId === 0 ? interpreter.eventId : targetId === -1 ? 'PLAYER' : null

    if (eventId) {
      this.bus.emit(ZEngineSignal.EventInternalStateChanged, {
        eventId,
        moveRoute: route
      })
    }

    return 'continue'
  }

  private advanceToElseOrEnd(interpreter: { list: ZEventCommand[]; index: number }): void {
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

  private advanceToEnd(interpreter: { list: ZEventCommand[]; index: number }): void {
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

  private advanceToNextWhenOrEnd(interpreter: { list: ZEventCommand[]; index: number }): void {
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

  private commandWait(params: unknown[], interpreter: { waitCount?: number }): ZCommandResult {
    const frames = (params[0] as number) || 60
    interpreter.waitCount = frames
    return 'wait'
  }
}
