import ZLogger from '@engine/core/ZLogger'
import PIXI from '@engine/utils/pixi'
import { ZDataProvider } from '@engine/types'

export class TextureManager {
  private textures: Map<string, PIXI.Texture> = new Map()
  private textureUrls: Map<string, string> = new Map()
  private dataProvider: ZDataProvider | null = null

  public setDataProvider(provider: ZDataProvider): void {
    this.dataProvider = provider
  }

  public async load(path: string): Promise<PIXI.Texture> {
    const url = this.dataProvider ? this.dataProvider.resolveAssetUrl(path) : path
    await this.loadTileset(path, url)
    return this.get(path)!
  }

  public async loadTileset(id: string, url: string): Promise<void> {
    if (this.textures.has(id) && this.textureUrls.get(id) === url) {
      return
    }

    try {
      const texture = await PIXI.Assets.load(url)
      texture.source.scaleMode = 'nearest'
      texture.label = id
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
