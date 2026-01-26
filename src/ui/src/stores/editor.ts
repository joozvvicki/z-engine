import { defineStore } from 'pinia'
import { computed, nextTick, ref } from 'vue'

import imgA1 from '@ui/assets/img/tilesets/World_A1.png'
import imgA2 from '@ui/assets/img/tilesets/World_A2.png'
import imgA3 from '@ui/assets/img/tilesets/World_A3.png'
import imgA4 from '@ui/assets/img/tilesets/World_A4.png'
import imgB from '@ui/assets/img/tilesets/World_B.png'
import imgC from '@ui/assets/img/tilesets/World_C.png'
import imgD from '@ui/assets/img/tilesets/World_D.png'
import roofs from '@ui/assets/img/tilesets/Roofs.png'

import { useLocalStorage } from '@vueuse/core'

export interface TileSelection {
  x: number
  y: number
  w: number
  h: number
  tilesetId: string
  isAutotile: boolean
  isWall?: boolean
}

export interface ZMap {
  id: number
  name: string
  width: number
  height: number
  layers: Record<
    ZLayer,
    {
      icon: string
      data: (TileSelection | null)[][]
      index: number
    }
  >
}

export enum ZTool {
  brush = 'brush',
  eraser = 'eraser',
  bucket = 'bucket',
  event = 'event',
  circle = 'circle',
  rectangle = 'rectangle'
}

export enum ZLayer {
  ground = 'ground',
  walls = 'walls',
  decoration = 'decoration',
  trees = 'trees',
  events = 'events',
  roofs = 'roofs'
}

export const useEditorStore = defineStore('editor', () => {
  const activeTab = useLocalStorage('Z_ActiveTab', 'A')
  const activeMapID = useLocalStorage<number | null>('Z_ActiveMapID', 1)
  const tileSize = ref(48)
  const activeLayer = useLocalStorage<ZLayer>('ZLayer', ZLayer.ground)
  const currentTool = useLocalStorage<ZTool>('ZTool', ZTool.brush)

  const history = ref<string[]>([])
  const historyIndex = ref(-1)
  const MAX_HISTORY = 50

  const selection = useLocalStorage<TileSelection>('Z_Location', {
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    tilesetId: 'A1',
    isAutotile: false
  })

  const tilesets = [
    { id: 'A1', url: imgA1 },
    { id: 'A2', url: imgA2 },
    { id: 'A3', url: imgA3 },
    { id: 'A4', url: imgA4 },
    { id: 'B', url: imgB },
    { id: 'C', url: imgC },
    { id: 'D', url: imgD },
    { id: 'Roofs', url: roofs }
  ]

  const storedMaps = useLocalStorage<ZMap[]>('Z_Maps', [])

  function setLayer(layer: ZLayer): void {
    activeLayer.value = layer
  }

  function setTool(tool: ZTool): void {
    currentTool.value = tool
  }

  function setSelection(newSelection: TileSelection): void {
    selection.value = newSelection
  }

  function setActiveMap(id: number): void {
    if (activeMapID.value === id) return
    activeMapID.value = id
  }

  /**
   * Helper do tworzenia pustej struktury warstw
   */
  function createEmptyLayers(
    width: number,
    height: number
  ): Record<ZLayer, { data: (TileSelection | null)[][]; index: number; icon: string }> {
    const createGrid = (): (TileSelection | null)[][] =>
      Array.from({ length: height }, () => Array(width).fill(null))

    return {
      ground: { data: createGrid(), index: 0, icon: 'background' },
      walls: { data: createGrid(), index: 1, icon: 'wall' },
      decoration: { data: createGrid(), index: 2, icon: 'cactus' },
      events: { data: createGrid(), index: 3, icon: 'box' },
      trees: { data: createGrid(), index: 4, icon: 'tree' },
      roofs: { data: createGrid(), index: 5, icon: 'home' }
    }
  }

  /**
   * Resetuje lub inicjalizuje mapę o zadanych wymiarach
   */
  function initMap(width: number, height: number): void {
    const map = storedMaps.value.find((m) => m.id === activeMapID.value)
    if (!map) return

    map.width = width
    map.height = height
    map.layers = createEmptyLayers(width, height)

    saveProject() // Auto-save po zmianie rozmiaru
  }

  function recordHistory(): void {
    // If we are in the middle of an undo/redo chain and perform a new action,
    // we must remove all "future" states.
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Add current state
    history.value.push(JSON.stringify(storedMaps.value))

    // Limit history size
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function undo(): void {
    if (historyIndex.value <= 0) return

    historyIndex.value--
    const previousState = JSON.parse(history.value[historyIndex.value])

    // Object.assign doesn't work well for deep nested arrays in reactive objects,
    // so we replace the contents of the reactive array.
    storedMaps.value.splice(0, storedMaps.value.length, ...previousState)
    saveProject()
  }

  function redo(): void {
    if (historyIndex.value >= history.value.length - 1) return

    historyIndex.value++
    const nextState = JSON.parse(history.value[historyIndex.value])

    storedMaps.value.splice(0, storedMaps.value.length, ...nextState)
    saveProject()
  }

  /**
   * Główna funkcja edycji - zapisuje kafelek w konkretnej warstwie
   */
  function setTileAt(x: number, y: number, tile: TileSelection | null): void {
    const map = storedMaps.value.find((m) => m.id === activeMapID.value)
    if (!map) return

    // Sprawdź czy mieścimy się w mapie
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return

    // Zapisz na AKTYWNEJ warstwie
    map.layers[activeLayer.value].data[y][x] = tile

    // Opcjonalnie: Debounce save
    saveProject()
  }

  /**
   * Zapisuje stan całego projektu do LocalStorage przeglądarki
   */
  function saveProject(): void {
    try {
      localStorage.setItem('Z_Maps', JSON.stringify(storedMaps.value))
      console.log(' [Z Engine] Project Autosaved.')
    } catch (e) {
      console.error('Save failed (quota exceeded?)', e)
    }
  }

  /**
   * Pobiera plik JSON z aktualną mapą (do wrzucenia do gry)
   */
  function exportMapAsJSON(): void {
    const map = storedMaps.value.find((m) => m.id === activeMapID.value)
    if (!map) return

    const dataStr = JSON.stringify(map, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `Map${map.id}_${map.name.replace(/\s+/g, '_')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const createMap = (name: string, width: number, height: number): void => {
    const createEmptyGrid = (w: number, h: number): (TileSelection | null)[][] =>
      Array.from({ length: h }, () => Array(w).fill(null))

    const newMap: ZMap = {
      id: storedMaps.value.length > 0 ? Math.max(...storedMaps.value.map((m) => m.id)) + 1 : 1,
      name,
      width,
      height,
      layers: {
        ground: { index: 0, icon: 'background', data: createEmptyGrid(width, height) },
        walls: { index: 1, icon: 'wall', data: createEmptyGrid(width, height) },
        decoration: { index: 2, icon: 'cactus', data: createEmptyGrid(width, height) },
        events: { index: 3, icon: 'box', data: createEmptyGrid(width, height) },
        trees: { index: 4, icon: 'tree', data: createEmptyGrid(width, height) },
        roofs: { index: 5, icon: 'home', data: createEmptyGrid(width, height) }
      }
    }

    storedMaps.value.push(newMap)
    activeMapID.value = newMap.id
  }

  nextTick(() => {
    if (history.value.length === 0) {
      history.value.push(JSON.stringify(storedMaps))
      historyIndex.value = 0
    }
  })

  return {
    // State
    activeTab,
    activeMapID,
    maps: storedMaps,
    tilesets,
    tileSize,
    selection,
    activeLayer,
    currentTool,
    historyIndex,
    canUndo: computed(() => historyIndex.value > 0),
    canRedo: computed(() => historyIndex.value < history.value.length - 1),

    // Actions
    undo,
    redo,
    recordHistory,
    setLayer,
    setTool,
    initMap,
    setTileAt,
    setSelection,
    setActiveMap,
    saveProject,
    exportMapAsJSON,
    createMap
  }
})
