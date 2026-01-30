/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZEngineSignal, ZSignalData } from '@engine/types'

type ZSignalCallback<T extends ZEngineSignal> = (data: ZSignalData[T]) => void

export class ZEventBus {
  private handlers: Map<ZEngineSignal, Set<ZSignalCallback<any>>> = new Map()

  public on<T extends ZEngineSignal>(signal: T, callback: ZSignalCallback<T>): void {
    if (!this.handlers.has(signal)) {
      this.handlers.set(signal, new Set())
    }
    this.handlers.get(signal)!.add(callback)
  }

  public off<T extends ZEngineSignal>(signal: T, callback: ZSignalCallback<T>): void {
    const set = this.handlers.get(signal)
    if (set) {
      set.delete(callback)
    }
  }

  public emit<T extends ZEngineSignal>(signal: T, data: ZSignalData[T]): void {
    const set = this.handlers.get(signal)
    if (set) {
      set.forEach((cb) => cb(data))
    }
  }

  public once<T extends ZEngineSignal>(signal: T, callback: ZSignalCallback<T>): void {
    const wrapper = (data: ZSignalData[T]): void => {
      this.off(signal, wrapper)
      callback(data)
    }
    this.on(signal, wrapper)
  }
}
