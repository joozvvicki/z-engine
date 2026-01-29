import PIXI from '../utils/pixi'
import { ZSystem, ZLayer } from '@engine/types'
import { PlayerSystem } from './PlayerSystem'
import { TextureManager } from '@engine/managers/TextureManager'
import { RenderSystem } from './RenderSystem'
import { MapManager } from '@engine/managers/MapManager'

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

  constructor(
    _stage: PIXI.Container,
    playerSystem: PlayerSystem,
    textureManager: TextureManager,
    tileSize: number,
    renderSystem: RenderSystem,
    mapManager: MapManager
  ) {
    super()
    this.playerSystem = playerSystem
    this.tileSize = tileSize
    this.renderSystem = renderSystem
    this.mapManager = mapManager
    this.textureManager = textureManager
    this.container = null!
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
      if (!activePage) return

      if (activePage.graphic) {
        // Create visual for event
        const tex = this.textureManager.get(activePage.graphic.tilesetId)
        if (!tex) return

        const sprite = new PIXI.Sprite(
          new PIXI.Texture({
            source: tex.source,
            frame: new PIXI.Rectangle(
              activePage.graphic.x * this.tileSize,
              activePage.graphic.y * this.tileSize,
              activePage.graphic.w * this.tileSize,
              activePage.graphic.h * this.tileSize
            )
          })
        )

        sprite.x = event.x * this.tileSize
        sprite.y = event.y * this.tileSize
        // Y-Sort
        sprite.zIndex = (event.y + 1) * this.tileSize

        // Add to container
        this.container.addChild(sprite)
        this.eventSprites.set(event.id, sprite)
      }
    })
  }

  public async onBoot(): Promise<void> {
    // We want to sort with Decoration layer (to interleave with tiles)
    this.container = this.renderSystem.getLayerContainer(ZLayer.decoration)

    // Create Player Sprite
    await this.createPlayerSprite()
  }

  private async createPlayerSprite(): Promise<void> {
    // Load texture directly using import or path
    // Since we are in Vite context, we can use direct path to public or src/assets if configured.
    // Given the path 'assets/img/characters/character.png', it should be available via URL in dev.
    // In many Vite setups, 'src/assets' needs import.
    // BUT we can use PIXI loader with relative path if assets are served.
    // Let's try importing it as a URL string if possible, or assume it's in public?
    // Directory listing showed it in 'src/ui/src/assets'.
    // Best way in Vite: import imageUrl from '@/assets/img/characters/character.png'

    // However, I cannot insert import statement at top easily without knowing alias.
    // Let's assume standard alias '@ui/assets' or relative.
    // Let's try to load it via Texture.from with a likely URL.

    try {
      // Dynamic import to get the URL
      const mod = await import('@ui/assets/img/characters/character.png')
      const texture = await PIXI.Assets.load(mod.default)

      this.frameWidth = texture.width / 4
      this.frameHeight = texture.height / 4

      this.playerSprite = new PIXI.Sprite(
        new PIXI.Texture({
          source: texture.source,
          frame: new PIXI.Rectangle(0, 0, this.frameWidth, this.frameHeight)
        })
      )

      // User requested height = 1.5 * tileSize
      // We should scale the sprite PROPORTIONALLY
      const targetHeight = this.tileSize * 1.5
      const scale = targetHeight / this.frameHeight

      this.playerSprite.scale.set(scale)

      // Pivot to bottom-center of the tile to align feet
      this.playerSprite.anchor.set(0.5, 1)

      this.container.addChild(this.playerSprite)
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
