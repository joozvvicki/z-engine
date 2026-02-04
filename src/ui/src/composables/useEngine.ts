import { ref, shallowRef, onUnmounted, watch, type Ref } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { useDatabaseStore } from '@ui/stores/database'
import { ProjectService } from '../services/ProjectService'
import { ZLayer, ZTool, type TileSelection, type ZDataProvider, type ZMap } from '@engine/types'
import { TextureManager } from '@engine/managers/TextureManager'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { SceneManager } from '@engine/managers/SceneManager'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { GridSystem } from '@engine/systems/GridSystem'

import { SceneMap } from '@engine/scenes/SceneMap'
import { nextTick } from 'vue'

export const useEngine = (
  canvasContainer: Ref<HTMLElement | null>,
  isEditorView: boolean = false
): {
  engine: Ref<ZEngine | null>
  isEngineReady: Ref<boolean>
  isLoading: Ref<boolean>
  initEngine: () => Promise<void>
} => {
  const store = useEditorStore()
  const db = useDatabaseStore()
  const engine = shallowRef<ZEngine | null>(null)
  const isEngineReady = ref(false)
  const isLoading = ref(false)

  // ... (dataProvider remains same)
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
    },
    getSystemData: async () => {
      return {
        projectName: store.systemProjectName,
        version: '1.0.0',
        switches: store.systemSwitches,
        variables: store.systemVariables,
        startMapId: store.systemStartMapId,
        startX: store.systemStartX,
        startY: store.systemStartY,
        screenWidth: store.systemScreenWidth,
        screenHeight: store.systemScreenHeight,
        screenZoom: store.systemScreenZoom,
        startingParty: store.systemStartingParty,
        sounds: store.systemSounds
      }
    }
  }

  const initEngine = async (): Promise<void> => {
    isLoading.value = true
    await nextTick()

    if (!canvasContainer.value || !store.activeMap) {
      isLoading.value = false
      return
    }

    try {
      if (engine.value) engine.value.destroy()
      isEngineReady.value = false

      const newEngine = new ZEngine()
      window.$zEngine = newEngine
      globalThis.__PIXI_APP__ = newEngine.app

      newEngine.setDataProvider(dataProvider)
      newEngine.setSystemData({
        projectName: store.systemProjectName,
        version: '1.0.0',
        startMapId: store.systemStartMapId,
        startX: store.systemStartX,
        startY: store.systemStartY,
        screenWidth: store.systemScreenWidth,
        screenHeight: store.systemScreenHeight,
        screenZoom: store.systemScreenZoom || 1.0,
        switches: [],
        variables: [],
        startingParty: store.systemStartingParty,
        sounds: store.systemSounds
      })

      // Preload assets
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
        console.warn('[useEngine] Failed to preload character textures:', e)
      }

      // 1. Initialize Engine (Boots lifecycle)
      await newEngine.init(canvasContainer.value, store.tileSize)

      // 2. Set Mode (Requires systems to be registered during init)
      await newEngine.setMode(isEditorView ? 'edit' : 'play')

      // Initial sync
      syncCanvasSize(newEngine)

      const sceneManager = newEngine.services.require(SceneManager)
      if (isEditorView) {
        if (store.activeMap) {
          const isStartMap = store.activeMap.id === store.systemStartMapId
          await sceneManager.goto(SceneMap, {
            mapOrId: store.activeMap,
            playerX: isStartMap ? store.systemStartX : 0,
            playerY: isStartMap ? store.systemStartY : 0
          })
        }
      } else {
        // PLAYTEST MODE: Start from Title directly or Boot
        const { SceneIntro } = await import('@engine/scenes/SceneIntro')
        await sceneManager.goto(SceneIntro, null, { fade: false })
      }

      // Now set the engine ref to trigger watchers with a fully initialized engine
      engine.value = newEngine

      // Grid Size setup
      syncGridSize(newEngine)

      const renderSystem = newEngine.services.get(RenderSystem)
      isEngineReady.value = renderSystem?.IsMapLoaded() ?? false

      const entitySystem = newEngine.services.get(EntityRenderSystem)
      if (entitySystem) {
        const actor1 = db.actors.find((a) => a.id === 1)
        if (actor1) {
          await entitySystem.setPlayerGraphic(
            actor1.character,
            actor1.characterX,
            actor1.characterY,
            actor1.characterSrcW,
            actor1.characterSrcH
          )
        }
      }

      // Setup Map Change Callback
      newEngine.services.require(SceneManager).setMapChangeCallback(async (mapId, x, y) => {
        const targetMap = store.maps.find((m) => m.id === mapId)
        if (targetMap) {
          if (isEditorView) store.setActiveMap(mapId)
          syncCanvasSize(newEngine, targetMap)
          await newEngine.services.require(SceneManager).goto(SceneMap, {
            mapOrId: targetMap,
            playerX: x,
            playerY: y
          })
        }
      })

      // Give PIXI a moment to finalize first frame
      await new Promise((resolve) => setTimeout(resolve, 50))
    } catch (err) {
      console.error('[useEngine] Engine init failed:', err)
    } finally {
      isLoading.value = false
    }
  }

  const syncCanvasSize = (eng: ZEngine, targetMapOverride?: ZMap): void => {
    const map = targetMapOverride || store.activeMap
    if (!map || !canvasContainer.value) return

    if (!isEditorView) {
      // FIXED RESOLUTION SCALING
      const w = store.systemScreenWidth
      const h = store.systemScreenHeight
      canvasContainer.value.style.width = '100%'
      canvasContainer.value.style.height = '100%'
      canvasContainer.value.style.display = 'flex'
      canvasContainer.value.style.alignItems = 'center'
      canvasContainer.value.style.justifyContent = 'center'
      canvasContainer.value.style.background = '#000000'

      const canvas = eng.app.canvas
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.objectFit = 'contain'
      eng.resize(w, h)
    } else {
      // EDITOR MAP-SIZE SCALING
      const w = map.width * store.tileSize
      const h = map.height * store.tileSize
      canvasContainer.value.style.width = `${w}px`
      canvasContainer.value.style.height = `${h}px`
      canvasContainer.value.style.display = 'block'
      canvasContainer.value.style.background = 'transparent'

      const canvas = eng.app.canvas
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.objectFit = 'fill'
      eng.resize(w, h)
    }
  }

  const syncGridSize = (eng: ZEngine): void => {
    if (!store.activeMap) return
    const gridSystem = eng.services.get(GridSystem)
    if (gridSystem) {
      const isVisible = store.currentTool === ZTool.event && isEditorView
      gridSystem.setSize(
        isVisible ? store.activeMap.width : 0,
        isVisible ? store.activeMap.height : 0
      )
    }
  }

  const syncEditorVisualization = (): void => {
    if (!engine.value || !isEditorView) return
    const renderSystem = engine.value.services.get(RenderSystem)
    if (!renderSystem) return

    // If in Play Mode, hide ALL editor visuals
    if (engine.value.mode === 'play') {
      renderSystem.hidePlayerStartMarker()
      renderSystem.setEventMarkersVisible(false)
      renderSystem.updateLayerDimming(null, false)
      const gridSystem = engine.value.services.get(GridSystem)
      if (gridSystem) gridSystem.setSize(0, 0)
      return
    }

    // 1. Grid
    syncGridSize(engine.value)

    // 2. Layers & Markers
    if (store.currentTool === ZTool.event) {
      renderSystem.updateLayerDimming(null, true)
      renderSystem.setEventMarkersVisible(true)

      const activeMapId = store.activeMap?.id
      const isStartMap =
        activeMapId !== undefined &&
        activeMapId !== null &&
        Number(activeMapId) === Number(store.systemStartMapId)

      if (isStartMap) {
        const actor1 = db.actors.find((a) => a.id === 1)
        let charPath = actor1?.character || ''
        if (charPath && !charPath.startsWith('img/')) {
          charPath = `img/characters/${charPath}`
        }

        renderSystem.setPlayerStartMarker(
          store.systemStartX,
          store.systemStartY,
          charPath,
          actor1?.characterX || 0,
          actor1?.characterY || 0,
          actor1?.characterSrcX,
          actor1?.characterSrcY,
          actor1?.characterSrcW,
          actor1?.characterSrcH
        )
      } else {
        renderSystem.hidePlayerStartMarker()
      }
    } else {
      renderSystem.updateLayerDimming(store.activeLayer as ZLayer, false)
      renderSystem.setEventMarkersVisible(false)
      renderSystem.hidePlayerStartMarker()
    }
  }

  // --- Watchers for Sync ---

  // 1. Map Switching & Resizing (Only for Editor)
  watch(
    () => ({
      id: store.activeMap?.id,
      w: store.activeMap?.width,
      h: store.activeMap?.height
    }),
    async (curr, prev) => {
      if (!isEditorView) return // Playtest handles map changes via in-game logic

      if (curr.id && store.activeMap && engine.value) {
        const sizeChanged = curr.w !== prev?.w || curr.h !== prev?.h
        const mapChanged = curr.id !== prev?.id

        if (mapChanged || sizeChanged) {
          isLoading.value = true
          try {
            syncCanvasSize(engine.value)
            if (mapChanged) {
              await engine.value.services.require(SceneManager).goto(SceneMap, {
                mapOrId: store.activeMap
              })
            }
            syncEditorVisualization()
            syncGridSize(engine.value)
          } finally {
            isLoading.value = false
          }
        }
      }
    },
    { immediate: true }
  )

  // ... (Other watchers remain similar but should respect isEditorView)
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

  watch(
    () => store.currentTool,
    () => {
      if (engine.value && store.activeMap && isEditorView) {
        syncGridSize(engine.value)
      }
    }
  )

  watch(
    () => ({
      eng: engine.value,
      layer: store.activeLayer,
      tool: store.currentTool,
      activeMapId: store.activeMap?.id,
      systemStartMapId: store.systemStartMapId,
      systemStartX: store.systemStartX,
      systemStartY: store.systemStartY,
      dbLoaded: db.isLoaded
    }),
    () => {
      syncEditorVisualization()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    engine.value?.destroy()
    if (isEditorView) window.$zEngine = null
  })

  return {
    engine,
    isEngineReady,
    isLoading,
    initEngine
  }
}
