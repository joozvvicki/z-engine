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
    this.sceneManager = null as any // Will be set in onBoot
    this.playerSystem = null as any // Will be set in onBoot

    this.registerCommands()
  }

  private registerCommands(): void {
    this.processors.set(ZCommandCode.TransferPlayer, this.commandTransferPlayer.bind(this))
    this.processors.set(ZCommandCode.ShowMessage, this.commandShowMessage.bind(this))
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
}
