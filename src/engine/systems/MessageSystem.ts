import { Container } from '@engine/utils/pixi'
import { ZEngineSignal, ZInputAction } from '@engine/types'
import { InputManager } from '@engine/managers/InputManager'
import { ZEventBus } from '@engine/core/ZEventBus'
import { EventSystem } from '@engine/systems/EventSystem'
import { TextureManager } from '@engine/managers/TextureManager'
import { Window_Message } from '@engine/ui/Window_Message'
import { Window_Choice } from '@engine/ui/Window_Choice'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'

/**
 * Manages the dialogue and choice window UI.
 * Refactored for Manual Dependency Injection.
 */
export class MessageSystem {
  // Dependencies
  private inputManager: InputManager
  private eventBus: ZEventBus
  private textureManager: TextureManager
  private eventSystem: EventSystem
  private entityRenderSystem: EntityRenderSystem

  public container: Container

  // UI Components
  private windowMessage: Window_Message | null = null
  private windowChoice: Window_Choice | null = null

  // State
  private isVisible: boolean = false
  private isClosing: boolean = false

  // Choice state
  private isChoiceVisible: boolean = false
  private choices: string[] = []
  private selectedChoiceIndex: number = 0

  private messageStyle: number = 0 // 0: Window, 1: Bubble
  private messageTargetId: string = '0'

  private boxWidth: number = 600
  private boxHeight: number = 140

  constructor(
    inputManager: InputManager,
    eventBus: ZEventBus,
    textureManager: TextureManager,
    eventSystem: EventSystem,
    entityRenderSystem: EntityRenderSystem
  ) {
    this.inputManager = inputManager
    this.eventBus = eventBus
    this.textureManager = textureManager
    this.eventSystem = eventSystem
    this.entityRenderSystem = entityRenderSystem

    this.container = new Container()
    this.container.visible = false
    this.container.zIndex = 100000

    this.setupListeners()
  }

  /**
   * Async initialization: Loads assets and builds UI windows.
   */
  public async init(): Promise<void> {
    const skinPath = 'img/system/window.png'

    // Ensure skin is loaded
    await this.textureManager.load(skinPath)
    const skin = this.textureManager.get(skinPath)

    if (skin) {
      // Message Window
      this.windowMessage = new Window_Message(0, 0, this.boxWidth, this.boxHeight)
      this.windowMessage.windowSkin = skin
      this.container.addChild(this.windowMessage)

      // Choice Window
      this.windowChoice = new Window_Choice(0, 0, 240, 0) // Height variable
      this.windowChoice.windowSkin = skin
      this.windowChoice.visible = false
      this.container.addChild(this.windowChoice)
    }
  }

  private setupListeners(): void {
    this.eventBus.on(ZEngineSignal.ShowMessage, ({ text, style, target }) => {
      this.show(text, style, target)
    })
    this.eventBus.on(ZEngineSignal.ShowChoices, ({ choices, style, target }) => {
      this.showChoices(choices, style, target)
    })
    this.eventBus.on(ZEngineSignal.MessageCloseDirective, () => {
      this.close()
    })
  }

  public onUpdate(): void {
    // Always update animations if system is active
    if (this.isVisible || this.isClosing) {
      this.windowMessage?.update()
      this.windowChoice?.update()

      if (this.isVisible && this.messageStyle === 1) {
        this.updateBubblePosition()
      }
    }

    if (this.isClosing) {
      // Wait for window to fully close
      if (this.windowMessage?.isClosed()) {
        this.finalizeClose()
      }
      return
    }

    if (this.isVisible) {
      if (this.windowMessage) this.windowMessage.refresh()

      if (this.isChoiceVisible) {
        this.updateChoiceSelection()
      } else {
        // Check for input to close message
        if (
          this.inputManager.isActionJustPressed(ZInputAction.OK) ||
          this.inputManager.isActionJustPressed(ZInputAction.CANCEL)
        ) {
          this.eventSystem.requestMessageAdvance()
        }
      }
    }
  }

  private updateChoiceSelection(): void {
    if (!this.windowChoice) return

    let changed = false
    if (this.inputManager.isActionJustPressed(ZInputAction.DOWN)) {
      this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % this.choices.length
      changed = true
    }
    if (this.inputManager.isActionJustPressed(ZInputAction.UP)) {
      this.selectedChoiceIndex =
        (this.selectedChoiceIndex - 1 + this.choices.length) % this.choices.length
      changed = true
    }

    if (changed) {
      this.windowChoice.select(this.selectedChoiceIndex)
    }

    if (this.inputManager.isActionJustPressed(ZInputAction.OK)) {
      const selectedIndex = this.selectedChoiceIndex

      // Close ONLY choice window, keep message window for now
      this.isChoiceVisible = false
      if (this.windowChoice) this.windowChoice.close()

      this.eventSystem.submitChoice(selectedIndex)

      this.eventBus.emit(ZEngineSignal.ChoiceSelected, { index: selectedIndex })
    }
  }

  private show(text: string, style: number = 0, targetId: number | string = 0): void {
    this.messageStyle = style
    this.messageTargetId = String(targetId)

    if (this.windowMessage) {
      if (style === 1) {
        // Bubble Mode Init
        this.windowMessage.setBubbleMode(true)
      } else {
        // Standard Mode
        this.windowMessage.setBubbleMode(false)
        this.resize(this.container.parent?.width || 800, this.container.parent?.height || 600)
      }

      this.windowMessage.setText(text)
      this.windowMessage.open()
    }
    this.isVisible = true
    this.isClosing = false
    this.container.visible = true
  }

  private showChoices(choices: string[], style: number = 0, targetId: number | string = 0): void {
    // If not already showing message in bubble mode, set params
    if (!this.isVisible) {
      this.messageStyle = style
      this.messageTargetId = String(targetId)
    }
    this.choices = choices
    this.selectedChoiceIndex = 0
    this.isChoiceVisible = true
    this.isVisible = true

    // Ensure message is open
    if (this.windowMessage && !this.windowMessage.isOpen()) {
      this.windowMessage.open()
    }

    if (this.windowChoice) {
      this.windowChoice.setChoices(choices)
      this.windowChoice.select(0)

      // Resize choice window
      const navHeight = choices.length * 36 + 36
      this.windowChoice.resize(240, navHeight)

      if (this.messageStyle === 1) {
        // Bubble Mode Positioning
        // Let updateBubblePosition handle the Y logic based on player position.
        // We just center X here as a default.
        const bubbleW = this.windowMessage?.width || 200
        this.windowChoice.x = (bubbleW - 240) / 2

        // Default to above (standard pivot logic: y = -height/2 means visual bottom at 0)
        this.windowChoice.y = -navHeight / 2
      } else {
        // Standard Mode Positioning
        // Position: Anchor bottom of choice window to top of message box
        // With pivot.y = height / 2, y = -height / 2 touches the top.
        this.windowChoice.x = this.boxWidth - 240
        this.windowChoice.y = -navHeight / 2
      }

      this.windowChoice.open()

      // Force update once to set position if bubble
      if (this.messageStyle === 1) {
        this.updateBubblePosition()
      }
    }

    this.container.visible = true
  }

  private close(): void {
    this.isClosing = true
    if (this.windowMessage) this.windowMessage.close()
    if (this.windowChoice) this.windowChoice.close()

    this.inputManager.clearAction(ZInputAction.OK)
    this.inputManager.clearAction(ZInputAction.CANCEL)
    this.inputManager.clearKey('Enter')
  }

  private finalizeClose(): void {
    this.isVisible = false
    this.isClosing = false
    this.isChoiceVisible = false

    this.container.visible = false

    this.eventBus.emit(ZEngineSignal.MessageClosed, {})

    // Notify logic system that message is done
    this.eventSystem.finishMessage()

    // Reset state to defaults
    this.messageStyle = 0
    this.messageTargetId = '0'
    if (this.windowMessage) {
      this.windowMessage.setBubbleMode(false)
      // Explicitly reset dimensions
      this.windowMessage.resize(this.boxWidth, this.boxHeight)
    }
    // Restore default resize
    this.resize(this.container.parent?.width || 800, this.container.parent?.height || 600)
  }

  public resize(width: number, height: number): void {
    this.container.x = (width - this.boxWidth) / 2
    this.container.y = height - this.boxHeight - 40
  }

  private updateBubblePosition(): void {
    // Resolve target
    let targetId = this.messageTargetId
    // 0 = This Event. Need to find which event triggered this.
    // However, MessageSystem doesn't know the triggerer directly unless we pass it.
    // For now, if 0, we can't do much unless we track 'activeEventId'
    // But usually '0' in Editor converts to Actual ID in Runtime via Interpreter?
    // Interpreter converts '0' to eventId when executing.
    // So 'targetId' passed here should be resolved ID.
    // If targetId is '0' here, it means 'This Event' but we received 0.
    // InterpreterSystem should resolve '0' to real ID before emitting ShowMessage.

    // We assume 'targetId' is valid Event ID or 'PLAYER' or '-1'

    if (targetId === '-1') targetId = 'PLAYER'
    if (targetId === '0') {
      // Fallback if not resolved: Center screen? Or do nothing?
      // In runtime, Interpreter handles this. ShowMessage signal should carry resolved ID.
      // checking index.ts ZEngineSignal.ShowMessage payload...
      return
    }

    const sprite = this.entityRenderSystem.getEntitySprite(targetId)
    if (sprite) {
      const pos = sprite.container.getGlobalPosition()

      // Center bubble above sprite
      // Sprite pivot is usually bottom-center (x=0.5, y=1) or similar.
      // CharacterSprite anchor is (0.5, 1). So pos is at feet.
      // We want bubble above head. tileSize approx.
      const headY = pos.y - sprite.container.height - 16 // Approx height

      // Convert to local if container parent is not global/stage (it is globalLayer)
      // globalLayer is at 0,0 usually.

      // Center X
      let targetX = pos.x - (this.windowMessage?.width || 0) / 2
      const playerSprite = this.entityRenderSystem.getEntitySprite('PLAYER')
      const playerPos = playerSprite?.container.getGlobalPosition()

      let targetY = headY - 10 - (this.windowMessage?.height || 0)

      // If player exists and is ABOVE the target event (player.y < target.y),
      // we generally look 'down' at the event, so showing bubble BELOW event might be better
      // to avoid covering the player or the space between them.
      // However, 'y' is feet position.
      if (playerPos && playerPos.y < pos.y) {
        // Player is "above" (physically higher Y on screen creates lower Y value in 2D typically,
        // but in standard 2D coords, 0 is top. So lower Y value = higher on screen).
        // If Player Y < Target Y, Player is visually higher.
        // User: "Jesli gracz jest nad eventem" -> Player Y < Event Y
        // User: "wyswietlac wiadomosc na dole" -> Bubble below event

        targetY = pos.y + 10 // Below feet
      } else {
        // Default: Above head
        // User: "Jesli gracz jest pod eventem" -> Player Y > Event Y
        // User: "wyswietlac nad glowka" -> Bubble above head
      }

      // Update Choice Window Position relative to flipped bubble
      if (this.windowChoice && this.windowChoice.visible) {
        const navHeight = this.windowChoice.height
        const messageH = this.windowMessage?.height || 0

        if (targetY > pos.y) {
          // Bubble is BELOW event
          // Choices should be BELOW bubble
          // Target Visual Top = messageH
          // y - h/2 = messageH => y = messageH + h/2
          this.windowChoice.y = messageH + navHeight / 2
        } else {
          // Bubble is ABOVE event
          // Choices should be ABOVE bubble
          // Target Visual Bottom = 0
          // y + h/2 = 0 => y = -h/2
          this.windowChoice.y = -navHeight / 2
        }
      }

      // Clamp to screen?
      // simple clamp
      const screenW = this.container.parent?.width || 800
      const screenH = this.container.parent?.height || 600

      targetX = Math.max(10, Math.min(targetX, screenW - (this.windowMessage?.width || 0) - 10))
      targetY = Math.max(10, Math.min(targetY, screenH - (this.windowMessage?.height || 0) - 10))

      this.container.x = targetX
      this.container.y = targetY
    }
  }

  public onDestroy(): void {
    this.container.destroy({ children: true })
  }
}
