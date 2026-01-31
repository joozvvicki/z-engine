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

  public async loadEvents(): Promise<void> {
    this.eventSprites.forEach((sprite) => {
      sprite.destroy()
    })
    this.eventSprites.clear()

    const map = this.map.currentMap
    if (!map || !map.events) return

    for (const event of map.events) {
      if (event.name === 'PlayerStart') continue

      const activePage = event.pages[0]
      if (!activePage || !activePage.graphic) continue

      // Ensure texture is loaded
      await this.textures.load(activePage.graphic.assetId)

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
    }
  }

  public async onBoot(): Promise<void> {
    this.playerSystem = this.services.require(PlayerSystem)
    this.renderSystem = this.services.require(RenderSystem)

    this.container = this.renderSystem.getLayerContainer(ZLayer.decoration)

    await this.createPlayerSprite()
  }

  private async createPlayerSprite(): Promise<void> {
    try {
      const charPath = 'img/characters/character.png'

      // Ensure texture is loaded
      await this.textures.load(charPath)

      const graphic = {
        assetId: charPath,
        group: 'character' as const,
        x: 0,
        y: 0,
        w: 1,
        h: 1
      }

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

    try {
      // Ensure texture is loaded
      await this.textures.load(assetPath)

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
        this.setVisible(true)
      } else {
        console.warn('SpriteUtils returned null for asset:', assetPath)
        this.createFallbackSprite()
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
