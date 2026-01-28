class ZLogger {
  private tag: string = 'Z Engine'
  private isDebugging: boolean = import.meta.env.DEV

  log(...messages: unknown[]): void {
    if (!this.isDebugging) return
    console.log(
      `%c${this.tag}`,
      'background-color: #00ffaa; border-radius: 4px; padding: 2px 4px; color: #000',
      ...messages
    )
  }
  error(...messages: unknown[]): void {
    if (!this.isDebugging) return
    console.error(
      `%c${this.tag}`,
      'background-color: #ad0000; border-radius: 4px; padding: 2px 4px; color: #fff',
      ...messages
    )
  }
  warn(...messages: unknown[]): void {
    if (!this.isDebugging) return
    console.warn(
      `%c${this.tag}`,
      'background-color: #ffcc00; border-radius: 4px; padding: 2px 4px; color: #000',
      ...messages
    )
  }
  info(...messages: unknown[]): void {
    if (!this.isDebugging) return
    console.info(
      `%c${this.tag}`,
      'background-color: #00aaff; border-radius: 4px; padding: 2px 4px; color: #fff',
      ...messages
    )
  }
  with(tag: string): ZLogger {
    this.tag = tag
    return this
  }
}

export default new ZLogger()
