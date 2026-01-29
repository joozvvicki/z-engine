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

    if (!this.tilesetConfigs) {
      console.warn('[Collision] No Tileset Configs loaded in MapManager!')
      // Default to passable if no configs? Or logic fallback?
      // Without configs, we can't know what is solid.
      return true
    }

    // Top-Down Override Logic
    // 1. Iterate layers from Highest Visual Priority to Lowest.
    // 2. Inside each layer, iterate Stack from Top to Bottom.
    // 3. Logic:
    //    - If isSolid (X) -> Return FALSE (Blocked). Topmost solid wins.
    //    - If isHighPriority (Star) -> CONTINUE (Ignore). "Overhead" tile, look below.
    //    - If !isSolid && !isHighPriority (O) -> Return TRUE (Passable). Topmost walkable wins (Bridge).

    const layersToCheck = [
      ZLayer.roofs,
      ZLayer.events,
      ZLayer.trees,
      ZLayer.decoration,
      ZLayer.walls, // Note: Previous hardcoded 'walls layer block' is removed in favor of config
      ZLayer.ground
    ]

    for (const layerKey of layersToCheck) {
      const layer = this.currentMap.layers[layerKey]
      if (!layer) continue

      const tiles = layer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        // Iterate Stack from TOP (End) to BOTTOM (Start)
        for (let i = tiles.length - 1; i >= 0; i--) {
          const tile = tiles[i]
          const configKey = `${tile.x}_${tile.y}`
          const tilesetConfig = this.tilesetConfigs[tile.tilesetId]
          const config = tilesetConfig?.[configKey]

          // 1. Solid (X)
          if (config?.isSolid) {
            // console.log(`[Collision] BLOCKED at ${x},${y} by ${layerKey} Tile: ${tile.tilesetId}:${configKey}`)
            return false
          }

          // 2. High Priority (Star)
          if (config?.isHighPriority) {
            // Treat as transparent for collision (e.g. tree top)
            // Continue checking tiles below
            continue
          }

          // 3. Normal / Passable (O)
          // Found a tile that exists, is NOT solid, and NOT ignored.
          // This represents a walkable surface (Ground, Bridge).
          // Since it's above anything else processed so far (or matches), it overrides lower layers.
          // console.log(`[Collision] PASSABLE at ${x},${y} on ${layerKey} Tile: ${tile.tilesetId}:${configKey}`)
          return true
        }
      }
    }

    // Default: If no tiles found (empty void) or all were Stars, return TRUE?
    // Usually empty map is walkable or void?
    // Let's assume TRUE for now (Ground 0 is passable).
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
    Record<
      string,
      { isSolid: boolean; isHighPriority: boolean; collisionMask?: boolean[]; sortYOffset?: number }
    >
  > | null {
    return this.tilesetConfigs
  }
}
