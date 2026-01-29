<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { ZEngine } from '@engine/core/ZEngine'
import { useEditorStore } from '@ui/stores/editor'
import { type FederatedPointerEvent } from '@engine/utils/pixi'
import { IconAlertTriangle } from '@tabler/icons-vue'
import EventEditor from './modal/EventEditor.vue'
import { ZLayer, ZTool } from '@engine/types'
import { useViewport } from '@ui/composables/useViewport'
import { useEditorTools } from '@ui/composables/useEditorTools'
import { nextTick } from 'vue'

const canvasContainer = ref<HTMLElement | null>(null)
let engine: ZEngine | null = null

const store = useEditorStore()
const isPointerDown = ref(false)
const target = ref<{ x: number; y: number } | null | undefined>(null)
const isEngineReady = ref(false)

const { scale, isPanning, handleWheel, startPan, updatePan, endPan, resetViewport } = useViewport()

const {
  shapeStartPos,
  activeEventCoords,
  activeEventId,
  handleInteraction,
  clearEventSelection,
  deleteSelection
} = useEditorTools()

const onPointerDown = (event: FederatedPointerEvent): void => {
  if (event.button === 1) {
    startPan(event.global.x, event.global.y)
    return
  }

  if (event.button !== 0 || !engine) return
  if (store.isTestMode) return // Block Editing in Play Mode

  target.value = engine.gridSystem?.getTileCoords(event)

  if (event.altKey && target.value) {
    store.pickTile(target.value.x, target.value.y)
    return
  }

  isPointerDown.value = true

  if (store.currentTool === ZTool.bucket) {
    handleInteraction(event, engine, true)
    store.recordHistory()
    return
  }

  if ([ZTool.rectangle, ZTool.circle, ZTool.select].includes(store.currentTool) && target.value) {
    shapeStartPos.value = target.value
  } else {
    handleInteraction(event, engine)
  }
}

const onPointerMove = (event: FederatedPointerEvent): void => {
  if (isPanning.value) {
    updatePan(event.global.x, event.global.y, canvasContainer.value)
    return
  }
  if (!engine) return

  target.value = engine.gridSystem?.getTileCoords(event)
  const tool = store.currentTool

  if (
    [ZTool.rectangle, ZTool.circle, ZTool.select].includes(tool) &&
    isPointerDown.value &&
    shapeStartPos.value
  ) {
    if (target.value) engine.ghostSystem?.updateShape(shapeStartPos.value, target.value, tool)
  } else {
    if (target.value)
      engine.ghostSystem?.update(target.value.x, target.value.y, store.selection, tool)

    if (isPointerDown.value && (tool === ZTool.brush || tool === ZTool.eraser)) {
      handleInteraction(event, engine)
      handleInteraction(event, engine)
    }
  }
}

const updateSelectionGhost = (): void => {
  if (engine && engine.ghostSystem && store.selectionCoords) {
    engine.ghostSystem.setSelectionBox(store.selectionCoords)
  } else if (engine && engine.ghostSystem) {
    engine.ghostSystem.setSelectionBox(null)
  }
}

watch(() => store.selectionCoords, updateSelectionGhost)

const onPointerUp = (event: FederatedPointerEvent): void => {
  if (isPanning.value) {
    endPan()
    return
  }

  if (isPointerDown.value) {
    if ([ZTool.rectangle, ZTool.circle, ZTool.event, ZTool.select].includes(store.currentTool)) {
      handleInteraction(event, engine, true)
    }
    store.recordHistory() // Save history after interaction loop ends
  }
  isPointerDown.value = false
  shapeStartPos.value = null
  engine?.ghostSystem?.hide()
}

const onWheel = (event: WheelEvent): void => {
  handleWheel(event, canvasContainer.value)
}

const initEngine = async (): Promise<void> => {
  await nextTick()

  if (!canvasContainer.value || !store.activeMap) return
  if (engine) engine.destroy()

  isEngineReady.value = false
  resetViewport(canvasContainer.value)

  const w = store.activeMap.width * store.tileSize
  const h = store.activeMap.height * store.tileSize
  canvasContainer.value.style.width = `${w}px`
  canvasContainer.value.style.height = `${h}px`

  engine = new ZEngine()
  await Promise.all(store.tilesets.map((ts) => engine!.textureManager.loadTileset(ts.id, ts.url)))

  // Preload Characters
  const charModules = import.meta.glob('@ui/assets/img/characters/*.png', {
    eager: true,
    as: 'url'
  })
  await Promise.all(
    Object.keys(charModules).map((path) => {
      const name = path.split('/').pop() || path
      return engine!.textureManager.loadTileset(name, charModules[path])
    })
  )

  await engine.init(canvasContainer.value, store.tileSize)
  // @ts-ignore
  window.$zEngine = engine

  engine.app.stage.on('pointerdown', onPointerDown)
  engine.app.stage.on('pointermove', onPointerMove)
  engine.app.stage.on('pointerup', onPointerUp)
  engine.app.stage.on('pointerup', onPointerUp)
  engine.app.stage.on('pointerleave', () => engine?.ghostSystem?.hide())

  engine.renderSystem?.setMap(store.activeMap)
  const isEventTool = store.currentTool === ZTool.event
  engine.gridSystem?.setSize(
    isEventTool ? store.activeMap.width : 0,
    isEventTool ? store.activeMap.height : 0
  )

  isEngineReady.value = engine.renderSystem?.IsMapLoaded() ?? false

  // Force sync configs immediately after engine creation
  if (store.tilesetConfigs) {
    engine.mapManager?.setTilesetConfigs(store.tilesetConfigs)
  }

  // Listen for Global Engine Events (like Transfer Player)
  // We use a custom event on window for now
  window.addEventListener('z-transfer-player', (e: Event) => {
    const customEvent = e as CustomEvent<{ mapId: number; x: number; y: number }>
    const { mapId, x, y } = customEvent.detail
    console.log(`[GameViewport] Received Transfer: Map ${mapId} @ ${x},${y}`)

    // 1. Check if Map exists
    const targetMap = store.maps.find((m) => m.id === mapId)
    if (targetMap) {
      // 2. Switch Map
      store.setActiveMap(mapId)

      // 3. Move Player (Need to wait for map load/engine update?)
      // Since setActiveMap triggers a watcher that calls setMap on engine,
      // checking engine state is tricky.
      // We can force set player pos immediately on the new engine instance or existing one.
      // But `store.activeMap` change might re-trigger things.
      // Let's defer player move slightly or ensure it persists?
      // For now, let's just create a temporary hack:
      // We assume the engine instance survives map switch if we don't destroy it.
      // Wait... `initEngine` destroys `engine`?
      // `initEngine` is called ON MOUNT.
      // `watch(activeMap)` only calls `engine.renderSystem.setMap`.
      // IT DOES NOT RE-CREATE ENGINE. Good.

      if (engine?.playerSystem) {
        engine.playerSystem.x = x
        engine.playerSystem.y = y
        // Force snap to avoid sliding from previous position
        // @ts-ignore
        engine.playerSystem.snapToGrid()
      }
    } else {
      console.error(`[GameViewport] Transfer Failed: Map ${mapId} not found`)
    }
  })
}

watch(
  () => store.activeMap,
  (newMap) => {
    // Deep clone map to avoid direct mutation issues or just pass reference?
    // Passing reference is fine as long as Engine treats it read-mostly or we handle reactivity.
    // Since map data is large, ref is better.
    if (newMap) {
      engine?.renderSystem?.setMap(JSON.parse(JSON.stringify(newMap))) // Clone to detach?
      // Reload events for the new map (Play Mode)
      engine?.entityRenderSystem?.loadEvents()
    }
  },
  { deep: true, immediate: true }
)

// Sync Tileset Configs
watch(
  () => store.tilesetConfigs,
  (newConfigs) => {
    if (engine && engine.mapManager) {
      engine.mapManager.setTilesetConfigs(newConfigs)
      // If configs change, we might need to re-render to apply new z-indexes?
      // Yes, because performDrawTile uses configs for zIndex.
      // Force full re-render?
      // engine.renderSystem?.forceFullRender() // Method not exists yet, but setMap triggers it.
      // We can trigger revisualization if needed.
      // For now, let's just update data. Visual update requires map reload or tile update.
      engine.renderSystem?.refresh()
    }
  },
  { deep: true, immediate: true }
)

watch(
  () => store.historyIndex,
  () => {
    if (store.activeMap && engine?.renderSystem && engine?.gridSystem) {
      engine.renderSystem.setMap(store.activeMap)
    }
  }
)
watch(
  () => store.currentTool,
  () => {
    if (engine?.renderSystem && engine?.gridSystem && store.activeMap) {
      const isEventTool = store.currentTool === ZTool.event
      engine.gridSystem.setSize(
        isEventTool ? store.activeMap.width : 0,
        isEventTool ? store.activeMap.height : 0
      )
    }
  }
)

// Centralized Display Logic: Layer Dimming & Event Visibility
watch(
  () => [store.activeLayer, store.isTestMode, store.currentTool],
  ([layer, isTest, tool]) => {
    if (engine && engine.renderSystem) {
      if (isTest) {
        engine.setMode('play')

        // Play Mode: Full Context, No Ghosts
        engine.renderSystem.updateLayerDimming(null)
        engine.renderSystem.setEventMarkersVisible(false)
      } else {
        engine.setMode('edit')

        // Edit Mode
        if (tool === ZTool.event) {
          // Event Tool: Exclusive Focus on Events Layer + Show Markers
          engine.renderSystem.updateLayerDimming(ZLayer.events, true)
          engine.renderSystem.setEventMarkersVisible(true)
        } else {
          // Standard Tool: Dim layers above active layer
          engine.renderSystem.updateLayerDimming(layer as ZLayer, false)
          engine.renderSystem.setEventMarkersVisible(true)
        }
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  isPointerDown.value = false
  endPan()

  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && engine) {
      // Only delete if we have a selection and engine is ready
      if (store.selectionCoords) {
        deleteSelection(engine)
      }
    }
  })

  await initEngine()
})

onUnmounted(() => {
  engine?.destroy()
  // @ts-ignore
  window.$zEngine = null
})
</script>

<template>
  <div
    class="w-full h-full overflow-hidden relative bg-white flex items-center justify-center outline-none"
    tabindex="0"
    @wheel.prevent="onWheel"
  >
    <div
      v-if="!store.activeMap"
      class="text-white/20 flex flex-col items-center pointer-events-none select-none"
    >
      <IconAlertTriangle class="w-16 h-16 mb-4" />
      <p>No Map Active</p>
    </div>

    <div
      v-else
      ref="canvasContainer"
      class="transition-opacity duration-300 delay-500 shadow-2xl bg-white border border-black/50 border-box"
    ></div>

    <div
      class="absolute bottom-0 px-4 py-1 w-full pointer-events-none flex items-center bg-white/50 backdrop-blur-sm justify-between text-[10px] text-black/40 font-mono uppercase z-10"
    >
      <span class="w-1/3 text-left">Location: {{ target?.x ?? '-' }}, {{ target?.y ?? '-' }}</span>
      <span class="w-1/3 text-center">Zoom: {{ Math.round(scale * 100) }}%</span>
      <span class="w-1/3 text-right text-black/60 font-black italic">Z Creator v0.1.0</span>
    </div>

    <EventEditor
      v-if="activeEventCoords"
      :event-id="activeEventId"
      :x="activeEventCoords.x"
      :y="activeEventCoords.y"
      @close="clearEventSelection"
    />
  </div>
</template>

<style scoped>
canvas {
  display: block;
  image-rendering: pixelated;
  will-change: transform;
  transition: none;
}
</style>
