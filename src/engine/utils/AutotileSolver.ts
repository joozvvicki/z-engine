import { ZLayer, type ZMap, type TileSelection } from '@engine/types'

export class AutotileSolver {
  static isSameTile(
    x: number,
    y: number,
    mapWidth: number,
    mapHeight: number,
    layer: ZLayer,
    sel: TileSelection,
    mapData: ZMap | null,
    stackIndex: number = 0,
    customCheck?: (x: number, y: number) => boolean
  ): boolean {
    if (customCheck && customCheck(x, y)) return true
    if (!mapData) return false
    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return true

    const row = mapData.layers[layer].data[y]
    if (!row) return false
    const tileStack = row[x]
    if (!tileStack || tileStack.length <= stackIndex) return false

    const tile = tileStack[stackIndex]
    // Consider null tiles (erasers/holes) as not matching?
    // Usually stack shouldn't have nulls in middle, but type allows (TileSelection | null).
    if (!tile) return false

    return tile.tilesetId === sel.tilesetId && tile.x === sel.x && tile.y === sel.y
  }

  static getQuadrantOffset(
    x: number,
    y: number,
    qx: number,
    qy: number,
    tileSize: number,
    sel: TileSelection,
    layer: ZLayer,
    mapData: ZMap,
    mapWidth: number,
    mapHeight: number,
    stackIndex: number = 0,
    customCheck?: (x: number, y: number) => boolean
  ): { x: number; y: number } {
    const check = (dx: number, dy: number): boolean =>
      this.isSameTile(
        x + dx,
        y + dy,
        mapWidth,
        mapHeight,
        layer,
        sel,
        mapData,
        stackIndex,
        customCheck
      )

    const dx = qx === 0 ? -1 : 1
    const dy = qy === 0 ? -1 : 1

    const hasH = check(dx, 0)
    const hasV = check(0, dy)
    const hasD = check(dx, dy)

    const isA3 = sel.tilesetId === 'A3'
    const isA4Wall = sel.tilesetId === 'A4' && (sel.y === 3 || sel.y === 8 || sel.y === 13)

    // Logika A3 / Ściany A4
    if (isA3 || isA4Wall) {
      if (qx === 0 && qy === 0) return { x: hasH ? tileSize / 2 : 0, y: hasV ? tileSize / 2 : 0 }
      if (qx === 1 && qy === 0)
        return { x: hasH ? tileSize : tileSize * 1.5, y: hasV ? tileSize / 2 : 0 }
      if (qx === 0 && qy === 1)
        return { x: hasH ? tileSize / 2 : 0, y: !hasV ? tileSize * 1.5 : tileSize / 2 }
      if (qx === 1 && qy === 1)
        return { x: hasH ? tileSize : tileSize * 1.5, y: !hasV ? tileSize * 1.5 : tileSize / 2 }
    }

    // TOP-LEFT
    if (qx === 0 && qy === 0) {
      if (!hasH && !hasV) return { x: 0, y: tileSize }
      if (hasH && !hasV) return { x: tileSize, y: tileSize }
      if (!hasH && hasV) return { x: 0, y: tileSize * 2 }
      if (hasH && hasV && !hasD) return { x: tileSize, y: 0 }
      return { x: tileSize, y: tileSize * 2 }
    }

    // TOP-RIGHT
    if (qx === 1 && qy === 0) {
      if (!hasH && !hasV) return { x: tileSize * 1.5, y: tileSize }
      if (hasH && !hasV) return { x: tileSize / 2, y: tileSize }
      if (!hasH && hasV) return { x: tileSize * 1.5, y: tileSize * 2 }
      if (hasH && hasV && !hasD) return { x: tileSize * 1.5, y: 0 }
      return { x: tileSize / 2, y: tileSize * 2 }
    }

    // BOTTOM-LEFT
    if (qx === 0 && qy === 1) {
      if (!hasH && !hasV) return { x: 0, y: tileSize * 2.5 }
      if (hasH && !hasV) return { x: tileSize, y: tileSize * 2.5 }
      if (!hasH && hasV) return { x: 0, y: tileSize * 1.5 }
      if (hasH && hasV && !hasD) return { x: tileSize, y: tileSize / 2 }
      return { x: tileSize, y: tileSize * 1.5 }
    }

    // BOTTOM-RIGHT
    if (qx === 1 && qy === 1) {
      if (!hasH && !hasV) return { x: tileSize * 1.5, y: tileSize * 2.5 }
      if (hasH && !hasV) return { x: tileSize / 2, y: tileSize * 2.5 }
      if (!hasH && hasV) return { x: tileSize * 1.5, y: tileSize * 1.5 }
      if (hasH && hasV && !hasD) return { x: tileSize * 1.5, y: tileSize / 2 }
      return { x: tileSize / 2, y: tileSize * 1.5 }
    }

    return { x: 0, y: 0 }
  }
}
