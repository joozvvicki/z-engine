import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

// --- MODUŁY LOKALNE ---
import { useHistory } from '../../composables/useHistory'
import { useMapManagement } from '../../composables/useMapManagement'
import { useLayerEditing } from '../../composables/useLayerEditing'
import { useEventManagement } from '../../composables/useEventManagement'
import { useTilesets } from '../../composables/useTilesets'

import { type ZMap, type TileSelection, ZTool, ZLayer } from '@engine/types'

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

  // Tileset Database (Configs)
  const storedTilesetConfigs = useLocalStorage<
    Record<
      string,
      Record<
        string,
        {
          isSolid: boolean
          isHighPriority: boolean
          sortYOffset: number
          collisionMask: boolean[]
          dirBlock: number // Bitmask: 1=Up, 2=Right, 4=Down, 8=Left
        }
      >
    >
  >('Z_TilesetConfigs', {})

  // System Data (Database)
  const systemSwitches = useLocalStorage<string[]>('Z_SystemSwitches', [])
  const systemVariables = useLocalStorage<string[]>('Z_SystemVariables', [])

  // Ensure initial size
  if (systemSwitches.value.length === 0) systemSwitches.value = new Array(20).fill('')
  if (systemVariables.value.length === 0) systemVariables.value = new Array(20).fill('')

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
  const history = useHistory(activeMap, activeMapID, saveProject)

  // ==========================================
  // 4. COMPOSABLES (MODULES)
  // ==========================================

  const mapManagement = useMapManagement(storedMaps, activeMapID, activeMap, saveProject, history)

  const layerEditing = useLayerEditing(
    activeMap,
    activeLayer,
    selection,
    clipboard,
    currentTool,
    selectionCoords,
    activeTab,
    saveProject
  )

  const eventManagement = useEventManagement(
    activeMap,
    isTestMode,
    playerPos,
    spawnPos,
    saveProject,
    history
  )

  const tilesets = useTilesets(activeMap, storedTilesetConfigs)

  // ==========================================
  // 5. EXPORT PUBLIC API
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
    tileSize,
    selection,
    activeLayer,
    currentTool,
    selectionCoords,
    clipboard,

    // Tileset Configs
    tilesetConfigs: storedTilesetConfigs,

    // Composable Exports
    ...mapManagement,
    ...layerEditing,
    ...eventManagement,
    ...tilesets,
    tilesets: tilesets.currentMapTilesets, // Alias for backward compatibility

    // History
    ...history,

    // Actions that remain local or simple setters
    setLayer: (l: ZLayer) => (activeLayer.value = l),
    setTool: (t: ZTool) => (currentTool.value = t),
    setSelection: (s: TileSelection) => (selection.value = { ...s, pattern: s.pattern }),

    saveProject,

    // System
    systemSwitches,
    systemVariables
  }
})
