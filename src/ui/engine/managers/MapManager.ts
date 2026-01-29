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
    Record<
      string,
      { isSolid: boolean; isHighPriority: boolean; collisionMask?: boolean[]; dirBlock: number }
    >
  > | null = null

  public setTilesetConfigs(
    configs: Record<
      string,
      Record<
        string,
        { isSolid: boolean; isHighPriority: boolean; collisionMask?: boolean[]; dirBlock: number }
      >
    >
  ): void {
    // console.log('MapManager received configs:', Object.keys(configs).length, configs)
    this.tilesetConfigs = configs
  }

  public getTilesetConfigs(): Record<
    string,
    Record<
      string,
      {
        isSolid: boolean
        isHighPriority: boolean
        collisionMask?: boolean[]
        sortYOffset?: number
        dirBlock?: number
      }
    >
  > | null {
    return this.tilesetConfigs
  }

  // Check if moving from (x1,y1) to (x2,y2) is allowed
  // Considers:
  // 1. Target tile passability (Solid/Bridge rules) - via isPassable(x2, y2)
  // 2. Directional blocking on Source Tile (Cannot leave)
  // 3. Directional blocking on Target Tile (Cannot enter)
  public checkPassage(x1: number, y1: number, x2: number, y2: number): boolean {
    // 1. Base Passability (Target must be walkable)
    if (!this.isPassable(x2, y2)) return false

    // 2. Directional Check
    // Determine direction
    const dx = x2 - x1
    const dy = y2 - y1

    if (dx === 0 && dy === 0) return true // Same tile

    // Bitmasks: 1=Up, 2=Right, 4=Down, 8=Left
    let dirBit = 0
    let oppBit = 0

    if (dy === -1) {
      // UP
      dirBit = 1
      oppBit = 4
    } else if (dx === 1) {
      // RIGHT
      dirBit = 2
      oppBit = 8
    } else if (dy === 1) {
      // DOWN
      dirBit = 4
      oppBit = 1
    } else if (dx === -1) {
      // LEFT
      dirBit = 8
      oppBit = 2
    }

    if (dirBit === 0) return true // Diagonals or jumps? Assume allowed for now if isPassable passed.

    // Check Source Tile (Can I leave?)
    if (this.isDirBlocked(x1, y1, dirBit)) return false

    // Check Target Tile (Can I enter?)
    // Note: If I walk INTO a tile that blocks 'Down', enables entering from top?
    // Convention: If a tile blocks 'Up' (1), it means there is a wall on its Top Edge.
    // So you cannot Leave Up, AND you cannot Enter from Up (move Down into it).
    // Wait, let's stick to standard RPG Maker convention usually:
    // Block D means "Passage" setting.
    // X (Solid) = No passage.
    // Dir Block = Specific passage denied.
    // Typically, 'Dir Block Up' means you cannot pass the Up boundary.
    // So checking Source.Up is correct.
    // Checking Target.Down (the boundary we are crossing from the other side) is also correct.
    if (this.isDirBlocked(x2, y2, oppBit)) return false

    return true
  }

  private isDirBlocked(x: number, y: number, bit: number): boolean {
    if (!this.currentMap || !this.tilesetConfigs) return false

    // Check all layers (Top-Down) for any directional block
    // OR should we only check the "active" ground layer?
    // RPG Maker checks top-most effective tile.

    // Let's use Top-Down similar to isPassable.
    // However, for DirBlock, usually it's "If ANY tile blocks this specific direction, it is blocked"?
    // OR "The tile that determines passability determines dir block"?

    // Let's go with: The highest priority tile that has ANY config (Solid/Passable/Dir) dictates rules?
    // No, standard approach:
    // Iterate Top-Down.
    // If we find a config:
    //   If it defines dirBlock, use it.
    //   If it is Passable (Bridge), it overrides lower blocks?
    //   If it is Solid, we wouldn't be here (handled by isPassable).

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
        for (let i = tiles.length - 1; i >= 0; i--) {
          const tile = tiles[i]
          const configKey = `${tile.x}_${tile.y}`
          const config = this.tilesetConfigs[tile.tilesetId]?.[configKey]

          if (config) {
            if (config.isHighPriority) continue // Ignore stars

            // Found effective tile (Bridge or Ground)
            if (config.dirBlock !== undefined) {
              return (config.dirBlock & bit) === bit
            }
            // If config exists but no dirBlock, assumed 0 (Open)
            return false
          }
        }
      }
    }

    return false
  }
}
