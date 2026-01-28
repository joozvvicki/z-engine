import { defineStore } from 'pinia'
import { computed, nextTick, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

// --- MODUŁY LOKALNE ---
import { TILESETS } from './constants'
import { useHistory } from './useHistory'
import { ZMap, type TileSelection, type ZEvent, ZTool, ZLayer } from '@engine/types'

export const useEditorStore = defineStore('editor', () => {
  // ==========================================
  // 1. STATE & SETTINGS
  // ==========================================
  const isTestMode = ref(false)
  const playerPos = ref({ x: 0, y: 0 })
  const spawnPos = ref({ x: 5, y: 5 })
  const tileSize = ref(48) // Standard MV/MZ

  // Stan UI Edytora
  const activeTab = useLocalStorage('Z_ActiveTab', 'A')
  const activeMapID = useLocalStorage<number | null>('Z_ActiveMapID', 1)
  const activeLayer = useLocalStorage<ZLayer>('ZLayer', ZLayer.ground)
  const currentTool = useLocalStorage<ZTool>('ZTool', ZTool.brush)

  // Aktualna selekcja (pędzel)
  const selection = useLocalStorage<TileSelection>('Z_Location', {
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    tilesetId: 'A1',
    isAutotile: false
  })

  // Select Tool State
  const selectionCoords = ref<{ x: number; y: number; w: number; h: number } | null>(null)
  const clipboard = ref<TileSelection | null>(null)

  // Dane Map
  const storedMaps = useLocalStorage<ZMap[]>('Z_Maps', [])

  // Computed: Aktualna mapa
  const activeMap = computed(() => storedMaps.value.find((m) => m.id === activeMapID.value))

  // ==========================================
  // 2. PERSISTENCE (ZAPIS)
  // ==========================================
  const saveProject = (): void => {
    try {
      localStorage.setItem('Z_Maps', JSON.stringify(storedMaps.value))
    } catch (e) {
      console.error('Save failed (quota exceeded?)', e)
    }
  }

  // ==========================================
  // 3. HISTORY MODULE (UNDO/REDO)
  // ==========================================
  // Używamy composable, przekazując mu referencje do stanu i funkcję zapisu
  const history = useHistory(activeMap, activeMapID, saveProject)

  // ==========================================
  // 4. MAP ACTIONS (Create, Init)
  // ==========================================

  // Helper do tworzenia pustej struktury warstw
  const createEmptyLayers = (
    width: number,
    height: number
  ): Record<
    ZLayer,
    {
      icon: string
      data: (TileSelection[] | null)[][]
      index: number
    }
  > => {
    const createGrid = (): (TileSelection[] | null)[][] => {
      return Array.from({ length: height }, () => Array(width).fill(null))
    }
    return {
      [ZLayer.ground]: { data: createGrid(), index: 0, icon: 'background' },
      [ZLayer.walls]: { data: createGrid(), index: 1, icon: 'wall' },
      [ZLayer.decoration]: { data: createGrid(), index: 2, icon: 'cactus' },
      [ZLayer.events]: { data: createGrid(), index: 3, icon: 'box' },
      [ZLayer.trees]: { data: createGrid(), index: 4, icon: 'tree' },
      [ZLayer.roofs]: { data: createGrid(), index: 5, icon: 'home' }
    }
  }

  const createMap = (name: string, width: number, height: number): void => {
    const newId =
      storedMaps.value.length > 0 ? Math.max(...storedMaps.value.map((m) => m.id)) + 1 : 1
    const newMap: ZMap = {
      id: newId,
      name,
      width,
      height,
      layers: createEmptyLayers(width, height),
      events: []
    }
    storedMaps.value.push(newMap)
    activeMapID.value = newMap.id

    // Inicjalizacja historii dla nowej mapy
    nextTick(() => history.recordHistory())
  }

  const initMap = (width: number, height: number): void => {
    if (!activeMap.value) return

    activeMap.value.width = width
    activeMap.value.height = height
    activeMap.value.layers = createEmptyLayers(width, height)

    saveProject()
    history.recordHistory()
  }

  const setActiveMap = (id: number): void => {
    if (activeMapID.value === id) return
    activeMapID.value = id
  }

  // ==========================================
  // 5. EDITING ACTIONS (Brush, Pick)
  // ==========================================

  const setTileAt = (x: number, y: number, tile: TileSelection | null, stack = false): void => {
    const map = activeMap.value
    if (!map || x < 0 || x >= map.width || y < 0 || y >= map.height) return

    // Pobieramy referencję do stosu na danej pozycji
    const currentCell = map.layers[activeLayer.value].data[y][x]

    if (tile === null) {
      // Gumka: czyścimy stos całkowicie
      map.layers[activeLayer.value].data[y][x] = []
    } else {
      if (stack && currentCell) {
        // Sprawdź duplikaty
        const isDuplicate = currentCell.some(
          (t) => t.x === tile.x && t.y === tile.y && t.tilesetId === tile.tilesetId
        )

        if (!isDuplicate) {
          // ZAMIAST .push(tile), robimy nadpisanie nową tablicą (spread operator).
          // To gwarantuje, że Vue "zauważy" zmianę i przerysuje kafelki.
          map.layers[activeLayer.value].data[y][x] = [...currentCell, tile]
        }
      } else {
        // Tryb bez Shifta: zastępujemy wszystko nowym kafelkiem
        map.layers[activeLayer.value].data[y][x] = [tile]
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

  const copySelection = (): void => {
    if (!selectionCoords.value || !activeMap.value) return
    const { x, y, w, h } = selectionCoords.value
    const layerData = activeMap.value.layers[activeLayer.value].data

    const pattern: (TileSelection | null)[][] = []

    for (let dy = 0; dy < h; dy++) {
      const row: (TileSelection | null)[] = []
      for (let dx = 0; dx < w; dx++) {
        const stack = layerData[y + dy]?.[x + dx]
        if (stack && stack.length > 0) {
          // Copy the top tile
          row.push({ ...stack[stack.length - 1] })
        } else {
          row.push(null)
        }
      }
      pattern.push(row)
    }

    // Determine the "primary" tile (top-left) for the clipboard
    // If the top-left is empty, we still use it as the anchor, or we could find the first non-empty.
    // simpler is to just take 0,0 even if null, but TileSelection requires tilesetId.
    // So we'll use the first found tile as metadata or a dummy if empty.
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
    // This allows pasting "empty" space (transparent stamp) or at least doesn't break the paste action.
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
        pattern
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

  // ==========================================
  // 6. EVENT & GAMEPLAY ACTIONS
  // ==========================================

  const addEvent = (x: number, y: number, eventData: Partial<ZEvent>): void => {
    if (!activeMap.value) return

    const newEvent: ZEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: eventData.name || `EV${activeMap.value.events.length + 1}`,
      x,
      y,
      graphic: eventData.graphic || null,
      pages: []
    }

    activeMap.value.events.push(newEvent)
    saveProject()
    history.recordHistory()
  }

  const updateEvent = (eventId: string, updates: Partial<ZEvent>): void => {
    if (!activeMap.value) return
    const ev = activeMap.value.events.find((e) => e.id === eventId)
    if (ev) {
      Object.assign(ev, updates)
      saveProject()
      history.recordHistory()
    }
  }

  const toggleTestMode = (): void => {
    isTestMode.value = !isTestMode.value
    if (isTestMode.value) {
      playerPos.value = { ...spawnPos.value }
    }
  }

  const movePlayer = (dx: number, dy: number, mapWidth: number, mapHeight: number): void => {
    const newX = playerPos.value.x + dx
    const newY = playerPos.value.y + dy
    if (newX >= 0 && newX < mapWidth && newY >= 0 && newY < mapHeight) {
      playerPos.value = { x: newX, y: newY }
    }
  }

  // ==========================================
  // 7. IMPORT / EXPORT
  // ==========================================

  const exportMapAsJSON = (): void => {
    if (!activeMap.value) return
    const dataStr = JSON.stringify(activeMap.value)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `Map${activeMap.value.id}_${activeMap.value.name.replace(/\s+/g, '_')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const importMapFromJSON = async (): Promise<void> => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.style.display = 'none'
    document.body.appendChild(input)

    input.onchange = async () => {
      if (input.files?.[0]) {
        try {
          const text = await input.files[0].text()
          const importedMap = JSON.parse(text)
          importedMap.id = Math.max(...storedMaps.value.map((m) => m.id), 0) + 1
          storedMaps.value.push(importedMap)
          nextTick(() => {
            history.recordHistory()
            setActiveMap(importedMap.id)
          })
        } catch (e) {
          console.error('Failed to import map', e)
        }
      }
      document.body.removeChild(input)
    }
    input.click()
  }

  const deleteMap = (mapId: number): void => {
    storedMaps.value = storedMaps.value.filter((m) => m.id !== mapId)
    if (activeMapID.value === mapId) {
      activeMapID.value = storedMaps.value[0]?.id || null
    }
    saveProject()
    history.recordHistory()
  }

  // ==========================================
  // 8. EXPORT PUBLIC API
  // ==========================================
  return {
    // State
    activeMap,
    isTestMode,
    playerPos,
    spawnPos,
    activeTab,
    activeMapID,
    maps: storedMaps,
    tilesets: TILESETS,
    tileSize,
    selection,
    activeLayer,
    currentTool,
    selectionCoords,
    clipboard,

    // History (rozpakowujemy metody z composable)
    ...history,

    // Actions
    setLayer: (l: ZLayer) => (activeLayer.value = l),
    setTool: (t: ZTool) => (currentTool.value = t),
    setSelection: (s: TileSelection) => (selection.value = { ...s, pattern: s.pattern }),
    setActiveMap,
    deleteMap,

    initMap,
    createMap,
    setTileAt,
    pickTile,
    clearRegion,
    setSelectionCoords,
    copySelection,
    pasteSelection,

    addEvent,
    updateEvent,

    toggleTestMode,
    movePlayer,

    saveProject,
    exportMapAsJSON,
    importMapFromJSON
  }
})
