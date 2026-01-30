import { type Ref, type ComputedRef } from 'vue'
import { ZLayer, ZTool, type ZMap, type TileSelection } from '@engine/types'

export const useLayerEditing = (
  activeMap: ComputedRef<ZMap | undefined>,
  activeLayer: Ref<ZLayer>,
  selection: Ref<TileSelection>,
  clipboard: Ref<TileSelection | null>,
  currentTool: Ref<ZTool>,
  selectionCoords: Ref<{ x: number; y: number; w: number; h: number } | null>,
  activeTab: Ref<string>,
  saveProject: () => void
): {
  setTileAt: (
    x: number,
    y: number,
    tile: TileSelection | null,
    stack?: boolean,
    layer?: ZLayer
  ) => void
  clearRegion: (x: number, y: number, w: number, h: number) => void
  pickTile: (x: number, y: number) => void
  setSelectionCoords: (coords: { x: number; y: number; w: number; h: number } | null) => void
  copySelection: (allLayers?: boolean) => void
  pasteSelection: (allLayers?: boolean) => void
} => {
  const setTileAt = (
    x: number,
    y: number,
    tile: TileSelection | null,
    stack = false,
    layer?: ZLayer
  ): void => {
    const map = activeMap.value
    if (!map || x < 0 || x >= map.width || y < 0 || y >= map.height) return

    const targetLayer = layer ?? activeLayer.value

    // Ensure layer data exists and is correct size (auto-repair)
    if (!map.layers[targetLayer].data) {
      map.layers[targetLayer].data = []
    }
    if (!map.layers[targetLayer].data[y]) {
      map.layers[targetLayer].data[y] = []
    }

    // Pobieramy referencję do stosu na danej pozycji
    const currentCell = map.layers[targetLayer].data[y][x]

    if (tile === null) {
      // Gumka: czyścimy stos całkowicie
      map.layers[targetLayer].data[y][x] = []
    } else {
      if (stack && currentCell) {
        // Sprawdź duplikaty
        const isDuplicate = currentCell.some(
          (t) => t.x === tile.x && t.y === tile.y && t.tilesetId === tile.tilesetId
        )

        if (!isDuplicate) {
          // ZAMIAST .push(tile), robimy nadpisanie nową tablicą (spread operator).
          // To gwarantuje, że Vue "zauważy" zmianę i przerysuje kafelki.
          map.layers[targetLayer].data[y][x] = [...currentCell, tile]
        }
      } else {
        // Tryb bez Shifta: zastępujemy wszystko nowym kafelkiem
        map.layers[targetLayer].data[y][x] = [tile]
      }
    }

    saveProject()
  }

  const clearRegion = (x: number, y: number, w: number, h: number): void => {
    const map = activeMap.value
    if (!map) return
    const layerData = map.layers[activeLayer.value].data

    let changed = false
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = x + dx
        const ty = y + dy
        if (tx >= 0 && tx < map.width && ty >= 0 && ty < map.height) {
          // Clear the tile stack
          layerData[ty][tx] = []
          changed = true
        }
      }
    }

    if (changed) {
      saveProject()
    }
  }

  const pickTile = (x: number, y: number): void => {
    if (!activeMap.value) return
    const stack = activeMap.value.layers[activeLayer.value].data[y]?.[x]
    if (!stack || stack.length === 0) return

    const topTile = stack[stack.length - 1]
    selection.value = { ...topTile, w: 1, h: 1, pattern: undefined }

    // Automatyczna zmiana zakładki w zależności od ID tilesetu
    const id = topTile.tilesetId
    if (['A1', 'A2', 'A3', 'A4', 'A5'].includes(id)) activeTab.value = 'A'
    else if (id === 'B') activeTab.value = 'B'
    else if (id === 'C') activeTab.value = 'C'
    else if (id === 'D') activeTab.value = 'D'
    else if (id === 'Roofs') activeTab.value = 'Roofs'
  }

  const setSelectionCoords = (
    coords: { x: number; y: number; w: number; h: number } | null
  ): void => {
    selectionCoords.value = coords
  }

  const copySelection = (allLayers = false): void => {
    console.log('copySelection called. allLayers:', allLayers)
    if (!selectionCoords.value || !activeMap.value) return
    const { x, y, w, h } = selectionCoords.value

    // Helper to get top-most tile from a stack
    const getTopTile = (layerId: ZLayer, tx: number, ty: number): TileSelection | null => {
      const stack = activeMap.value!.layers[layerId]?.data[ty]?.[tx]
      return stack && stack.length > 0 ? stack[stack.length - 1] : null
    }

    const pattern: (TileSelection | null)[][] = []
    const structure: Partial<Record<ZLayer, (TileSelection[] | null)[][]>> = {}

    // Capture structure for layers
    const layersToCheck = allLayers
      ? [ZLayer.ground, ZLayer.walls, ZLayer.decoration, ZLayer.events, ZLayer.highest]
      : [activeLayer.value]

    for (const l of layersToCheck) {
      const layerGrid: (TileSelection[] | null)[][] = []
      let hasData = false

      for (let dy = 0; dy < h; dy++) {
        const row: (TileSelection[] | null)[] = []
        for (let dx = 0; dx < w; dx++) {
          const stack = activeMap.value!.layers[l]?.data[y + dy]?.[x + dx]
          if (stack && stack.length > 0) {
            row.push([...stack]) // Clone stack
            hasData = true
          } else {
            row.push(null)
          }
        }
        layerGrid.push(row)
      }

      if (hasData) {
        structure[l] = layerGrid
      }
    }

    // Always generate 'pattern' (flattened or single layer) for fallback/preview
    for (let dy = 0; dy < h; dy++) {
      const row: (TileSelection | null)[] = []
      for (let dx = 0; dx < w; dx++) {
        let tile: TileSelection | null = null

        if (allLayers) {
          const layersToCheck = [ZLayer.ground, ZLayer.walls, ZLayer.decoration, ZLayer.highest]
          for (const l of layersToCheck) {
            const t = getTopTile(l, y + dy, x + dx)
            if (t) tile = { ...t }
          }
        } else {
          const t = getTopTile(activeLayer.value, y + dy, x + dx)
          if (t) tile = { ...t }
        }
        row.push(tile)
      }
      pattern.push(row)
    }

    // Determine the "primary" tile (top-left) for the clipboard
    let baseTile: TileSelection | null = null

    // Find first non-null tile to use as base property
    for (const row of pattern) {
      for (const tile of row) {
        if (tile) {
          baseTile = tile
          break
        }
      }
      if (baseTile) break
    }

    // If no non-null tile found (empty selection), create a dummy base tile so clipboard layout is preserved.
    if (!baseTile) {
      baseTile = {
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        tilesetId: 'A1', // Default dummy
        isAutotile: false
      }
    }

    if (baseTile) {
      clipboard.value = {
        ...baseTile, // Base properties
        w,
        h,
        pattern: allLayers ? undefined : pattern,
        structure, // Always include structure now
        isMultiLayer: allLayers // Flag to distinguish paste behavior
      }

      // Auto-switch to Stamp mode (Brush with pattern)
      selection.value = clipboard.value
      selectionCoords.value = null
      currentTool.value = ZTool.brush
    }
  }

  const pasteSelection = (): void => {
    if (!clipboard.value) return
    selection.value = clipboard.value
    selectionCoords.value = null // Clear selection box to avoid confusion
    currentTool.value = ZTool.brush
  }

  return {
    setTileAt,
    clearRegion,
    pickTile,
    setSelectionCoords,
    copySelection,
    pasteSelection
  }
}
