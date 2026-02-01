import { Container } from '@engine/utils/pixi'
import { ServiceLocator, ZEventBus } from '@engine/core'
import {
  TextureManager,
  InputManager,
  TilesetManager,
  MapManager,
  HistoryManager,
  ToolManager,
  SceneManager,
  GameStateManager
} from '@engine/managers'
import {
  RenderSystem,
  GhostSystem,
  GridSystem,
  PlayerSystem,
  EventSystem,
  EntityRenderSystem,
  TransitionSystem,
  MessageSystem,
  PhysicsSystem,
  ErrorSystem
} from '@engine/systems'

export class EngineBootstrapper {
  public static registerManagers(services: ServiceLocator): void {
    services.register(TextureManager, new TextureManager())
    services.register(InputManager, new InputManager())
    services.register(TilesetManager, new TilesetManager())
    services.register(MapManager, new MapManager())
    services.register(HistoryManager, new HistoryManager(services))
    services.register(ToolManager, new ToolManager(services))
    services.register(SceneManager, new SceneManager(services))
    services.register(ZEventBus, new ZEventBus())
    services.register(GameStateManager, new GameStateManager(services))
  }

  public static registerSystems(
    services: ServiceLocator,
    stage: Container,
    tileSize: number,
    screenWidth: number,
    screenHeight: number
  ): void {
    services.register(RenderSystem, new RenderSystem(stage, services, tileSize))
    services.register(GhostSystem, new GhostSystem(stage, services, tileSize))
    services.register(GridSystem, new GridSystem(stage, services, tileSize))
    services.register(PhysicsSystem, new PhysicsSystem(services))
    services.register(PlayerSystem, new PlayerSystem(services, tileSize))
    services.register(EventSystem, new EventSystem(services))
    services.register(EntityRenderSystem, new EntityRenderSystem(services, tileSize))

    const transitionSystem = new TransitionSystem(services)
    services.register(TransitionSystem, transitionSystem)
    transitionSystem.resize(screenWidth, screenHeight)

    const messageSystem = new MessageSystem(services)
    services.register(MessageSystem, messageSystem)
    messageSystem.resize(screenWidth, screenHeight)

    const errorSystem = new ErrorSystem(services)
    services.register(ErrorSystem, errorSystem)
    errorSystem.resize(screenWidth, screenHeight)
  }
}
