import PIXI from '../utils/pixi'
import { ZSystem, ZLayer } from '@engine/types'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import { PlayerSystem } from './PlayerSystem'
import { TextureManager } from '@engine/managers/TextureManager'
import { RenderSystem } from './RenderSystem'
import { MapManager } from '@engine/managers/MapManager'
import { ServiceLocator } from '@engine/core/ServiceLocator'

export class EntityRenderSystem extends ZSystem {
  private container: PIXI.Container
  private playerSystem: PlayerSystem
  private tileSize: number

  private playerSprite: PIXI.Sprite | null = null

  // RPG Maker XP Style (4x4)
  // Rows: Down, Left, Right, Up
  // Cols: (Idle, Walk1, Idle, Walk2) - standard 4 frame cycle usually 0-1-2-3
  // Wait, standard XP/VX is 4 cols: Step Left, Idle, Step Right, Idle?
  // Let's assume standard grid 4x4.
  // We need to define frame size.
  // Standard XP character is 32x48 or 48x64?
  // Let's check aspect ratio from the file we found? We can't check size easily without loading.
  // Standard RPG Maker MV/MZ is 48x48 base tile, characters are 3 cols x 4 rows.
  // User said "XP assets". XP characters are usually 4 cols x 4 rows.
  // Let's implement 4 cols x 4 rows logic.

  private frameWidth: number = 0
  private frameHeight: number = 0
  private animationFrame: number = 0
  private animationTimer: number = 0
  private readonly ANIMATION_SPEED: number = 150 // ms per frame

  private mapManager: MapManager
  private renderSystem: RenderSystem
  private textureManager: TextureManager
  private eventSprites: Map<string, PIXI.Container | PIXI.Sprite> = new Map()

  private services: ServiceLocator

  constructor(services: ServiceLocator, tileSize: number) {
    super()
    this.services = services
    this.tileSize = tileSize

    this.container = new PIXI.Container()

    // Dependencies from services
    this.textureManager = services.require(TextureManager)
    this.mapManager = services.require(MapManager)

    // These will be retrieved lazily in onBoot
    this.playerSystem = undefined as unknown as PlayerSystem
    this.renderSystem = undefined as unknown as RenderSystem
  }

  public loadEvents(): void {
    // Clear existing events
    this.eventSprites.forEach((sprite) => {
      sprite.destroy()
    })
    this.eventSprites.clear()

    const map = this.mapManager.currentMap
    if (!map || !map.events) return

    map.events.forEach((event) => {
      if (event.name === 'PlayerStart') return // Invisible marker

      const activePage = event.pages[0] // Default to first page for now until Interpreter
      if (!activePage || !activePage.graphic) return

      // Use SpriteUtils to create the visual
      // For Game, isEditor = false
      const sprite = SpriteUtils.createEventSprite(
        activePage.graphic,
        this.textureManager,
        this.tileSize,
        false
      )

      if (sprite) {
        sprite.x = event.x * this.tileSize
        sprite.y = event.y * this.tileSize

        // If it's a character (Anchor 0.5, 1), we need to adjust position to be center-bottom of tile
        if (activePage.graphic.group === 'character') {
          sprite.x += this.tileSize / 2
          sprite.y += this.tileSize
        }

        // Y-Sort: Use bottom of tile
        sprite.zIndex = (event.y + 1) * this.tileSize

        this.container.addChild(sprite)
        this.eventSprites.set(event.id, sprite)
      }
    })
  }

  public async onBoot(): Promise<void> {
    // Retrieve dependencies lazily
    this.playerSystem = this.services.require(PlayerSystem)
    this.renderSystem = this.services.require(RenderSystem)

    // We want to sort with Decoration layer (to interleave with tiles)
    this.container = this.renderSystem.getLayerContainer(ZLayer.decoration)

    // Create Player Sprite
    await this.createPlayerSprite()
  }

  private async createPlayerSprite(): Promise<void> {
    try {
      // Dynamic import to get the URL
      const mod = await import('@ui/assets/img/characters/character.png')
      // Register with TextureManager
      await this.textureManager.loadTileset('@ui/assets/img/characters/character.png', mod.default)

      const graphic = {
        assetId: '@ui/assets/img/characters/character.png',
        group: 'character' as const,
        x: 0,
        y: 0,
        w: 1,
        h: 1
      }

      this.playerSprite = SpriteUtils.createEventSprite(
        graphic,
        this.textureManager,
        this.tileSize,
        false
      )

      if (this.playerSprite) {
        // Store frame dimensions for animation
        this.frameWidth = this.playerSprite.texture.width
        this.frameHeight = this.playerSprite.texture.height
        // Note: SpriteUtils creates a sprite with the FRAME (partial texture).
        // So texture.width IS the frame width.

        this.container.addChild(this.playerSprite)
      }
    } catch (e) {
      console.error('Failed to load character texture', e)
      // Fallback
      this.createFallbackSprite()
    }
  }

  private createFallbackSprite(): void {
    const graphics = new PIXI.Graphics()
    graphics.rect(0, 0, this.tileSize, this.tileSize)
    graphics.fill(0xff0000)
    // Wrap in container to behave like sprite anchor
    const c = new PIXI.Container()
    c.addChild(graphics)
    this.playerSprite = c as unknown as PIXI.Sprite
    this.container.addChild(this.playerSprite)
  }

  public setVisible(visible: boolean): void {
    if (this.playerSprite) {
      this.playerSprite.visible = visible
    }

    if (visible) {
      this.loadEvents()
      this.eventSprites.forEach((s) => (s.visible = true))
    } else {
      this.eventSprites.forEach((s) => (s.visible = false))
    }
  }

  public onUpdate(delta: number): void {
    if (!this.playerSprite) return

    // Self-healing: Ensure player is attached to container (RenderSystem might have cleared it)
    if (this.playerSprite.parent !== this.container) {
      this.container.addChild(this.playerSprite)
      this.eventSprites.forEach((s) => {
        if (s.parent !== this.container) this.container.addChild(s)
      })
    }

    // Interpolate position relative to bottom-center of tile?
    // PlayerSystem coordinates are top-left of the tile grid.
    // We want sprite feet at bottom-center of tile.
    // RealX/Y is top-left of tile.
    // Center X = realX + tileSize/2
    // Bottom Y = realY + tileSize

    this.playerSprite.x = this.playerSystem.realX + this.tileSize / 2
    this.playerSprite.y = this.playerSystem.realY + this.tileSize
    // Y-sorting: zIndex = Y
    // We strictly use Y for sorting.
    // Any bias should be handled by the environment (Tiles) or offset.
    this.playerSprite.zIndex = this.playerSprite.y

    if (this.playerSprite instanceof PIXI.Sprite && this.playerSprite.texture.label !== 'EMPTY') {
      this.updateAnimation(delta)
    }
  }

  private updateAnimation(delta: number): void {
    if (!(this.playerSprite instanceof PIXI.Sprite)) return

    // Update timer
    if (this.playerSystem.isMoving) {
      this.animationTimer += delta
      if (this.animationTimer > this.ANIMATION_SPEED) {
        this.animationTimer = 0
        this.animationFrame = (this.animationFrame + 1) % 4
      }
    } else {
      this.animationFrame = 0 // Idle frame
      this.animationTimer = 0
    }

    const row = this.getDirectionRow(this.playerSystem.direction)
    const col = this.animationFrame

    const rect = new PIXI.Rectangle(
      col * this.frameWidth,
      row * this.frameHeight,
      this.frameWidth,
      this.frameHeight
    )

    // Only update if changed to avoid perf hit? PIXI handles this well.
    // To change frame of an existing sprite, we should construct a new texture
    // or use Texture.frame if it were mutable (it's not easily mutable deep inside).
    // Best practice: Use a new Texture sharing the same source.

    const newTexture = new PIXI.Texture({
      source: this.playerSprite.texture.source,
      frame: rect
    })

    this.playerSprite.texture = newTexture
  }

  private getDirectionRow(dir: 'down' | 'left' | 'right' | 'up'): number {
    switch (dir) {
      case 'down':
        return 0
      case 'left':
        return 1
      case 'right':
        return 2
      case 'up':
        return 3
      default:
        return 0 // Should not happen
    }
  }

  public onDestroy(): void {
    if (this.playerSprite) {
      this.container.removeChild(this.playerSprite)
      this.playerSprite.destroy()
    }
    this.eventSprites.forEach((sprite) => {
      sprite.destroy()
    })
    this.eventSprites.clear()
  }
}
