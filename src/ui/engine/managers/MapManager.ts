import { ZMap, ZLayer } from '@engine/types'
import { TilesetManager } from './TilesetManager'
import { ServiceLocator } from '../core/ServiceLocator'

export class MapManager {
  public currentMap: ZMap | null = null
  private services: ServiceLocator

  constructor(services: ServiceLocator) {
    this.services = services
  }

  private get tilesetManager(): TilesetManager {
    return this.services.require(TilesetManager)
  }

  public setMap(map: ZMap): void {
    this.currentMap = map
  }

  public isPassable(x: number, y: number): boolean {
    if (!this.currentMap) return false

    // Check boundaries
    if (x < 0 || x >= this.currentMap.width || y < 0 || y >= this.currentMap.height) {
      return false
    }

    // Phase 1: STRICT LAYERS (Events, Decoration, Walls)
    const strictLayers = [ZLayer.events, ZLayer.decoration, ZLayer.walls]

    for (const layerKey of strictLayers) {
      const layer = this.currentMap.layers[layerKey]
      if (!layer) continue

      const tiles = layer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        for (const tile of tiles) {
          const tilesetUrl = this.currentMap.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
          const config = this.tilesetManager.getTileConfig(tilesetUrl, tile.x, tile.y)
          if (config?.isSolid) return false
        }
      }
    }

    // Phase 2: BRIDGE LAYER (Ground)
    const groundLayer = this.currentMap.layers[ZLayer.ground]
    if (groundLayer) {
      const tiles = groundLayer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        // Iterate Stack from TOP to BOTTOM
        for (let i = tiles.length - 1; i >= 0; i--) {
          const tile = tiles[i]
          if (!tile) continue
          const tilesetUrl = this.currentMap.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
          const config = this.tilesetManager.getTileConfig(tilesetUrl, tile.x, tile.y)

          // 1. Solid -> Blocked
          if (config?.isSolid) return false

          // 2. High Priority (Star) -> Ignore/Transparent (Look at tile below)
          if (config?.isHighPriority) {
            continue
          }

          // 3. Normal -> Bridge (Passable)
          return true
        }
      }
    }

    return true
  }

  // Check if moving from (x1,y1) to (x2,y2) is allowed
  public checkPassage(x: number, y: number, targetX: number, targetY: number): boolean {
    // 1. Check General Solidity first
    if (!this.isPassable(targetX, targetY)) return false

    // 2. Check Directional Blocking
    let bitLeaving = 0
    let bitEntering = 0

    if (targetY < y) {
      bitLeaving = 1 // Up
      bitEntering = 4 // From Down
    } else if (targetY > y) {
      bitLeaving = 4 // Down
      bitEntering = 1 // From Up
    } else if (targetX < x) {
      bitLeaving = 8 // Left
      bitEntering = 2 // From Right
    } else if (targetX > x) {
      bitLeaving = 2 // Right
      bitEntering = 8 // From Left
    }

    if (this.isDirectionBlocked(x, y, bitLeaving)) return false
    if (this.isDirectionBlocked(targetX, targetY, bitEntering)) return false

    return true
  }

  private isDirectionBlocked(x: number, y: number, dirBit: number): boolean {
    if (!this.currentMap) return false

    const layers = [ZLayer.decoration, ZLayer.walls, ZLayer.ground]

    for (const layerID of layers) {
      const layerStack = this.currentMap.layers[layerID]?.data[y]?.[x]
      if (!layerStack || layerStack.length === 0) continue

      for (let i = layerStack.length - 1; i >= 0; i--) {
        const tile = layerStack[i]
        if (!tile) continue
        const tilesetUrl = this.currentMap.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
        const config = this.tilesetManager.getTileConfig(tilesetUrl, tile.x, tile.y)

        if (config && config.dirBlock !== undefined) {
          if ((config.dirBlock & dirBit) !== 0) return true
        }
      }
    }
    return false
  }

  public getEventsAt(x: number, y: number): import('@engine/types').ZEvent[] {
    if (!this.currentMap) return []
    return this.currentMap.events.filter((e) => e.x === x && e.y === y)
  }
}
