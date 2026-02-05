import { ZInputAction, ZInputMap } from '@engine/types'

export class InputManager {
  private keys: Map<string, boolean> = new Map()
  private lastKeys: Set<string> = new Set()

  private actionState: Map<ZInputAction, boolean> = new Map()
  private lastActionState: Map<ZInputAction, boolean> = new Map()

  private mappings: ZInputMap = {
    keyboard: {
      ArrowUp: ZInputAction.UP,
      KeyW: ZInputAction.UP,
      ArrowDown: ZInputAction.DOWN,
      KeyS: ZInputAction.DOWN,
      ArrowLeft: ZInputAction.LEFT,
      KeyA: ZInputAction.LEFT,
      ArrowRight: ZInputAction.RIGHT,
      KeyD: ZInputAction.RIGHT,
      Enter: ZInputAction.OK,
      Space: ZInputAction.OK,
      KeyZ: ZInputAction.OK,
      Escape: ZInputAction.CANCEL,
      Backspace: ZInputAction.CANCEL,
      KeyX: ZInputAction.CANCEL,
      ShiftLeft: ZInputAction.RUN,
      ShiftRight: ZInputAction.RUN,
      ControlLeft: ZInputAction.NOCLIP,
      ControlRight: ZInputAction.NOCLIP,
      F9: ZInputAction.DEBUG
    },
    gamepad: {
      12: ZInputAction.UP, // D-Pad Up
      13: ZInputAction.DOWN, // D-Pad Down
      14: ZInputAction.LEFT, // D-Pad Left
      15: ZInputAction.RIGHT, // D-Pad Right
      0: ZInputAction.OK, // A / Cross
      1: ZInputAction.CANCEL, // B / Circle
      2: ZInputAction.RUN // X / Square (Run?)
    }
  }

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return
    this.keys.set(e.code, true)
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.set(e.code, false)
  }

  // --- Legacy API (Deprecated but kept for compatibility) ---
  public isKeyDown(code: string): boolean {
    return this.keys.get(code) || false
  }

  // --- New Action API ---

  public isActionDown(action: ZInputAction): boolean {
    return this.actionState.get(action) || false
  }

  public isActionJustPressed(action: ZInputAction): boolean {
    return (this.actionState.get(action) || false) && !(this.lastActionState.get(action) || false)
  }

  /**
   * Synchronizes the input state. Should be called once per frame.
   */
  public update(): void {
    // 1. Snapshot previous frame states
    this.storeLastStates()

    // 2. Clear current frame action state (will be rebuilt from inputs)
    this.actionState.clear()

    // 3. Process Keyboard Inputs
    this.keys.forEach((isDown, code) => {
      if (isDown) {
        const action = this.mappings.keyboard[code]
        if (action) {
          this.actionState.set(action, true)
        }
      }
    })

    // 4. Process Gamepad Inputs
    this.pollGamepads()
  }

  private storeLastStates(): void {
    this.lastKeys.clear()
    this.keys.forEach((isDown, code) => {
      if (isDown) this.lastKeys.add(code)
    })

    this.lastActionState.clear()
    this.actionState.forEach((isDown, action) => {
      if (isDown) this.lastActionState.set(action, true)
    })
  }

  private pollGamepads(): void {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
    for (const gp of gamepads) {
      if (!gp) continue

      // Buttons
      gp.buttons.forEach((btn, index) => {
        if (btn.pressed) {
          const action = this.mappings.gamepad[index]
          if (action) {
            this.actionState.set(action, true)
          }
        }
      })

      // Axes (Left Stick)
      // Threshold 0.5
      const axisX = gp.axes[0]
      const axisY = gp.axes[1]

      if (axisY < -0.5) this.actionState.set(ZInputAction.UP, true)
      if (axisY > 0.5) this.actionState.set(ZInputAction.DOWN, true)
      if (axisX < -0.5) this.actionState.set(ZInputAction.LEFT, true)
      if (axisX > 0.5) this.actionState.set(ZInputAction.RIGHT, true)
    }
  }

  public isKeyJustPressed(code: string): boolean {
    return (this.keys.get(code) || false) && !this.lastKeys.has(code)
  }

  public isAnyKeyDown(codes: string[]): boolean {
    return codes.some((code) => this.isKeyDown(code))
  }

  public clearKey(code: string): void {
    this.keys.set(code, false)
    // Also clear mapped action if needed
    const action = this.mappings.keyboard[code]
    if (action !== undefined) {
      this.actionState.set(action, false)
    }
  }

  public clearAction(action: ZInputAction): void {
    this.actionState.set(action, false)
    this.lastActionState.set(action, false) // Also clear last state to be safe

    // Clear physical keys that map to this action
    for (const code in this.mappings.keyboard) {
      if (this.mappings.keyboard[code] === action) {
        this.keys.set(code, false)
      }
    }
    // Note: Gamepad buttons are polled, so they will be cleared in the next poll if physically released
  }

  public destroy(): void {
    window.removeEventListener('keydown', (e) => this.onKeyDown(e))
    window.removeEventListener('keyup', (e) => this.onKeyUp(e))
  }
}
