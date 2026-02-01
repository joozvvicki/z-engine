import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
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
  const cursorX = ref(0)
  const cursorY = ref(0)

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

  // Viewport Settings per Map
  const mapViewportStates = useLocalStorage<
    Record<number, { scale: number; pan: { x: number; y: number } }>
  >('Z_MapViewportStates', {})

  // Tileset Database (Configs)
  const storedTilesetConfigs = ref<Record<string, TilesetConfig>>({})

  // System Data (Database)
  const systemSwitches = ref<string[]>([])
  const systemVariables = ref<string[]>([])
  const systemStartMapId = ref(1)
  const systemStartX = ref(0)
  const systemStartY = ref(0)
  const systemPlayerGraphic = ref('img/characters/character.png')
  const systemScreenWidth = ref(1280)
  const systemScreenHeight = ref(720)
  const systemScreenZoom = ref(1.0)

  // Ensure initial size (default for new project or empty load)
  if (systemSwitches.value.length === 0) systemSwitches.value = new Array(20).fill('')
  if (systemVariables.value.length === 0) systemVariables.value = new Array(20).fill('')

  // Computed: Aktualna mapa
  const activeMap = computed(() => storedMaps.value.find((m) => m.id === activeMapID.value))

  // ==========================================
  // 2. PERSISTENCE (ZAPIS / ODCZYT)
  // ==========================================

  const loadProject = async (forceSelect = true): Promise<void> => {
    // If we are NOT forcing a new select, and the project is ALREADY loaded in the service,
    // we assume the Store is already synced or holding valid state.
    // We should NOT re-load from disk and overwrite potential unsaved changes in the Store.
    // BUT we must verify the store actually has data (e.g. after a page refresh, Service is loaded but Store is empty).
    if (!forceSelect && ProjectService.isLoaded() && storedMaps.value.length > 0) {
      return
    }

    if (forceSelect) {
      const path = await ProjectService.selectProject()
      if (!path) return
    } else if (!ProjectService.isLoaded()) {
      return
    }

    // 1. Load System Data
    const sysData = await ProjectService.loadSystemData()
    if (sysData) {
      systemSwitches.value = sysData.switches
      systemVariables.value = sysData.variables
      systemStartMapId.value = sysData.startMapId
      systemStartX.value = sysData.startX
      systemStartY.value = sysData.startY
      systemPlayerGraphic.value = sysData.playerGraphic
      systemScreenWidth.value = sysData.screenWidth || 1280
      systemScreenHeight.value = sysData.screenHeight || 720
      systemScreenZoom.value = sysData.screenZoom || 1.0
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
        projectName: 'My Z Project',
        version: '1.0.0',
        switches: systemSwitches.value,
        variables: systemVariables.value,
        startMapId: systemStartMapId.value,
        startX: systemStartX.value,
        startY: systemStartY.value,
        playerGraphic: systemPlayerGraphic.value,
        screenWidth: systemScreenWidth.value,
        screenHeight: systemScreenHeight.value,
        screenZoom: systemScreenZoom.value
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
    } catch (e) {
      console.error('Save failed', e)
    }
  }

  // Auto-Save System Data Changes
  watch(
    [
      systemSwitches,
      systemVariables,
      systemStartMapId,
      systemStartX,
      systemStartY,
      systemPlayerGraphic,
      systemScreenWidth,
      systemScreenHeight,
      systemScreenZoom
    ],
    () => {
      // Only save if project is actually loaded and we are not in initial load phase?
      // ProjectService.isLoaded() check is good.
      if (ProjectService.isLoaded()) {
        const sysData: import('@engine/types').ZSystemData = {
          projectName: 'My Z Project',
          version: '1.0.0',
          switches: systemSwitches.value,
          variables: systemVariables.value,
          startMapId: systemStartMapId.value,
          startX: systemStartX.value,
          startY: systemStartY.value,
          playerGraphic: systemPlayerGraphic.value,
          screenWidth: systemScreenWidth.value,
          screenHeight: systemScreenHeight.value,
          screenZoom: systemScreenZoom.value
        }
        ProjectService.saveSystemData(sysData).catch((err) =>
          console.error('Auto-save system failed', err)
        )
      }
    },
    { deep: true }
  )

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

  const tilesets = useTilesets(activeMap, storedTilesetConfigs, () => {
    ProjectService.saveTilesets(storedTilesetConfigs.value)
  })

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
    cursorX,
    cursorY,

    // Viewport States
    mapViewportStates,

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
    systemVariables,
    systemStartMapId,
    systemStartX,
    systemStartY,
    systemPlayerGraphic,
    systemScreenWidth,
    systemScreenHeight,
    systemScreenZoom
  }
})
