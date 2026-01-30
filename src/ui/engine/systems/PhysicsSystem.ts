import { ZSystem, ZLayer } from '@engine/types'
import { MapManager } from '@engine/managers/MapManager'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { ServiceLocator } from '@engine/core/ServiceLocator'

export class PhysicsSystem extends ZSystem {
  private mapManager: MapManager
  private tilesetManager: TilesetManager

  constructor(services: ServiceLocator) {
    super()
    this.mapManager = services.require(MapManager)
    this.tilesetManager = services.require(TilesetManager)
  }

  public onBoot(): void {
    // No specific boot logic needed yet
  }

  public onUpdate(): void {
    // No continuous update needed yet, passive system
  }

  public isPassable(x: number, y: number): boolean {
    const map = this.mapManager.currentMap
    if (!map) return false

    // Check boundaries
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
      return false
    }

    // Phase 1: STRICT LAYERS (Events, Decoration, Walls)
    const strictLayers = [ZLayer.events, ZLayer.decoration, ZLayer.walls]

    for (const layerKey of strictLayers) {
      const layer = map.layers[layerKey]
      if (!layer) continue

      const tiles = layer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        for (const tile of tiles) {
          const tilesetUrl = map.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
          const config = this.tilesetManager.getTileConfig(tilesetUrl, tile.x, tile.y)
          if (config?.isSolid) return false
        }
      }
    }

    // Phase 2: BRIDGE LAYER (Ground)
    const groundLayer = map.layers[ZLayer.ground]
    if (groundLayer) {
      const tiles = groundLayer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        // Iterate Stack from TOP to BOTTOM
        for (let i = tiles.length - 1; i >= 0; i--) {
          const tile = tiles[i]
          if (!tile) continue
          const tilesetUrl = map.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
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
    const map = this.mapManager.currentMap
    if (!map) return false

    const layers = [ZLayer.decoration, ZLayer.walls, ZLayer.ground]

    for (const layerID of layers) {
      const layerStack = map.layers[layerID]?.data[y]?.[x]
      if (!layerStack || layerStack.length === 0) continue

      for (let i = layerStack.length - 1; i >= 0; i--) {
        const tile = layerStack[i]
        if (!tile) continue
        const tilesetUrl = map.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
        const config = this.tilesetManager.getTileConfig(tilesetUrl, tile.x, tile.y)

        if (config && config.dirBlock !== undefined) {
          if ((config.dirBlock & dirBit) !== 0) return true
        }
      }
    }
    return false
  }
}
