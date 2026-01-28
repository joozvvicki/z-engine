export class InputManager {
  private keys: Map<string, boolean> = new Map()

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

  public isAnyKeyDown(codes: string[]): boolean {
    return codes.some((code) => this.isKeyDown(code))
  }

  public destroy(): void {
    window.removeEventListener('keydown', (e) => this.onKeyDown(e))
    window.removeEventListener('keyup', (e) => this.onKeyUp(e))
  }
}
