import { ZEventBus } from '@engine/core/ZEventBus'
import { GameStateManager } from './GameStateManager'
import { ZDataProvider, GameSaveFile, ZEngineSignal } from '@engine/types'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { MapManager } from './MapManager'

export class SaveManager {
  private bus: ZEventBus
  private gameState: GameStateManager
  private player: PlayerSystem | null = null
  private map: MapManager | null = null
  private dataProvider: ZDataProvider | null = null

  constructor(bus: ZEventBus, gameState: GameStateManager) {
    this.bus = bus
    this.gameState = gameState
  }

  public registerSystems(player: PlayerSystem, map: MapManager): void {
    this.player = player
    this.map = map
  }

  public setDataProvider(provider: ZDataProvider): void {
    this.dataProvider = provider
  }

  public async saveGame(slotId: number): Promise<boolean> {
    if (!this.dataProvider || !this.player || !this.map) {
      console.warn('SaveManager: Missing dependencies for save.')
      return false
    }

    try {
      const data: GameSaveFile = {
        header: {
          timestamp: Date.now(),
          playtime: 0, // TODO: Implement playtime tracking
          version: '1.0.0'
        },
        player: this.player.getSaveData(),
        system: this.gameState.getSaveData() as any
      }

      await this.dataProvider.saveGame(slotId, data)
      console.log(`Game saved to slot ${slotId}`)
      return true
    } catch (e) {
      console.error('Failed to save game', e)
      return false
    }
  }

  public async loadGame(slotId: number): Promise<boolean> {
    if (!this.dataProvider) return false

    try {
      const data = await this.dataProvider.loadGame(slotId)
      if (!data) return false

      // 1. Load System State
      this.gameState.loadSaveData(data.system)

      // 2. Load Player State (Position, etc)
      if (this.player) {
        this.player.loadSaveData(data.player)
      }

      // 3. Request Transition
      this.bus.emit(ZEngineSignal.MapWillLoad, {
        mapId: data.player.mapId,
        map: null as any
      })

      return true
    } catch (e) {
      console.error('Failed to load game', e)
      return false
    }
  }

  public async doesSaveExist(slotId: number): Promise<boolean> {
    if (!this.dataProvider) return false
    return await this.dataProvider.doesSaveExist(slotId)
  }
}
