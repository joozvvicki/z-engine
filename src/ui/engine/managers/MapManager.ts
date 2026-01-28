import { ZMap, ZLayer } from '@engine/types'

export class MapManager {
  public currentMap: ZMap | null = null

  public setMap(map: ZMap): void {
    this.currentMap = map
  }

  public isPassable(x: number, y: number): boolean {
    if (!this.currentMap) return false

    // Check boundaries
    if (x < 0 || x >= this.currentMap.width || y < 0 || y >= this.currentMap.height) {
      return false
    }

    // Simple collision check - walls layer
    // In future this will check collisions bits, regions etc.
    const wallsLayer = this.currentMap.layers[ZLayer.walls]
    if (!wallsLayer) return true

    const stack = wallsLayer.data[y][x]
    // If there is ANY tile on 'walls' layer, it is impassable
    if (stack && stack.length > 0) {
      return false
    }

    // Check ALL layers for "Solid" flag in TilesetConfig
    if (this.tilesetConfigs) {
      // Explicit order check: Top to Bottom (visual priority)
      // Actually for blocking it doesn't matter, if any layer has a solid tile, we block.
      const layersToCheck = [
        ZLayer.roofs,
        ZLayer.events,
        ZLayer.trees,
        ZLayer.decoration,
        ZLayer.walls,
        ZLayer.ground
      ]

      for (const layerKey of layersToCheck) {
        const layer = this.currentMap.layers[layerKey]
        if (!layer) continue

        const tiles = layer.data[y]?.[x]
        if (tiles && tiles.length > 0) {
          for (const tile of tiles) {
            // tile.x/y are Source Coords (ox/oy)
            const configKey = `${tile.x}_${tile.y}`
            // Safety check for tilesetId
            const tilesetConfig = this.tilesetConfigs[tile.tilesetId]

            const config = tilesetConfig?.[configKey]

            // Debug Logs - TRACE
            // if (config) console.log(`[MapManager] Check ${x},${y} Layer: ${layerKey} ID:${tile.tilesetId} Key:${configKey} Solid:${config.isSolid}`)

            if (config?.isSolid) {
              console.log(
                `[Collision] BLOCKED at ${x},${y} by ${layerKey} Tile: ${tile.tilesetId}:${configKey}`
              )
              return false
            }
          }
        }
      }
    } else {
      console.warn('[Collision] No Tileset Configs loaded in MapManager!')
    }

    return true
  }

  private tilesetConfigs: Record<
    string,
    Record<string, { isSolid: boolean; isHighPriority: boolean; collisionMask?: boolean[] }>
  > | null = null

  public setTilesetConfigs(
    configs: Record<
      string,
      Record<string, { isSolid: boolean; isHighPriority: boolean; collisionMask?: boolean[] }>
    >
  ): void {
    // console.log('MapManager received configs:', Object.keys(configs).length, configs)
    this.tilesetConfigs = configs
  }

  public getTilesetConfigs(): Record<
    string,
    Record<string, { isSolid: boolean; isHighPriority: boolean; collisionMask?: boolean[] }>
  > | null {
    return this.tilesetConfigs
  }
}
