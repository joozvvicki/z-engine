import PIXI from '../utils/pixi'
import { ZLayer } from '@engine/types'
import { ZSystem as ZSystemCore, SystemMode } from '@engine/core/ZSystem'
import { SpriteUtils } from '@engine/utils/SpriteUtils'
import { PlayerSystem } from './PlayerSystem'
import { RenderSystem } from './RenderSystem'
import { ServiceLocator } from '@engine/core/ServiceLocator'

export class EntityRenderSystem extends ZSystemCore {
  private container: PIXI.Container
  private playerSystem: PlayerSystem
  private tileSize: number

  private playerSprite: PIXI.Sprite | null = null

  private frameWidth: number = 0
  private frameHeight: number = 0
  private animationFrame: number = 0
  private animationTimer: number = 0
  private readonly ANIMATION_SPEED: number = 150 // ms

  private renderSystem: RenderSystem
  private eventSprites: Map<string, PIXI.Container | PIXI.Sprite> = new Map()

  constructor(services: ServiceLocator, tileSize: number) {
    super(services)
    this.updateMode = SystemMode.PLAY
    this.tileSize = tileSize

    this.container = new PIXI.Container()

    this.playerSystem = undefined as unknown as PlayerSystem
    this.renderSystem = undefined as unknown as RenderSystem
  }

  public loadEvents(): void {
    this.eventSprites.forEach((sprite) => {
      sprite.destroy()
    })
    this.eventSprites.clear()

    const map = this.map.currentMap
    if (!map || !map.events) return

    map.events.forEach((event) => {
      if (event.name === 'PlayerStart') return

      const activePage = event.pages[0]
      if (!activePage || !activePage.graphic) return
      const sprite = SpriteUtils.createEventSprite(
        activePage.graphic,
        this.textures,
        this.tileSize,
        false
      )

      if (sprite) {
        sprite.x = event.x * this.tileSize
        sprite.y = event.y * this.tileSize

        if (activePage.graphic.group === 'character') {
          sprite.x += this.tileSize / 2
          sprite.y += this.tileSize
        }
        sprite.zIndex = (event.y + 1) * this.tileSize

        this.container.addChild(sprite)
        this.eventSprites.set(event.id, sprite)
      }
    })
  }

  public async onBoot(): Promise<void> {
    this.playerSystem = this.services.require(PlayerSystem)
    this.renderSystem = this.services.require(RenderSystem)

    this.container = this.renderSystem.getLayerContainer(ZLayer.decoration)

    await this.createPlayerSprite()
  }

  private async createPlayerSprite(): Promise<void> {
    try {
      // TODO: Use a proper asset loading system or data provider
      // For now, we rely on the TextureManager having the asset loaded (e.g. by RenderSystem or Preloader)
      // or we can use the data provider to resolve it if needed, but here we are inside the engine.
      // Ideally, the PlayerSystem or SceneManager should handle loading player assets.

      const charPath = 'img/characters/character.png'
      // We assume it is already loaded or we fail gracefully

      const graphic = {
        assetId: charPath,
        group: 'character' as const,
        x: 0,
        y: 0,
        w: 1,
        h: 1
      }

      // Try to ensure it is loaded?
      // const url = this.services.get(ZManager)?.getDataProvider().resolveAssetUrl(charPath)
      // if (url) await this.textures.loadTileset(charPath, url)

      this.playerSprite = SpriteUtils.createEventSprite(
        graphic,
        this.textures,
        this.tileSize,
        false
      )

      if (this.playerSprite) {
        this.frameWidth = this.playerSprite.texture.width
        this.frameHeight = this.playerSprite.texture.height

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

  public async setPlayerGraphic(assetPath: string): Promise<void> {
    if (!assetPath) return

    // Check if we need to release old texture?
    // For now, simpler to just recreate sprite.

    if (this.playerSprite) {
      this.playerSprite.destroy()
      this.playerSprite = null
    }

    const graphic = {
      assetId: assetPath,
      group: 'character' as const,
      x: 0,
      y: 0,
      w: 1,
      h: 1
    }

    // Attempt to load if not already loaded?
    // We assume TextureManager might have it or we need to generic load it.
    // But SpriteUtils uses TextureManager synchronous getTileset usually?
    // SpriteUtils.createEventSprite calls TextureManager.getTileset

    // We might need to ensure it is loaded.
    // If it is a generic path like 'img/characters/foo.png', we need to resolve it.
    // We can use the data provider?
    // But we are in a System.
    // Let's assume for now the Bootstrapper or useEngine preloads it.
    // useEngine preloads ALL characters in the folder.

    try {
      this.playerSprite = SpriteUtils.createEventSprite(
        graphic,
        this.textures,
        this.tileSize,
        false
      )

      if (this.playerSprite) {
        this.frameWidth = this.playerSprite.texture.width
        this.frameHeight = this.playerSprite.texture.height
        this.container.addChild(this.playerSprite)

        // Refresh visibility
        this.setVisible(true) // or keep previous state?
      }
    } catch (e) {
      console.warn('Could not set player graphic', assetPath, e)
      this.createFallbackSprite()
    }
  }

  public onUpdate(delta: number): void {
    if (!this.playerSprite) return

    if (this.playerSprite.parent !== this.container) {
      this.container.addChild(this.playerSprite)
      this.eventSprites.forEach((s) => {
        if (s.parent !== this.container) this.container.addChild(s)
      })
    }

    this.playerSprite.x = this.playerSystem.realX + this.tileSize / 2
    this.playerSprite.y = this.playerSystem.realY + this.tileSize
    this.playerSprite.zIndex = this.playerSprite.y

    if (this.playerSprite instanceof PIXI.Sprite && this.playerSprite.texture.label !== 'EMPTY') {
      this.updateAnimation(delta)
    }
  }

  private updateAnimation(delta: number): void {
    if (!(this.playerSprite instanceof PIXI.Sprite)) return

    if (this.playerSystem.isMoving) {
      this.animationTimer += delta
      if (this.animationTimer > this.ANIMATION_SPEED) {
        this.animationTimer = 0
        this.animationFrame = (this.animationFrame + 1) % 4
      }
    } else {
      this.animationFrame = 0
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
        return 0
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
