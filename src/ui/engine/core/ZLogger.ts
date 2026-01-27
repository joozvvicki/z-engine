const ZLogger = {
  log(...messages: string[]) {
    console.log(
      '%cZEngine',
      'background-color: #000000; border-radius: 4px; padding: 2px 4px; color: #ffffff',
      ...messages
    )
  },
  error(...messages: string[]) {
    console.error(
      '%cZEngine',
      'background-color: #ff0000; border-radius: 4px; padding: 2px 4px; color: #ffffff',
      ...messages
    )
  },
  warn(...messages: string[]) {
    console.warn(
      '%cZEngine',
      'background-color: #ffff00; border-radius: 4px; padding: 2px 4px; color: #000000',
      ...messages
    )
  },
  info(...messages: string[]) {
    console.info(
      '%cZEngine',
      'background-color: #00ffff; border-radius: 4px; padding: 2px 4px; color: #000000',
      ...messages
    )
  },
  with: (tag: string) => {
    return {
      log(...messages: string[]) {
        console.log(
          `%c${tag}`,
          'background-color: #00ff00; border-radius: 4px; padding: 2px 4px; color: #000000',
          ...messages
        )
      },
      error(...messages: string[]) {
        console.error(
          `%c${tag}`,
          'background-color: #ff0000; border-radius: 4px; padding: 2px 4px; color: #ffffff',
          ...messages
        )
      },
      warn(...messages: string[]) {
        console.warn(
          `%c${tag}`,
          'background-color: #ffff00; border-radius: 4px; padding: 2px 4px; color: #000000',
          ...messages
        )
      },
      info(...messages: string[]) {
        console.info(
          `%c${tag}`,
          'background-color: #00ffff; border-radius: 4px; padding: 2px 4px; color: #000000',
          ...messages
        )
      }
    }
  }
}

export default ZLogger
