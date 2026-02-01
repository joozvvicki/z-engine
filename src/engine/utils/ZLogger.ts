class ZLogger {
  private tag: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isDebugging: boolean = (import.meta as any).env?.DEV

  public log: (...messages: unknown[]) => void
  public error: (...messages: unknown[]) => void
  public warn: (...messages: unknown[]) => void
  public info: (...messages: unknown[]) => void
  public debug: (...messages: unknown[]) => void

  constructor(tag: string) {
    this.tag = tag

    const noop = (): void => {}

    if (this.isDebugging) {
      this.log = console.log.bind(
        console,
        `%c${this.tag}`,
        'background-color: #00ffaa; border-radius: 4px; padding: 2px 4px; color: #000'
      )
      this.error = console.error.bind(
        console,
        `%c${this.tag}`,
        'background-color: #ad0000; border-radius: 4px; padding: 2px 4px; color: #fff'
      )
      this.warn = console.warn.bind(
        console,
        `%c${this.tag}`,
        'background-color: #ffcc00; border-radius: 4px; padding: 2px 4px; color: #000'
      )
      this.info = console.info.bind(
        console,
        `%c${this.tag}`,
        'background-color: #00aaff; border-radius: 4px; padding: 2px 4px; color: #fff'
      )
      this.debug = console.debug.bind(
        console,
        `%c${this.tag}`,
        'background-color: #00aaff; border-radius: 4px; padding: 2px 4px; color: #fff'
      )
    } else {
      this.log = noop
      this.error = noop
      this.warn = noop
      this.info = noop
      this.debug = noop
    }
  }

  with(tag: string): ZLogger {
    return new ZLogger(tag)
  }
}

export default new ZLogger('Z Engine')
