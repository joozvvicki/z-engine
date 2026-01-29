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
      // console.warn('[Collision] No Tileset Configs loaded in MapManager!')
      return true
    }

    // Phase 1: STRICT LAYERS (Events, Decoration, Walls)
    // If ANY tile in these layers is Solid, we Block immediately.
    // Non-solid tiles are ignored (Transparent), letting us check layers below.
    // NOTE: ZLayer.highest is EXCLUDED. It is a visual-only layer (like a roof above everything).
    const strictLayers = [ZLayer.events, ZLayer.decoration, ZLayer.walls]

    for (const layerKey of strictLayers) {
      const layer = this.currentMap.layers[layerKey]
      if (!layer) continue

      const tiles = layer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        for (const tile of tiles) {
          const configKey = `${tile.x}_${tile.y}`
          const config = this.tilesetConfigs[tile.tilesetId]?.[configKey]
          if (config?.isSolid) return false
        }
      }
    }

    // Phase 2: BRIDGE LAYER (Ground)
    // Here we use Top-Down Override logic.
    const groundLayer = this.currentMap.layers[ZLayer.ground]
    if (groundLayer) {
      const tiles = groundLayer.data[y]?.[x]
      if (tiles && tiles.length > 0) {
        // Iterate Stack from TOP to BOTTOM
        for (let i = tiles.length - 1; i >= 0; i--) {
          const tile = tiles[i]
          const configKey = `${tile.x}_${tile.y}`
          const config = this.tilesetConfigs[tile.tilesetId]?.[configKey]

          // 1. Solid -> Blocked
          if (config?.isSolid) return false

          // 2. High Priority (Star) -> Ignore/Transparent (Look at tile below)
          if (config?.isHighPriority) {
            continue
          }

          // 3. Normal -> Bridge (Passable)
          // This tile overrides whatever is below it (e.g. Bridge over Water)
          return true
        }
      }
    }

    // Default: Return TRUE (Open Void)
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
  public checkPassage(x: number, y: number, targetX: number, targetY: number): boolean {
    // 1. Check General Solidity first (quick fail)
    if (!this.isPassable(targetX, targetY)) return false

    // 2. Check Directional Blocking
    // Moving from (x,y) to (targetX, targetY)
    const configs = this.tilesetConfigs
    if (!configs) return true // No configs, assume open (if isPassable passed)

    // Let's use Bitmask: 1=Up, 2=Right, 4=Down, 8=Left
    let bitLeaving = 0
    let bitEntering = 0

    if (targetY < y) {
      // Moving UP
      bitLeaving = 1 // Blocked UP
      bitEntering = 4 // Blocked DOWN (entering from bottom)
    } else if (targetY > y) {
      // Moving DOWN
      bitLeaving = 4 // Blocked DOWN
      bitEntering = 1 // Blocked UP (entering from top)
    } else if (targetX < x) {
      // Moving LEFT
      bitLeaving = 8 // Blocked LEFT
      bitEntering = 2 // Blocked RIGHT (entering from right)
    } else if (targetX > x) {
      // Moving RIGHT
      bitLeaving = 2 // Blocked RIGHT
      bitEntering = 8 // Blocked LEFT (entering from left)
    }

    // Check Source Tile (Blocking exit)
    if (this.isDirectionBlocked(x, y, bitLeaving)) return false

    // Check Target Tile (Blocking entry)
    if (this.isDirectionBlocked(targetX, targetY, bitEntering)) return false

    return true
  }

  private isDirectionBlocked(x: number, y: number, dirBit: number): boolean {
    const configs = this.tilesetConfigs
    if (!configs) return false

    // We already checked strict solidity in checkPassage.
    // Directional blocking is a specific property `dirBlock`.
    // We only check Ground for dirBlock typically, but let's support it on all layers if needed.

    const layers = [ZLayer.decoration, ZLayer.walls, ZLayer.ground]

    for (const layerID of layers) {
      const layerStack = this.currentMap?.layers[layerID]?.data[y]?.[x]
      if (!layerStack || layerStack.length === 0) continue

      // Iterate top-down
      for (let i = layerStack.length - 1; i >= 0; i--) {
        const tile = layerStack[i]
        if (!tile) continue
        const config = configs[tile.tilesetId]?.[`${tile.x}_${tile.y}`]

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
