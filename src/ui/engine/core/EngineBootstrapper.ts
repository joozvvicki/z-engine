import { ServiceLocator } from './ServiceLocator'
import { TextureManager } from '../managers/TextureManager'
import { InputManager } from '../managers/InputManager'
import { TilesetManager } from '../managers/TilesetManager'
import { MapManager } from '../managers/MapManager'
import { HistoryManager } from '../managers/HistoryManager'
import { ToolManager } from '../managers/ToolManager'
import { SceneManager } from '../managers/SceneManager'
import { ZEventBus } from './ZEventBus'
import { GameStateManager } from '../managers/GameStateManager'
import { RenderSystem } from '../systems/RenderSystem'
import { GhostSystem } from '../systems/GhostSystem'
import { GridSystem } from '../systems/GridSystem'
import { PlayerSystem } from '../systems/PlayerSystem'
import { EventSystem } from '../systems/EventSystem'
import { EntityRenderSystem } from '../systems/EntityRenderSystem'
import { TransitionSystem } from '../systems/TransitionSystem'
import { MessageSystem } from '../systems/MessageSystem'
import { PhysicsSystem } from '../systems/PhysicsSystem'
import { Container } from 'pixi.js'

export class EngineBootstrapper {
  // ... existing methods ...

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

    const transitionSystem = new TransitionSystem(stage)
    services.register(TransitionSystem, transitionSystem)
    transitionSystem.resize(screenWidth, screenHeight)

    const messageSystem = new MessageSystem(stage, services)
    services.register(MessageSystem, messageSystem)
    messageSystem.resize(screenWidth, screenHeight)
  }
}
