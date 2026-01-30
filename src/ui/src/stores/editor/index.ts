import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { ProjectService } from '../../services/ProjectService'

// --- MODUŁY LOKALNE ---
import { useHistory } from '../../composables/useHistory'
import { useMapManagement } from '../../composables/useMapManagement'
import { useLayerEditing } from '../../composables/useLayerEditing'
import { useEventManagement } from '../../composables/useEventManagement'
import { useTilesets } from '../../composables/useTilesets'

import { type ZMap, type TileSelection, ZTool, ZLayer, type TilesetConfig } from '@engine/types'

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
  const storedMaps = ref<ZMap[]>([])

  // Tileset Database (Configs)
  // Tileset Database (Configs)
  const storedTilesetConfigs = ref<Record<string, TilesetConfig>>({})

  // System Data (Database)
  const systemSwitches = ref<string[]>([])
  const systemVariables = ref<string[]>([])

  // Ensure initial size (default for new project or empty load)
  if (systemSwitches.value.length === 0) systemSwitches.value = new Array(20).fill('')
  if (systemVariables.value.length === 0) systemVariables.value = new Array(20).fill('')

  // Computed: Aktualna mapa
  const activeMap = computed(() => storedMaps.value.find((m) => m.id === activeMapID.value))

  // ==========================================
  // 2. PERSISTENCE (ZAPIS / ODCZYT)
  // ==========================================

  const loadProject = async (): Promise<void> => {
    const path = await ProjectService.selectProject()
    if (!path) return

    // 1. Load System Data
    const sysData = await ProjectService.loadSystemData()
    if (sysData) {
      systemSwitches.value = sysData.switches
      systemVariables.value = sysData.variables
    }

    // 2. Load Tilesets
    storedTilesetConfigs.value = await ProjectService.loadTilesets()

    // 3. Load Maps (Currently loading ALL, optimization needed for large projects)
    const mapInfos = await ProjectService.loadMapInfos() // [{id, name, ...}]
    if (mapInfos.length > 0) {
      storedMaps.value = []
      for (const info of mapInfos) {
        if (info.id) {
          const map = await ProjectService.loadMap(info.id)
          if (map) storedMaps.value.push(map)
        }
      }
    } else {
      // Fallback: If no MapInfos, maybe try loading Map001?
      // For new project structure, list might be empty.
    }
  }

  const saveProject = async (): Promise<void> => {
    if (!ProjectService.isLoaded()) {
      await ProjectService.selectProject()
      if (!ProjectService.isLoaded()) return // User cancelled
    }

    try {
      // 1. Save System
      await ProjectService.saveSystemData({
        switches: systemSwitches.value,
        variables: systemVariables.value
      })

      // 2. Save Tilesets
      await ProjectService.saveTilesets(storedTilesetConfigs.value)

      // 3. Save Map Infos
      const mapInfos = storedMaps.value.map((m) => ({ id: m.id, name: m.name }))
      await ProjectService.saveMapInfos(mapInfos)

      // 4. Save Each Map
      for (const map of storedMaps.value) {
        await ProjectService.saveMap(map)
      }

      console.log('Project Saved Successfully')
    } catch (e) {
      console.error('Save failed', e)
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
    loadProject,

    // System
    systemSwitches,
    systemVariables
  }
})
