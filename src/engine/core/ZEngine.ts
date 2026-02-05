import { Application, Container } from '@engine/utils/pixi'
import ZLogger from '@engine/utils/ZLogger'
import { ZEventBus } from '@engine/core/ZEventBus'
import { IEngineContext, ZDataProvider, ZSystemData } from '@engine/types'

// Managers
import { SceneManager } from '@engine/managers/SceneManager'
import { ToolManager } from '@engine/managers/ToolManager'
import { HistoryManager } from '@engine/managers/HistoryManager'
import { GameStateManager } from '@engine/managers/GameStateManager'
import { InputManager } from '@engine/managers/InputManager'
import { TextureManager } from '@engine/managers/TextureManager'
import { MapManager } from '@engine/managers/MapManager'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { AudioManager } from '@engine/managers/AudioManager'
import { SaveManager } from '@engine/managers/SaveManager'

// Systems
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { GhostSystem } from '@engine/systems/GhostSystem'
import { GridSystem } from '@engine/systems/GridSystem'
import { MessageSystem } from '@engine/systems/MessageSystem'
import { TransitionSystem } from '@engine/systems/TransitionSystem'
import { ErrorSystem } from '@engine/systems/ErrorSystem'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { EventSystem } from '@engine/systems/EventSystem'
import { MenuSystem } from '@engine/systems/MenuSystem'

// Config Token
export class EngineConfig {
  public mode: 'edit' | 'play' = 'edit'
}

/**
 * ZEngine - Composition Root
 * Central point where all systems are wired together manually.
 */
export class ZEngine implements IEngineContext {
  public app: Application

  public dataProvider: ZDataProvider | null = null
  public systemData: ZSystemData | null = null

  // 1. Core Services (Initialized in Constructor)
  public config: EngineConfig
  public eventBus: ZEventBus
  public input: InputManager
  public audio: AudioManager
  public textures: TextureManager
  public tilesets: TilesetManager
  public map: MapManager

  // 2. State & Logic Managers (Initialized in Constructor)
  public gameState: GameStateManager
  public history: HistoryManager
  public tools: ToolManager
  public scenes: SceneManager // Implements IEngineContext
  public save: SaveManager

  // 3. Logic Systems (Initialized in Constructor)
  public physics: PhysicsSystem
  public player: PlayerSystem
  public events: EventSystem
  public menus: MenuSystem

  // 4. Visual Systems (Initialized in Init - require Stage/TileSize)
  public renderer!: RenderSystem
  public entities!: EntityRenderSystem
  public ghost!: GhostSystem
  public grid!: GridSystem
  public transitions!: TransitionSystem
  public messages!: MessageSystem
  public errors!: ErrorSystem

  private sceneLayer: Container
  private globalLayer: Container
  private isBooted: boolean = false

  constructor() {
    this.app = new Application()
    this.config = new EngineConfig()

    // --- Phase 1: Foundation ---
    this.eventBus = new ZEventBus()
    this.input = new InputManager()
    this.audio = new AudioManager()
    this.textures = new TextureManager()
    this.tilesets = new TilesetManager()
    this.map = new MapManager()

    // --- Phase 2: State & Data ---
    this.gameState = new GameStateManager(this.eventBus)
    this.history = new HistoryManager(this.map)

    // --- Phase 3: Logic Systems (Dependency Injection) ---
    this.physics = new PhysicsSystem(this.map, this.tilesets)
    this.player = new PlayerSystem(this.input, this.physics, this.eventBus, this.map)
    this.events = new EventSystem(this.physics, this.gameState, this.eventBus, this.map)
    this.tools = new ToolManager(this.map, this.history)
    this.save = new SaveManager(this.eventBus, this.gameState)

    // --- Phase 4: Scene Manager ---
    this.scenes = new SceneManager(this)
    this.menus = new MenuSystem(this.eventBus, this.input, this.scenes)
    this.events.setEngineContext(this)

    this.sceneLayer = new Container()
    this.sceneLayer.label = 'SceneLayer'
    this.globalLayer = new Container()
    this.globalLayer.label = 'GlobalLayer'
  }

  public async init(container: HTMLElement, tileSize: number): Promise<void> {
    // 1. Init Pixi Application
    await this.app.init({
      backgroundColor: 0x000000,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      eventMode: 'static',
      antialias: false
    })

    this.setupCanvas(container)
    this.setupStage()

    try {
      this.renderer = new RenderSystem(
        this.sceneLayer,
        this.textures,
        this.map,
        this.tilesets,
        tileSize
      )

      this.history.registerRenderer(this.renderer)
      this.tools.registerRenderer(this.renderer)

      this.entities = new EntityRenderSystem(
        this.player,
        this.events,
        this.renderer,
        this.textures,
        this.map,
        this.eventBus,
        tileSize
      )

      // Editor Helpers
      this.ghost = new GhostSystem(
        this.sceneLayer,
        this.textures,
        this.map,
        this.eventBus,
        tileSize
      )
      this.grid = new GridSystem(this.sceneLayer, tileSize)

      // UI & Global Overlays (Attached to GlobalLayer)
      this.transitions = new TransitionSystem()
      this.messages = new MessageSystem(this.input, this.eventBus, this.textures, this.events)

      this.messages.init()

      this.errors = new ErrorSystem()

      this.globalLayer.addChild(this.transitions.container)
      this.globalLayer.addChild(this.messages.container)
      this.globalLayer.addChild(this.errors.container)

      // Resize systems to match screen
      const { width, height } = this.app.screen
      this.transitions.resize(width, height)
      this.messages.resize(width, height)
      this.errors.resize(width, height)

      // 3. Init Logic Systems that need TileSize
      this.player.init(tileSize)
      this.events.init(tileSize)

      // Register logic systems to save manager
      this.save.registerSystems(this.player, this.map)

      // 4. Boot Logic
      this.entities.onBoot() // Loads initial sprites
      this.events.onBoot() // Sets up listeners
      this.menus.onBoot() // Listen for MenuRequested

      // 5. Connect Scene Manager
      this.scenes.setSceneLayer(this.sceneLayer)

      // 6. Start Loop
      this.app.ticker.add((ticker) => this.tick(ticker.deltaMS))

      this.isBooted = true
      ZLogger.log('Hello there 👋🏽 This game is using the best Engine in the world!')
    } catch (e) {
      ZLogger.error('Error during init:', e)
      this.errors?.show(e as Error)
    }
  }

  private tick(delta: number): void {
    // Explicit Update Order

    // 1. Update Input (Prepare for this frame)
    this.input.update() // Note: Input usually updates at start or end of frame

    // 2. Logic Updates (Only in Play Mode usually, but handled inside systems)
    if (this.config.mode === 'play') {
      this.player.onUpdate(delta)
      this.events.onUpdate(delta)
    }

    // 3. Scene Logic (Updates current scene)
    this.scenes.update(delta)

    // 4. Visual Updates
    this.renderer.onUpdate()

    if (this.config.mode === 'play') {
      this.entities.onUpdate(delta)
      this.messages.onUpdate()
      this.transitions.onUpdate(delta)
    } else {
      // Edit Mode Systems
      this.ghost.onUpdate()
      this.grid.onUpdate()
    }
  }

  public async setMode(mode: 'edit' | 'play'): Promise<void> {
    this.config.mode = mode

    ZLogger.log(`Switched to ${mode} mode`)

    // Visibility Toggles
    if (mode === 'play') {
      this.entities.setVisible(true)
      this.ghost.setVisible(false)
      this.grid.setVisible(false)
      this.messages.resize(this.app.screen.width, this.app.screen.height)
    } else {
      this.entities.setVisible(false)
      this.ghost.setVisible(true)
      this.grid.setVisible(true)
    }
  }

  /**
   * Propagates tool changes to editor-mode systems (like GhostSystem).
   */
  public setTool(tool: import('@engine/types').ZTool): void {
    if (this.ghost) {
      this.ghost.setTool(tool)
    }
  }

  /**
   * Sets the DataProvider and propagates it to managers that need explicit reference.
   * Note: SceneManager accesses it directly via EngineContext, so strict propagation there isn't needed,
   * but we do it for managers that might cache it.
   */
  public setDataProvider(provider: ZDataProvider): void {
    this.dataProvider = provider

    this.textures.setDataProvider(provider)
    this.tools.setDataProvider(provider)
    this.history.setDataProvider(provider)
    this.save.setDataProvider(provider)

    ZLogger.info('Data Provider set')
  }

  public setSystemData(data: ZSystemData): void {
    this.systemData = data
    ZLogger.info('System Data set')
  }

  public resize(width: number, height: number): void {
    if (!this.isBooted) return

    this.transitions.resize(width, height)
    this.messages.resize(width, height)
    this.errors.resize(width, height)

    this.app.renderer.resize(width, height)
    this.app.stage.hitArea = this.app.screen
  }

  public destroy(): void {
    if (!this.isBooted) return

    this.input.destroy()
    this.ghost.onDestroy()
    this.grid.onDestroy()
    this.renderer.onDestroy()
    this.entities.onDestroy()

    this.app.destroy({ removeView: true })
    ZLogger.log('Goodbye 👋🏽 Everything is gone!')
  }

  private setupCanvas(container: HTMLElement): void {
    this.app.canvas.tabIndex = 1
    this.app.canvas.style.outline = 'none'
    this.app.canvas.addEventListener('mouseenter', () => this.app.canvas.focus())
    container.appendChild(this.app.canvas)
  }

  private setupStage(): void {
    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen
    this.app.stage.sortableChildren = true
    this.app.stage.addChild(this.sceneLayer)
    this.app.stage.addChild(this.globalLayer)
  }
}
