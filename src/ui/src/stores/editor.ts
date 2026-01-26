import { defineStore } from 'pinia'
import { computed, nextTick, reactive, ref, watch } from 'vue'

// Importy obrazków (bez zmian)
import imgA1 from '@ui/assets/img/tilesets/World_A1.png'
import imgA2 from '@ui/assets/img/tilesets/World_A2.png'
import imgA3 from '@ui/assets/img/tilesets/World_A3.png'
import imgA4 from '@ui/assets/img/tilesets/World_A4.png'
import imgB from '@ui/assets/img/tilesets/World_B.png'
import imgC from '@ui/assets/img/tilesets/World_C.png'
import imgD from '@ui/assets/img/tilesets/World_D.png'
import roofs from '@ui/assets/img/tilesets/Roofs.png'

export interface TileSelection {
  x: number
  y: number
  w: number
  h: number
  tilesetId: string
  isAutotile: boolean
}

// Typ mapy - teraz zawiera warstwy!
export interface ZMap {
  id: number
  name: string
  width: number
  height: number
  // Kluczowa zmiana: dane są teraz podzielone na warstwy
  layers: Record<ZLayer, (TileSelection | null)[][]>
}

export type ZTool = 'brush' | 'eraser'
export type ZLayer = 'ground' | 'decoration' | 'events'

export const useEditorStore = defineStore('editor', () => {
  // --- STATE ---
  const activeMapID = ref<number | null>(1)
  const tileSize = ref(48) // Ważne: Sub-tile size (ćwiartka)
  const activeLayer = ref<ZLayer>('ground')
  const currentTool = ref<ZTool>('brush')

  const history = ref<string[]>([]) // Storing as JSON strings to save memory and ensure deep copies
  const historyIndex = ref(-1)
  const MAX_HISTORY = 50

  const selection = ref<TileSelection>({
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    tilesetId: 'A1',
    isAutotile: false
  })

  // Definicja dostępnych tilesetów
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

  // Próbujemy wczytać z localStorage przy starcie, jeśli nie ma - używamy domyślnych
  const storedMaps = localStorage.getItem('z_engine_maps')
  const defaultMaps: ZMap[] = [
    { id: 1, name: 'Starting Forest', width: 20, height: 16, layers: createEmptyLayers(20, 16) },
    { id: 2, name: 'Tavern "Z"', width: 20, height: 10, layers: createEmptyLayers(20, 10) },
    { id: 3, name: 'Dungeons Lvl 1', width: 26, height: 16, layers: createEmptyLayers(26, 16) }
  ]

  const maps = reactive<ZMap[]>(storedMaps ? JSON.parse(storedMaps) : defaultMaps)

  // --- ACTIONS ---

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
  ): Record<ZLayer, (TileSelection | null)[][]> {
    const createGrid = (): (TileSelection | null)[][] =>
      Array.from({ length: height }, () => Array(width).fill(null))

    return {
      ground: createGrid(),
      decoration: createGrid(),
      events: createGrid()
    }
  }

  /**
   * Resetuje lub inicjalizuje mapę o zadanych wymiarach
   */
  function initMap(width: number, height: number): void {
    const map = maps.find((m) => m.id === activeMapID.value)
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
    history.value.push(JSON.stringify(maps))

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
    maps.splice(0, maps.length, ...previousState)
    saveProject()
  }

  function redo(): void {
    if (historyIndex.value >= history.value.length - 1) return

    historyIndex.value++
    const nextState = JSON.parse(history.value[historyIndex.value])

    maps.splice(0, maps.length, ...nextState)
    saveProject()
  }

  /**
   * Główna funkcja edycji - zapisuje kafelek w konkretnej warstwie
   */
  function setTileAt(x: number, y: number, tile: TileSelection | null): void {
    const map = maps.find((m) => m.id === activeMapID.value)
    if (!map) return

    // Sprawdź czy mieścimy się w mapie
    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return

    // Zapisz na AKTYWNEJ warstwie
    map.layers[activeLayer.value][y][x] = tile

    // Opcjonalnie: Debounce save
    saveProject()
  }

  /**
   * Zapisuje stan całego projektu do LocalStorage przeglądarki
   */
  function saveProject(): void {
    try {
      localStorage.setItem('z_engine_maps', JSON.stringify(maps))
      console.log(' [Z Engine] Project Autosaved.')
    } catch (e) {
      console.error('Save failed (quota exceeded?)', e)
    }
  }

  /**
   * Pobiera plik JSON z aktualną mapą (do wrzucenia do gry)
   */
  function exportMapAsJSON(): void {
    const map = maps.find((m) => m.id === activeMapID.value)
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

  watch(
    maps,
    () => {
      // saveProject() // Odkomentuj jeśli chcesz save przy każdej zmianie (może być kosztowne przy dużych mapach)
    },
    { deep: true }
  )

  nextTick(() => {
    if (history.value.length === 0) {
      history.value.push(JSON.stringify(maps))
      historyIndex.value = 0
    }
  })

  return {
    // State
    activeMapID,
    maps,
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
    exportMapAsJSON
  }
})
