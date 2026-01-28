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

  const pickTile = (x: number, y: number): void => {
    if (!activeMap.value) return
    const stack = activeMap.value.layers[activeLayer.value].data[y]?.[x]
    if (!stack || stack.length === 0) return

    const topTile = stack[stack.length - 1]
    selection.value = { ...topTile, w: 1, h: 1 }

    // Automatyczna zmiana zakładki w zależności od ID tilesetu
    const id = topTile.tilesetId
    if (['A1', 'A2', 'A3', 'A4', 'A5'].includes(id)) activeTab.value = 'A'
    else if (id === 'B') activeTab.value = 'B'
    else if (id === 'C') activeTab.value = 'C'
    else if (id === 'D') activeTab.value = 'D'
    else if (id === 'Roofs') activeTab.value = 'Roofs'
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

    // History (rozpakowujemy metody z composable)
    ...history,

    // Actions
    setLayer: (l: ZLayer) => (activeLayer.value = l),
    setTool: (t: ZTool) => (currentTool.value = t),
    setSelection: (s: TileSelection) => (selection.value = s),
    setActiveMap,
    deleteMap,

    initMap,
    createMap,
    setTileAt,
    pickTile,

    addEvent,
    updateEvent,

    toggleTestMode,
    movePlayer,

    saveProject,
    exportMapAsJSON,
    importMapFromJSON
  }
})
