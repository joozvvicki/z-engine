export class InputManager {
  private keys: Map<string, boolean> = new Map()
  private lastKeys: Set<string> = new Set()

  constructor() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.set(e.code, true)
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.set(e.code, false)
  }

  public isKeyDown(code: string): boolean {
    return this.keys.get(code) || false
  }

  /**
   * Returns true only on the frame the key was pressed.
   */
  public isKeyJustPressed(code: string): boolean {
    return (this.keys.get(code) || false) && !this.lastKeys.has(code)
  }

  /**
   * Synchronizes the input state. Should be called once per frame.
   */
  public update(): void {
    this.lastKeys.clear()
    this.keys.forEach((isDown, code) => {
      if (isDown) {
        this.lastKeys.add(code)
      }
    })
  }

  public isAnyKeyDown(codes: string[]): boolean {
    return codes.some((code) => this.isKeyDown(code))
  }

  public clearKey(code: string): void {
    this.keys.set(code, false)
  }

  public destroy(): void {
    window.removeEventListener('keydown', (e) => this.onKeyDown(e))
    window.removeEventListener('keyup', (e) => this.onKeyUp(e))
  }
}
