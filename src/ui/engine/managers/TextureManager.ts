import ZLogger from '@engine/core/ZLogger'
import PIXI from '@engine/utils/pixi'

export class TextureManager {
  private textures: Map<string, PIXI.Texture> = new Map()
  private textureUrls: Map<string, string> = new Map()

  public async loadTileset(id: string, url: string): Promise<void> {
    // If we already have this ID with the SAME URL, skip to avoid flicker
    if (this.textures.has(id) && this.textureUrls.get(id) === url) {
      return
    }

    try {
      const texture = await PIXI.Assets.load(url)
      texture.source.scaleMode = 'nearest'
      this.textures.set(id, texture)
      this.textureUrls.set(id, url)
      ZLogger.with('TextureManager').info(`Loaded ${id} from ${url}`)
    } catch (e) {
      ZLogger.with('TextureManager').error(`Failed to load ${id} from ${url}`, e)
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
