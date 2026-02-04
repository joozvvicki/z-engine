import ZLogger from '@engine/utils/ZLogger'
import { ZAudioConfig } from '@engine/types'

// type AudioChannel = 'bgm' | 'bgs' | 'me' | 'se'

export class AudioManager {
  // private services: ServiceLocator
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null

  // Channels
  private bgmGain: GainNode | null = null
  private bgmSource: AudioBufferSourceNode | null = null
  private currentBgm: ZAudioConfig | null = null

  private bgsGain: GainNode | null = null
  private bgsSource: AudioBufferSourceNode | null = null
  private currentBgs: ZAudioConfig | null = null

  private seGain: GainNode | null = null

  // Cache
  private buffers: Map<string, AudioBuffer> = new Map()

  // State
  private _masterVolume: number = 1.0
  private _bgmVolume: number = 1.0
  private _seVolume: number = 1.0

  constructor() {
    // Defer context creation to first user interaction or explicit init
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.context = new AudioContextClass()
      this.masterGain = this.context.createGain()
      this.masterGain.connect(this.context.destination)

      // Setup Channel Gains
      this.bgmGain = this.context.createGain()
      this.bgmGain.connect(this.masterGain)

      this.bgsGain = this.context.createGain()
      this.bgsGain.connect(this.masterGain)

      this.seGain = this.context.createGain()
      this.seGain.connect(this.masterGain)

      ZLogger.with('AudioManager').log('Audio Context Initialized')
    } catch {
      ZLogger.with('AudioManager').error('Web Audio API not supported')
    }

    // Auto-resume on interaction
    const unlock = (): void => {
      if (this.context && this.context.state === 'suspended') {
        this.context.resume().then(() => {
          ZLogger.with('AudioManager').log('Audio Context Resumed')
          window.removeEventListener('click', unlock)
          window.removeEventListener('keydown', unlock)
          window.removeEventListener('touchstart', unlock)
        })
      }
    }

    window.addEventListener('click', unlock)
    window.addEventListener('keydown', unlock)
    window.addEventListener('touchstart', unlock)
  }

  public async playBgm(config: ZAudioConfig, fadeOutPrevious: number = 0): Promise<void> {
    if (!this.context || !this.bgmGain) return
    if (this.currentBgm?.name === config.name) return // Already playing

    // Fade out old
    if (this.bgmSource && fadeOutPrevious > 0) {
      this.fadeOutBgm(fadeOutPrevious)
    } else {
      this.stopBgm()
    }

    this.currentBgm = config
    const buffer = await this.loadBuffer(config.name)
    if (!buffer) return

    this.bgmSource = this.context.createBufferSource()
    this.bgmSource.buffer = buffer
    this.bgmSource.loop = true
    this.bgmSource.detune.value = (config.pitch - 100) * 10 // rough approximation

    // Reset volume (in case it was faded out)
    this.bgmGain.gain.cancelScheduledValues(this.context.currentTime)
    this.bgmGain.gain.setValueAtTime(
      (config.volume / 100) * this._bgmVolume,
      this.context.currentTime
    )

    this.bgmSource.connect(this.bgmGain)
    this.bgmSource.start(0)
  }

  public fadeOutBgm(duration: number): void {
    if (!this.context || !this.bgmGain || !this.bgmSource) return
    const now = this.context.currentTime
    this.bgmGain.gain.cancelScheduledValues(now)
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now)
    this.bgmGain.gain.linearRampToValueAtTime(0, now + duration)

    // Stop after fade
    const oldSource = this.bgmSource
    setTimeout(() => {
      try {
        oldSource.stop()
      } catch {
        /* ignore */
      }
    }, duration * 1000)

    this.bgmSource = null
    this.currentBgm = null
  }

  public stopBgm(): void {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop()
      } catch {
        /* ignore */
      }
      this.bgmSource = null
    }
    this.currentBgm = null
  }

  public async playBgs(config: ZAudioConfig, fadeOutPrevious: number = 0): Promise<void> {
    if (!this.context || !this.bgsGain) return
    if (this.currentBgs?.name === config.name) return

    if (this.bgsSource && fadeOutPrevious > 0) {
      this.fadeOutBgs(fadeOutPrevious)
    } else {
      this.stopBgs()
    }

    this.currentBgs = config
    const buffer = await this.loadBuffer(config.name)
    if (!buffer) return

    this.bgsSource = this.context.createBufferSource()
    this.bgsSource.buffer = buffer
    this.bgsSource.loop = true
    this.bgsSource.detune.value = (config.pitch - 100) * 10

    this.bgsGain.gain.cancelScheduledValues(this.context.currentTime)
    this.bgsGain.gain.setValueAtTime(
      (config.volume / 100) * this._masterVolume,
      this.context.currentTime
    )

    this.bgsSource.connect(this.bgsGain)
    this.bgsSource.start(0)
  }

  public stopBgs(): void {
    if (this.bgsSource) {
      try {
        this.bgsSource.stop()
      } catch {
        /* ignore */
      }
      this.bgsSource = null
    }
    this.currentBgs = null
  }

  public fadeOutBgs(duration: number): void {
    if (!this.context || !this.bgsGain || !this.bgsSource) return
    const now = this.context.currentTime
    this.bgsGain.gain.cancelScheduledValues(now)
    this.bgsGain.gain.setValueAtTime(this.bgsGain.gain.value, now)
    this.bgsGain.gain.linearRampToValueAtTime(0, now + duration)

    const oldSource = this.bgsSource
    setTimeout(() => {
      try {
        oldSource.stop()
      } catch {
        /* ignore */
      }
    }, duration * 1000)

    this.bgsSource = null
    this.currentBgs = null
  }

  public async playSe(config: ZAudioConfig): Promise<void> {
    if (!this.context || !this.seGain) return

    const buffer = await this.loadBuffer(config.name)
    if (!buffer) return

    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.loop = false
    source.detune.value = (config.pitch - 100) * 10

    const volumeNode = this.context.createGain()
    volumeNode.gain.value = (config.volume / 100) * this._seVolume

    source.connect(volumeNode)
    volumeNode.connect(this.seGain)

    source.start(0)
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    // Add audio/ prefix if not present (simple convention)
    // In a real app we might rely on DataProvider to resolve this
    const fullUrl = url.startsWith('http') || url.startsWith('file') ? url : `audio/${url}`

    if (this.buffers.has(fullUrl)) {
      return this.buffers.get(fullUrl)!
    }

    try {
      // NOTE: In the editor context, we might need to use a special loader or file protocol
      // For now assuming standard fetch works or proxy
      const response = await fetch(fullUrl)
      if (!response.ok) throw new Error(`Failed to load audio: ${url}`)
      const arrayBuffer = await response.arrayBuffer()
      if (!this.context) return null

      const audioBuffer = await this.context.decodeAudioData(arrayBuffer)
      this.buffers.set(fullUrl, audioBuffer)
      return audioBuffer
    } catch (e) {
      ZLogger.with('AudioManager').error(`Failed to load buffer: ${url}`, e)
      return null
    }
  }
}
