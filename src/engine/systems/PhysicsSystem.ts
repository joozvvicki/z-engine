import { ZLayer } from '@engine/types'
import { ZSystem, SystemMode } from '@engine/core/ZSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import type { PlayerSystem } from './PlayerSystem'
import type { EntityRenderSystem } from './EntityRenderSystem'

export class PhysicsSystem extends ZSystem {
  constructor(services: ServiceLocator) {
    super(services)
    this.updateMode = SystemMode.PLAY
  }

  public onBoot(): void {
    // No specific boot logic needed yet
  }

  public onUpdate(): void {
    // No continuous update needed yet, passive system
  }

  public isPassable(
    x: number,
    y: number,
    options?: { isThrough?: boolean; skipPlayer?: boolean }
  ): boolean {
    const map = this.map.currentMap
    if (!map) return false

    if (x < 0 || x >= map.width || y < 0 || y >= map.height) {
      return false
    }

    // Check Events (Collision Priority)
    // If an event is at (x,y) and is NOT through, it blocks regardless of tiles.
    // FIX: Only block if the event itself is NOT through
    const blockingEvent = map.events.find((e) => e.x === x && e.y === y && !e.isThrough)

    // If there is a blocking event, AND we (the mover) are not phantom, collision occurs.
    if (blockingEvent && !options?.isThrough) return false

    // Check moving event targets (via EntityRenderSystem)
    if (!options?.isThrough) {
      const entitySystem = this.services.get('EntityRenderSystem') as unknown as EntityRenderSystem
      if (entitySystem && entitySystem.isTileOccupiedByMovingEntity(x, y)) {
        return false
      }
    }

    // Check Player
    if (!options?.skipPlayer && !options?.isThrough) {
      const player = this.services.get('PlayerSystem') as unknown as PlayerSystem
      if (player && player.x === x && player.y === y) return false
      // Also check player target position if they are moving
      if (player && player.isMoving && player.targetX === x && player.targetY === y) return false
    }

    const strictLayers = [ZLayer.decoration, ZLayer.walls]

    for (const layerKey of strictLayers) {
      const layer = map.layers[layerKey]
      if (!layer) continue

      const tiles = layer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        for (const tile of tiles) {
          const tilesetUrl = map.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
          const config = this.tilesets.getTileConfig(tilesetUrl, tile.x, tile.y)
          if (config?.isSolid) {
            // Check if any event at this position is 'through'
            // If so, override tile solidity
            const isThroughEvent = map.events.some((e) => e.x === x && e.y === y && e.isThrough)
            if (!isThroughEvent && !options?.isThrough) return false
          }
        }
      }
    }

    const groundLayer = map.layers[ZLayer.ground]
    if (groundLayer) {
      const tiles = groundLayer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        for (let i = tiles.length - 1; i >= 0; i--) {
          const tile = tiles[i]
          if (!tile) continue
          const tilesetUrl = map.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
          const config = this.tilesets.getTileConfig(tilesetUrl, tile.x, tile.y)

          if (config?.isSolid) {
            const isThroughEvent = map.events.some((e) => e.x === x && e.y === y && e.isThrough)
            if (!isThroughEvent && !options?.isThrough) return false
          }

          if (config?.isHighPriority) {
            continue
          }

          return true
        }
      }
    }

    return true
  }

  // Check if moving from (x1,y1) to (x2,y2) is allowed
  public checkPassage(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    options?: { isThrough?: boolean; skipPlayer?: boolean }
  ): boolean {
    if (options?.isThrough) return true

    // 1. Check General Solidity first
    if (!this.isPassable(targetX, targetY, options)) return false

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
    const map = this.map.currentMap
    if (!map) return false

    const layers = [ZLayer.decoration, ZLayer.walls, ZLayer.ground]

    for (const layerID of layers) {
      const layerStack = map.layers[layerID]?.data[y]?.[x]
      if (!layerStack || layerStack.length === 0) continue

      for (let i = layerStack.length - 1; i >= 0; i--) {
        const tile = layerStack[i]
        if (!tile) continue
        const tilesetUrl = map.tilesetConfig?.[tile.tilesetId] || tile.tilesetId
        const config = this.tilesets.getTileConfig(tilesetUrl, tile.x, tile.y)

        if (config && config.dirBlock !== undefined) {
          if ((config.dirBlock & dirBit) !== 0) return true
        }
      }
    }
    return false
  }
}
