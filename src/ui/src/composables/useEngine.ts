import { ref, shallowRef, onUnmounted, watch, type Ref } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { ProjectService } from '../services/ProjectService'
import { ZLayer, ZTool, type TileSelection, type ZDataProvider, type ZMap } from '@engine/types'
import { TextureManager } from '@engine/managers/TextureManager'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { SceneManager } from '@engine/managers/SceneManager'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { GridSystem } from '@engine/systems/GridSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { Scene_Map } from '@engine/scenes/Scene_Map'
import { nextTick } from 'vue'

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
    globalThis.__PIXI_APP__ = newEngine.app

    newEngine.setDataProvider(dataProvider)

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

    // Initial sync
    syncCanvasSize(newEngine)
    if (store.activeMap) {
      await newEngine.services.require(SceneManager).goto(Scene_Map, {
        mapOrId: store.activeMap
      })
    }

    // Now set the engine ref to trigger watchers with a fully initialized engine
    engine.value = newEngine

    // Grid Size setup
    syncGridSize(newEngine)

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

        // Sync size for the target map before loading logic
        syncCanvasSize(newEngine, targetMap)

        // Load the map through SceneManager
        await newEngine.services.require(SceneManager).goto(Scene_Map, {
          mapOrId: targetMap,
          playerX: x,
          playerY: y
        })
      } else {
        console.error(`[GameViewport] Transfer Failed: Map ${mapId} not found`)
      }
    })
  }

  const syncCanvasSize = (eng: ZEngine, targetMapOverride?: ZMap): void => {
    const map = targetMapOverride || store.activeMap
    if (!map || !canvasContainer.value) {
      console.warn('[useEngine] syncCanvasSize failed: map or container missing')
      return
    }

    if (store.isTestMode) {
      // In Play Mode, we want the canvas to fill the viewport (100%)
      // We rely on the parent container (GameViewport) to provide the size via CSS
      canvasContainer.value.style.width = '100%'
      canvasContainer.value.style.height = '100%'

      // Use the actual client dimensions for the engine
      const rect = canvasContainer.value.getBoundingClientRect()
      eng.resize(rect.width, rect.height)
    } else {
      // In Editor Mode, we want the canvas to be the size of the map
      const w = map.width * store.tileSize
      const h = map.height * store.tileSize

      canvasContainer.value.style.width = `${w}px`
      canvasContainer.value.style.height = `${h}px`

      eng.resize(w, h)
    }
  }

  const syncGridSize = (eng: ZEngine): void => {
    if (!store.activeMap) return
    const gridSystem = eng.services.get(GridSystem)
    if (gridSystem) {
      // Show grid ONLY if Event tool is active AND NOT in test mode
      const isVisible = store.currentTool === ZTool.event && !store.isTestMode
      gridSystem.setSize(
        isVisible ? store.activeMap.width : 0,
        isVisible ? store.activeMap.height : 0
      )
    }
  }

  // --- Watchers for Sync ---

  // 1. Map Switching & Resizing
  watch(
    () => ({
      id: store.activeMap?.id,
      w: store.activeMap?.width,
      h: store.activeMap?.height
    }),
    async (curr, prev) => {
      if (curr.id && store.activeMap && engine.value) {
        // Handle Resize even in play mode if dimensions changed?
        // User reports that resizing in UI doesn't adjust canvas.
        const sizeChanged = curr.w !== prev?.w || curr.h !== prev?.h
        const mapChanged = curr.id !== prev?.id

        if (mapChanged || sizeChanged) {
          // Skip automatic loading in play mode ONLY IF it's just a map change (SceneManager handles that)
          // BUT if it's a size change in the editor UI, we want to sync it.
          if (store.isTestMode && mapChanged) {
            return
          }

          isLoading.value = true
          try {
            syncCanvasSize(engine.value)

            if (mapChanged) {
              await engine.value.services.require(SceneManager).goto(Scene_Map, {
                mapOrId: store.activeMap
              })
            }
            syncGridSize(engine.value)
          } finally {
            isLoading.value = false
          }
        }
      }
    },
    { immediate: true }
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
      _mapId: store.activeMap?.id, // Track map ID to refresh markers on map change
      _startX: store.systemStartX,
      _startY: store.systemStartY,
      _startMap: store.systemStartMapId,
      _startGraphic: store.systemPlayerGraphic
    }),
    async ({ eng, layer, isTest, tool }, old) => {
      if (eng) {
        const renderSystem = eng.services.get(RenderSystem)
        if (renderSystem) {
          // Only trigger mode switch if isTest actually changed OR if engine just became available
          if (isTest !== old?.isTest || eng !== old?.eng) {
            await eng.setMode(isTest ? 'play' : 'edit')
          }

          if (isTest) {
            renderSystem.updateLayerDimming(null)
            renderSystem.setEventMarkersVisible(false)
            renderSystem.hidePlayerStartMarker()

            // GAME START LOGIC
            // Map is already switched to start map by EditorBar.togglePlay()
            // Just set player position
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
