/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ZEngine, SceneManager, PlayerSystem, EntityRenderSystem } from '@z-engine/core'
import { GameDataProvider } from './GameDataProvider.js'

// Initialize game
async function init() {
  const container = document.getElementById('game-container')
  if (!container) {
    console.error('Game container not found!')
    return
  }

  // 1. Initialize Engine
  console.log('Initializing Engine...')
  const engine = new ZEngine()
  window.$zEngine = engine // Debug access

  const provider = new GameDataProvider()
  engine.setDataProvider(provider)

  // 2. Init with TILE_SIZE 48
  await engine.init(container, 48)
  console.log('Engine initialized')

  // 3. Load System Data to get Start Player Position and Map
  const systemData = await provider.getSystemData()
  if (!systemData) {
    console.warn('System data failed to load')
  }

  // Set Player Graphic
  const entitySystem = engine.services.get(EntityRenderSystem)
  if (systemData && systemData.playerGraphic) {
    await entitySystem.setPlayerGraphic(systemData.playerGraphic)
  }

  // 4. Load Start Map
  const startMapId = systemData ? systemData.startMapId : 1
  // const savedData = null // TODO: Load save game if exists

  const sceneManager = engine.services.require(SceneManager)
  const mapData = await provider.getMap(startMapId)

  if (mapData) {
    await sceneManager.loadMap(mapData)
  } else {
    console.error('Failed to load start map')
  }

  // 5. Set Player Position
  const playerSystem = engine.services.require(PlayerSystem)
  if (systemData) {
    playerSystem.x = systemData.startX
    playerSystem.y = systemData.startY
    playerSystem.snapToGrid()
  }

  // 6. Set Map Change Callback
  sceneManager.setMapChangeCallback(async (mapId, x, y) => {
    const nextMap = await provider.getMap(mapId)
    if (nextMap) {
      // Sync size for the target map
      const tileSize = 48 // Standard
      const w = nextMap.width * tileSize
      const h = nextMap.height * tileSize

      // Update container style
      container.style.width = `${w}px`
      container.style.height = `${h}px`

      // Notify engine
      engine.resize(w, h)

      await sceneManager.loadMap(nextMap)
      playerSystem.x = x
      playerSystem.y = y
      playerSystem.snapToGrid()
    }
  })

  // 7. Start Loop
  engine.setMode('play')
  console.log('Game loop started')
}

init()
