/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZEngineSignal, type ZSignalData } from '@engine/types'

type ZSignalCallback<T extends keyof ZSignalData> = (data: ZSignalData[T]) => void

export class ZEventBus {
  private handlers: Map<ZEngineSignal, Set<ZSignalCallback<any>>> = new Map()

  public on<T extends keyof ZSignalData>(signal: T, callback: ZSignalCallback<T>): void {
    if (!this.handlers.has(signal as any)) {
      this.handlers.set(signal as any, new Set())
    }
    this.handlers.get(signal as any)!.add(callback)
  }

  public off<T extends keyof ZSignalData>(signal: T, callback: ZSignalCallback<T>): void {
    const set = this.handlers.get(signal as any)
    if (set) {
      set.delete(callback)
    }
  }

  public emit<T extends keyof ZSignalData>(signal: T, data: ZSignalData[T]): void {
    const set = this.handlers.get(signal as any)
    if (set) {
      set.forEach((cb) => cb(data))
    }
  }

  public once<T extends keyof ZSignalData>(signal: T, callback: ZSignalCallback<T>): void {
    const wrapper = (data: ZSignalData[T]): void => {
      this.off(signal, wrapper)
      callback(data)
    }
    this.on(signal, wrapper)
  }
}
