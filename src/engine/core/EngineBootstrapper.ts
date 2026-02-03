import { Container } from '@engine/utils/pixi'
import { ServiceLocator } from '@engine/core/ServiceLocator'
import { ZEventBus } from '@engine/core/ZEventBus'
import { TextureManager } from '@engine/managers/TextureManager'
import { InputManager } from '@engine/managers/InputManager'
import { TilesetManager } from '@engine/managers/TilesetManager'
import { MapManager } from '@engine/managers/MapManager'
import { HistoryManager } from '@engine/managers/HistoryManager'
import { ToolManager } from '@engine/managers/ToolManager'
import { SceneManager } from '@engine/managers/SceneManager'
import { GameStateManager } from '@engine/managers/GameStateManager'
import { RenderSystem } from '@engine/systems/RenderSystem'
import { GhostSystem } from '@engine/systems/GhostSystem'
import { GridSystem } from '@engine/systems/GridSystem'
import { PlayerSystem } from '@engine/systems/PlayerSystem'
import { EventSystem } from '@engine/systems/EventSystem'
import { EntityRenderSystem } from '@engine/systems/EntityRenderSystem'
import { TransitionSystem } from '@engine/systems/TransitionSystem'
import { MessageSystem } from '@engine/systems/MessageSystem'
import { PhysicsSystem } from '@engine/systems/PhysicsSystem'
import { ErrorSystem } from '@engine/systems/ErrorSystem'

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
    const physicsSystem = new PhysicsSystem(services)
    services.register(PhysicsSystem, physicsSystem)
    services.register('PhysicsSystem', physicsSystem)

    const playerSystem = new PlayerSystem(services, tileSize)
    services.register(PlayerSystem, playerSystem)
    services.register('PlayerSystem', playerSystem)

    services.register(EventSystem, new EventSystem(services))

    const entityRenderSystem = new EntityRenderSystem(services, tileSize)
    services.register(EntityRenderSystem, entityRenderSystem)
    services.register('EntityRenderSystem', entityRenderSystem)

    const transitionSystem = new TransitionSystem(services)
    services.register(TransitionSystem, transitionSystem)
    services.register('TransitionSystem', transitionSystem)
    transitionSystem.resize(screenWidth, screenHeight)

    const messageSystem = new MessageSystem(services)
    services.register(MessageSystem, messageSystem)
    services.register('MessageSystem', messageSystem)
    messageSystem.resize(screenWidth, screenHeight)

    const errorSystem = new ErrorSystem(services)
    services.register(ErrorSystem, errorSystem)
    services.register('ErrorSystem', errorSystem)
    errorSystem.resize(screenWidth, screenHeight)
  }
}
