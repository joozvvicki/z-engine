import ZLogger from '@engine/core/ZLogger'
import PIXI from '@engine/utils/pixi'

export class TextureManager {
  private textures: Map<string, PIXI.Texture> = new Map()

  public async loadTileset(id: string, url: string): Promise<void> {
    if (this.textures.has(id)) return
    try {
      const texture = await PIXI.Assets.load(url)
      texture.source.scaleMode = 'nearest'
      this.textures.set(id, texture)
      ZLogger.with('TextureManager').info(`Loaded ${id}`)
    } catch (e) {
      ZLogger.with('TextureManager').error(`Failed to load ${id}`, e)
    }
  }

  public get(id: string): PIXI.Texture | undefined {
    const texture = this.textures.get(id)
    if (!texture) {
      ZLogger.with('TextureManager').warn(`Texture ${id} not found`)
    }
    return texture
  }
}
