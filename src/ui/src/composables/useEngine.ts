import { ref, shallowRef, onUnmounted, watch, nextTick, type Ref } from 'vue'
import { until } from '@vueuse/core'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { ProjectService } from '../services/ProjectService'
import { ZLayer, ZTool, type TileSelection, type ZDataProvider } from '@engine/types'
import { TextureManager } from '@engine/managers/TextureManager'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { SceneManager } from '@engine/managers/SceneManager'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { GridSystem } from '@engine/systems/GridSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { TransitionSystem } from '@engine/systems/TransitionSystem'

export const useEngine = (
  canvasContainer: Ref<HTMLElement | null>
): {
  engine: Ref<ZEngine | null>
  isEngineReady: Ref<boolean>
  isLoading: Ref<boolean>
  initEngine: () => Promise<void>
} => {
  const store = useEditorStore()
  const engine = shallowRef<ZEngine | null>(null)
  const isEngineReady = ref(false)
  const isLoading = ref(false)

  // Data Provider Definition
  const dataProvider: ZDataProvider = {
    getMap: async (id: number) => {
      return store.maps.find((m) => m.id === id) || null
    },
    getTilesetConfigs: async () => {
      return store.tilesetConfigs
    },
    getTilesetUrl: (slotId: string) => {
      const ts = store.tilesets.find((t) => t.id === slotId)
      return ts?.url || ''
    },
    setTileAt: (
      x: number,
      y: number,
      tile: TileSelection | null,
      isStacking: boolean,
      layer: ZLayer
    ) => {
      store.setTileAt(x, y, tile, isStacking, layer)
    },
    resolveAssetUrl: (path: string) => {
      return ProjectService.resolveAssetUrl(path)
    }
  }

  const initEngine = async (): Promise<void> => {
    await nextTick()

    if (!canvasContainer.value || !store.activeMap) return
    if (engine.value) engine.value.destroy()

    isEngineReady.value = false

    // Resize container to map
    const w = store.activeMap.width * store.tileSize
    const h = store.activeMap.height * store.tileSize
    canvasContainer.value.style.width = `${w}px`
    canvasContainer.value.style.height = `${h}px`

    const newEngine = new ZEngine()
    window.$zEngine = newEngine

    newEngine.setDataProvider(dataProvider)

    // Preload Characters from Project Folder
    try {
      const charFiles = await ProjectService.getProjectFiles('img/characters')
      const pngFiles = charFiles.filter((f) => f.endsWith('.png'))

      await Promise.all(
        pngFiles.map((filename) => {
          const key = `img/characters/${filename}`
          const url = ProjectService.resolveAssetUrl(key)
          return newEngine.services.require(TextureManager).loadTileset(key, url)
        })
      )
    } catch (e) {
      console.warn('Failed to preload character textures:', e)
    }
    await newEngine.init(canvasContainer.value, store.tileSize)

    if (store.activeMap) {
      await newEngine.services.require(SceneManager).loadMap(store.activeMap)
    }

    // Now set the engine ref to trigger watchers with a fully initialized engine
    engine.value = newEngine

    // Grid Size setup
    const isEventTool = store.currentTool === ZTool.event
    const gridSystem = newEngine.services.get(GridSystem)
    gridSystem?.setSize(
      isEventTool ? store.activeMap.width : 0,
      isEventTool ? store.activeMap.height : 0
    )

    const renderSystem = newEngine.services.get(RenderSystem)
    isEngineReady.value = renderSystem?.IsMapLoaded() ?? false

    // Configure Entity Render System (Player Graphic)
    const entitySystem = newEngine.services.get(EntityRenderSystem)
    if (entitySystem) {
      await entitySystem.setPlayerGraphic(store.systemPlayerGraphic)
    }

    // Set Initial Player Position if on Start Map
    const playerSystem = newEngine.services.get(PlayerSystem)
    if (playerSystem && store.activeMap) {
      if (store.activeMap.id === store.systemStartMapId) {
        playerSystem.x = store.systemStartX
        playerSystem.y = store.systemStartY
      } else {
        playerSystem.x = 0
        playerSystem.y = 0
      }
      playerSystem.snapToGrid()
    }

    // Setup Map Change Callback
    newEngine.services.require(SceneManager).setMapChangeCallback(async (mapId, x, y) => {
      const targetMap = store.maps.find((m) => m.id === mapId)
      if (targetMap) {
        // Update store to reflect new active map (for UI sync)
        store.setActiveMap(mapId)

        // Load the map through SceneManager (handles tilesets, rendering, etc.)
        await newEngine.services.require(SceneManager).loadMap(targetMap)

        // Set player position after map is loaded
        const playerSystem = newEngine.services.get(PlayerSystem)
        if (playerSystem) {
          playerSystem.x = x
          playerSystem.y = y
          playerSystem.snapToGrid()
        }
      } else {
        console.error(`[GameViewport] Transfer Failed: Map ${mapId} not found`)
      }
    })
  }

  // --- Watchers for Sync ---

  // 1. Map Switching
  watch(
    () => store.activeMap?.id,
    async (newId) => {
      if (newId && store.activeMap && engine.value) {
        // Skip automatic loading in play mode to avoid race conditions
        // In play mode, SceneManager handles all map loading via setMapChangeCallback
        if (store.isTestMode) {
          return
        }

        isLoading.value = true
        try {
          const w = store.activeMap.width * store.tileSize
          const h = store.activeMap.height * store.tileSize
          engine.value.services.get(TransitionSystem)?.resize(w, h)

          // Resize container
          if (canvasContainer.value) {
            canvasContainer.value.style.width = `${w}px`
            canvasContainer.value.style.height = `${h}px`
          }

          await engine.value.services.require(SceneManager).loadMap(store.activeMap)
        } finally {
          isLoading.value = false
        }
      }
    },
    { immediate: true } // Initial load handled by initEngine mostly, but this ensures sync
  )

  // 2. Tileset Config Sync
  watch(
    () => store.tilesetConfigs,
    (newConfigs) => {
      if (engine.value && engine.value.services.has(TilesetManager)) {
        engine.value.services.require(TilesetManager).setConfigs(newConfigs)
        engine.value.services.get(RenderSystem)?.refresh()
      }
    },
    { deep: true, immediate: true }
  )

  // 3. Tool & Grid Sync
  watch(
    () => store.currentTool,
    () => {
      if (engine.value && store.activeMap) {
        const gridSystem = engine.value.services.get(GridSystem)
        if (gridSystem) {
          const isEventTool = store.currentTool === ZTool.event
          gridSystem.setSize(
            isEventTool ? store.activeMap.width : 0,
            isEventTool ? store.activeMap.height : 0
          )
        }
      }
    }
  )

  // 4. Layer Dimming & Focus
  watch(
    () => ({
      eng: engine.value,
      layer: store.activeLayer,
      isTest: store.isTestMode,
      tool: store.currentTool,
      _mapId: store.activeMap?.id // Track map ID to refresh markers on map change
    }),
    async ({ eng, layer, isTest, tool }, old) => {
      if (eng) {
        const renderSystem = eng.services.get(RenderSystem)
        if (renderSystem) {
          // Only trigger mode switch if isTest actually changed OR if engine just became available
          if (isTest !== old?.isTest || eng !== old?.eng) {
            eng.setMode(isTest ? 'play' : 'edit')
          }

          if (isTest) {
            renderSystem.updateLayerDimming(null)
            renderSystem.setEventMarkersVisible(false)
            renderSystem.hidePlayerStartMarker()

            // GAME START LOGIC
            const systemStartMapId = store.systemStartMapId

            // If current map is NOT the start map, load the start map
            if (store.activeMap && store.activeMap.id !== systemStartMapId) {
              console.log('[GameStart] Switching to Start Map:', systemStartMapId)

              // 1. Trigger Map Switch
              store.setActiveMap(systemStartMapId)

              // 2. Wait for loading to finish
              await nextTick()
              await until(isLoading).toBe(false)
            }

            // 3. Set Player Position (Now we are on the correct map)
            const playerSystem = eng.services.get(PlayerSystem)
            if (playerSystem) {
              playerSystem.x = store.systemStartX
              playerSystem.y = store.systemStartY
              playerSystem.snapToGrid()

              // Force graphic update
              const entitySystem = eng.services.get(EntityRenderSystem)
              entitySystem?.setPlayerGraphic(store.systemPlayerGraphic)
              // Ensure entity is visible
              entitySystem?.setVisible(true)
            }
          } else {
            // EDIT MODE
            if (tool === ZTool.event) {
              renderSystem.updateLayerDimming(ZLayer.events, true)
              renderSystem.setEventMarkersVisible(true)

              // Show Player Start Marker if we are on the start map
              if (store.activeMap && store.activeMap.id === store.systemStartMapId) {
                renderSystem.setPlayerStartMarker(
                  store.systemStartX,
                  store.systemStartY,
                  store.systemPlayerGraphic
                )
              } else {
                renderSystem.hidePlayerStartMarker()
              }
            } else {
              renderSystem.updateLayerDimming(layer as ZLayer, false)
              renderSystem.setEventMarkersVisible(false)
              renderSystem.hidePlayerStartMarker()
            }
          }
        }
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    engine.value?.destroy()
    window.$zEngine = null
  })

  return {
    engine,
    isEngineReady,
    isLoading,
    initEngine
  }
}
