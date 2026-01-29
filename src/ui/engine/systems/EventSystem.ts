import {
  ZSystem,
  type ZEvent,
  type ZEventPage,
  type ZEventCondition,
  type ZEventCommand,
  ZCommandCode,
  ZEngineSignal,
  ZEventTrigger,
  type ZCommandResult,
  type ZCommandProcessor
} from '@engine/types'
import { MapManager } from '@engine/managers/MapManager'
import { PlayerSystem } from './PlayerSystem'

import { ZEventBus } from '../core/ZEventBus'
import { ServiceLocator } from '../core/ServiceLocator'
import { SceneManager } from '../managers/SceneManager'
import { InputManager } from '../managers/InputManager'
import { GameStateManager } from '../managers/GameStateManager'

export class EventSystem extends ZSystem {
  private services: ServiceLocator
  private mapManager: MapManager
  // @ts-ignore - playerSystem is used for positioning (WIP)
  private playerSystem: PlayerSystem
  private sceneManager: SceneManager
  private eventBus: ZEventBus

  // Runtime state
  // @ts-ignore - isProcessing tracks interpreter status
  private isProcessing: boolean = false
  private activeInterpreter: {
    list: ZEventCommand[]
    index: number
    eventId: string
  } | null = null

  // Command Processor Registry
  private processors: Map<number, ZCommandProcessor> = new Map()

  constructor(services: ServiceLocator) {
    super()
    this.services = services
    this.mapManager = services.require(MapManager)
    this.eventBus = services.require(ZEventBus)

    // These will be retrieved lazily since they might not be registered yet
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
    // Lazily retrieve dependencies that might not have been registered during constructor
    this.sceneManager = this.services.require(SceneManager)
    this.playerSystem = this.services.require(PlayerSystem)

    this.eventBus.on(ZEngineSignal.EventTriggered, ({ event }) => {
      this.startEvent(event)
    })

    this.eventBus.on(ZEngineSignal.InteractionRequested, ({ x, y }) => {
      // 1. Check facing tile
      const handled = this.checkTrigger(x, y, ZEventTrigger.Action)
      if (handled) return

      // 2. Check under player (if facing tile yielded nothing)
      if (this.playerSystem) {
        this.checkTrigger(this.playerSystem.x, this.playerSystem.y, ZEventTrigger.Action)
      }
    })

    this.eventBus.on(ZEngineSignal.PlayerMoved, ({ x, y }) => {
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
    // Determine active page
    // For now, always take the first page that matches conditions
    // (Logic: higher index pages have higher priority)
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
    const gameState = this.services.require(GameStateManager)

    // 1. Switch 1
    if (conditions.switch1Id) {
      const val = gameState.getSwitch(Number(conditions.switch1Id))
      if (!val) return false
    }

    // 2. Switch 2
    if (conditions.switch2Id) {
      const val = gameState.getSwitch(Number(conditions.switch2Id))
      if (!val) return false
    }

    // 3. Variable >= Value
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
    if (this.isProcessing) return false // Don't interrupt

    const map = this.mapManager.currentMap
    if (!map) return false

    const event = map.events.find((e) => e.x === x && e.y === y)
    if (!event) return false

    // Find active page
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

    // Execute commands until one yields (wait) or list ends
    while (this.activeInterpreter.index < this.activeInterpreter.list.length) {
      const cmd = this.activeInterpreter.list[this.activeInterpreter.index]
      this.activeInterpreter.index++

      const result = this.executeCommand(cmd)
      if (result === 'wait') {
        // Don't clear activeInterpreter or isProcessing - we're waiting
        return // Stop processing this frame, but keep isProcessing = true
      }
      if (result === 'stop') {
        this.activeInterpreter = null
        this.isProcessing = false
        return
      }
      // If result is 'continue', loop continues to next command
    }

    // End of list - only reached if all commands executed without 'wait' or 'stop'
    this.activeInterpreter = null
    this.isProcessing = false
  }

  private executeCommand(cmd: ZEventCommand): ZCommandResult {
    const processor = this.processors.get(cmd.code)
    if (processor) {
      return processor(cmd.parameters)
    }

    // Unknown command, skip
    // console.warn(`[EventSystem] Unknown command code: ${cmd.code}`)
    return 'continue'
  }

  // Command 201: Transfer Player
  // Params: [mapId, x, y, direction?, fadeType?]
  private commandTransferPlayer(params: unknown[]): ZCommandResult {
    const mapId = params[0] as number
    const x = params[1] as number
    const y = params[2] as number
    // const direction = params[3]

    // Orchestrate transfer via SceneManager (handles fades and store sync)
    this.sceneManager.changeScene(mapId, x, y)

    return 'stop' // Stop processing current event (it will be destroyed on map switch)
  }

  // Command 101: Show Message
  // Params: [text, faceName?, faceIndex?]
  private commandShowMessage(params: unknown[]): ZCommandResult {
    const text = params[0] as string

    this.isWaitingForMessage = true

    // Emit signal for UI to show message
    this.eventBus.emit(ZEngineSignal.ShowMessage, { text })

    // Clear input keys to prevent immediate close
    // Clear input keys to prevent immediate close
    const inputManager = this.services.get(InputManager)
    if (inputManager) {
      inputManager.clearKey('Enter')
      inputManager.clearKey('Space')
      inputManager.clearKey('KeyZ')
    }

    return 'wait'
  }

  // Command 121: Control Switch
  // Params: [switchId, value (0=OFF, 1=ON, 2=TOGGLE)]
  private commandControlSwitch(params: unknown[]): ZCommandResult {
    const gameState = this.services.require(GameStateManager)
    const switchId = params[0] as number
    const operation = params[1] as number // 0=OFF, 1=ON, 2=TOGGLE

    if (operation === 0) {
      gameState.setSwitch(switchId, false)
    } else if (operation === 1) {
      gameState.setSwitch(switchId, true)
    } else if (operation === 2) {
      gameState.toggleSwitch(switchId)
    }

    return 'continue'
  }

  // Command 122: Control Variable
  // Params: [variableId, operation, value]
  // Operation: 0=Set, 1=Add, 2=Sub, 3=Mul, 4=Div, 5=Mod
  private commandControlVariable(params: unknown[]): ZCommandResult {
    const gameState = this.services.require(GameStateManager)
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

  // --- Show Choices Logic ---

  // State for active choice selection
  private pendingChoice: number | null = null

  // Command 102: Show Choices
  private commandShowChoices(params: unknown[]): ZCommandResult {
    const choices = params[0] as string[]
    // Emit event for UI to show choices
    this.eventBus.emit(ZEngineSignal.ShowChoices, { choices })
    return 'wait'
  }

  public submitChoice(index: number): void {
    this.pendingChoice = index
    this.resumeProcessing()
  }

  private commandWhen(params: unknown[]): ZCommandResult {
    const choiceIndex = params[0] as number

    // If this represents the choice the user made, enter.
    // Otherwise, skip to next When or EndChoices.

    if (this.pendingChoice === choiceIndex) {
      return 'continue'
    } else {
      this.advanceToNextWhenOrEnd()
      return 'continue'
    }
  }

  // Command 111: Conditional Branch
  // Params: [type, param1, param2]
  // Type 0: Switch [id, value(1=ON, 0=OFF)]
  // Type 1: Variable [id, op(0=Eq, 1=Ge, 2=Le...), value] (Simplified for now: 0=Eq, 1=Ge)
  private commandConditionalBranch(params: unknown[]): ZCommandResult {
    const gameState = this.services.require(GameStateManager)
    const type = params[0] as number
    let result = false

    if (type === 0) {
      // Switch
      const switchId = params[1] as number
      const requiredState = params[2] === 1 // 1=ON, 0=OFF
      const currentVal = gameState.getSwitch(switchId)
      result = currentVal === requiredState
    } else if (type === 1) {
      // Variable
      const varId = params[1] as number
      const neededVal = params[2] as number
      // For now, assuming check is "Equal or Greater" (Standard RPG Maker is usually Equal or >= depending on context, let's assume Equal for simplicity or add op param later)
      // Actually let's assume strict equality for now
      const currentVal = gameState.getVariable(varId)
      result = currentVal === neededVal
    }

    if (result) {
      // Condition Met: Enter the block (continue)
      return 'continue'
    } else {
      // Condition Failed: Skip to Else or EndBranch
      this.advanceToElseOrEnd()
      return 'continue'
    }
  }

  // Command 411: Else
  private commandElse(): ZCommandResult {
    // If we hit this command naturally, it means the "Then" block just finished.
    // So we must skip the "Else" block and go to EndBranch.
    this.advanceToEnd()
    return 'continue'
  }

  // Helper to skip to next Else or End (depth aware)
  private advanceToElseOrEnd(): void {
    if (!this.activeInterpreter) return
    let depth = 0
    const list = this.activeInterpreter.list

    // activeInterpreter.index is currently pointing to Next command (after the 111)
    // We scan from there
    while (this.activeInterpreter.index < list.length) {
      const cmd = list[this.activeInterpreter.index]

      if (cmd.code === ZCommandCode.ConditionalBranch) {
        depth++
      } else if (cmd.code === ZCommandCode.EndBranch) {
        if (depth === 0) {
          // Found our End. Stop here (index will be incremented by loop logic? No, we are manually modifying index)
          // Wait, if we return 'continue' from executeCommand, the loop in executeInterpreter will increment index AGAIN?
          // No, executeInterpreter loop: get cmd at index, index++, execute.
          // So if we are IN executeCommand, index is already at next.
          // So scanning from index is correct.
          // If we found End, we want to resume AFTER it? Or AT it?
          // EndBranch is a no-op, so executing it does nothing.
          // So we can set index to point AT it. The next loop cycle will execute EndBranch (no-op) and continue.
          // BUT, if we want to skip `Else`, we should stop AT `Else`.
          return
        }
        depth--
      } else if (cmd.code === ZCommandCode.Else) {
        if (depth === 0) {
          // Found our Else.
          this.activeInterpreter.index++ // Skip the Else command itself so we enter the Else block
          return
        }
      }

      this.activeInterpreter.index++
    }
  }

  // Helper to skip to End (ignoring Else, for Conditional Branch)
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
          return // Found End.
        }
        depth--
      }
      this.activeInterpreter.index++
    }
  }

  // Helper to advance to next 'When' or 'EndChoices' (for Show Choices)
  private advanceToNextWhenOrEnd(): void {
    if (!this.activeInterpreter) return
    let depth = 0
    const list = this.activeInterpreter.list

    while (this.activeInterpreter.index < list.length) {
      const cmd = list[this.activeInterpreter.index]

      if (cmd.code === ZCommandCode.ShowChoices) {
        // Nesting support
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
