import {
  type ZEvent,
  type ZEventPage,
  type ZEventCondition,
  type ZEventCommand,
  type ZCommandResult,
  type ZCommandProcessor,
  ZCommandCode,
  ZEngineSignal,
  ZEventTrigger
} from '@engine/types'
import { ZSystem as ZSystemCore, SystemMode } from '@engine/core/ZSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'

import { ServiceLocator } from '@engine/core/ServiceLocator'
import { SceneManager } from '@engine/managers/SceneManager'
import { Scene_Map } from '@engine/scenes/Scene_Map'

export class EventSystem extends ZSystemCore {
  private playerSystem: PlayerSystem
  private sceneManager: SceneManager

  private isProcessing: boolean = false
  private activeInterpreter: {
    list: ZEventCommand[]
    index: number
    eventId: string
  } | null = null

  private processors: Map<number, ZCommandProcessor> = new Map()

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
    this.processors.set(ZCommandCode.ConditionalBranch, this.commandConditionalBranch.bind(this))
    this.processors.set(ZCommandCode.Else, this.commandElse.bind(this))
    this.processors.set(ZCommandCode.EndBranch, () => 'continue')
    this.processors.set(ZCommandCode.ShowChoices, this.commandShowChoices.bind(this))
    this.processors.set(ZCommandCode.When, this.commandWhen.bind(this))
    this.processors.set(ZCommandCode.EndChoices, () => 'continue')
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
    if (this.activeInterpreter && !this.isWaitingForMessage) {
      this.executeInterpreter()
    }
  }

  private isWaitingForMessage: boolean = false

  public finishMessage(): void {
    this.isWaitingForMessage = false
  }

  public startEvent(event: ZEvent): void {
    let activePage: ZEventPage | null = null
    for (let i = event.pages.length - 1; i >= 0; i--) {
      const page = event.pages[i]
      if (this.checkPageConditions(page.conditions)) {
        activePage = page
        break
      }
    }

    if (!activePage) return

    if (activePage.list && activePage.list.length > 0) {
      this.activeInterpreter = {
        list: activePage.list,
        index: 0,
        eventId: event.id
      }
      this.isProcessing = true
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

    // 4. TODO: Self Switch
    // 5. TODO: Item
    // 6. TODO: Actor

    return true
  }

  public checkTrigger(x: number, y: number, trigger: ZEventTrigger): boolean {
    if (this.isProcessing) return false

    const map = this.map.currentMap
    if (!map) return false

    const event = map.events.find((e) => e.x === x && e.y === y)
    if (!event) return false

    let activePage: ZEventPage | null = null
    for (let i = event.pages.length - 1; i >= 0; i--) {
      const page = event.pages[i]
      if (this.checkPageConditions(page.conditions)) {
        activePage = page
        break
      }
    }

    if (activePage && activePage.trigger === trigger) {
      this.startEvent(event)
      return true
    }
    return false
  }

  private executeInterpreter(): void {
    if (!this.activeInterpreter) return

    while (this.activeInterpreter.index < this.activeInterpreter.list.length) {
      const cmd = this.activeInterpreter.list[this.activeInterpreter.index]
      this.activeInterpreter.index++

      const result = this.executeCommand(cmd)
      if (result === 'wait') {
        return
      }
      if (result === 'stop') {
        this.activeInterpreter = null
        this.isProcessing = false
        return
      }
    }

    this.activeInterpreter = null
    this.isProcessing = false
  }

  private executeCommand(cmd: ZEventCommand): ZCommandResult {
    const processor = this.processors.get(cmd.code)
    if (processor) {
      return processor(cmd.parameters)
    }

    return 'continue'
  }

  private commandTransferPlayer(params: unknown[]): ZCommandResult {
    const mapId = params[0] as number
    const x = params[1] as number
    const y = params[2] as number
    this.sceneManager.goto(Scene_Map, { mapOrId: mapId, playerX: x, playerY: y })

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

  private commandWhen(params: unknown[]): ZCommandResult {
    const choiceIndex = params[0] as number

    if (this.pendingChoice === choiceIndex) {
      return 'continue'
    } else {
      this.advanceToNextWhenOrEnd()
      return 'continue'
    }
  }

  private commandConditionalBranch(params: unknown[]): ZCommandResult {
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
      this.advanceToElseOrEnd()
      return 'continue'
    }
  }

  private commandElse(): ZCommandResult {
    this.advanceToEnd()
    return 'continue'
  }

  private advanceToElseOrEnd(): void {
    if (!this.activeInterpreter) return
    let depth = 0
    const list = this.activeInterpreter.list

    while (this.activeInterpreter.index < list.length) {
      const cmd = list[this.activeInterpreter.index]

      if (cmd.code === ZCommandCode.ConditionalBranch) {
        depth++
      } else if (cmd.code === ZCommandCode.EndBranch) {
        if (depth === 0) {
          return
        }
        depth--
      } else if (cmd.code === ZCommandCode.Else) {
        if (depth === 0) {
          this.activeInterpreter.index++
          return
        }
      }

      this.activeInterpreter.index++
    }
  }

  private advanceToEnd(): void {
    if (!this.activeInterpreter) return
    let depth = 0
    const list = this.activeInterpreter.list

    while (this.activeInterpreter.index < list.length) {
      const cmd = list[this.activeInterpreter.index]

      if (cmd.code === ZCommandCode.ConditionalBranch) {
        depth++
      } else if (cmd.code === ZCommandCode.EndBranch) {
        if (depth === 0) {
          return
        }
        depth--
      }
      this.activeInterpreter.index++
    }
  }

  private advanceToNextWhenOrEnd(): void {
    if (!this.activeInterpreter) return
    let depth = 0
    const list = this.activeInterpreter.list

    while (this.activeInterpreter.index < list.length) {
      const cmd = list[this.activeInterpreter.index]

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
      this.activeInterpreter.index++
    }
  }
}
