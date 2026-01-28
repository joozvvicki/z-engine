import ZLogger from '@engine/core/ZLogger'
import PIXI from '@engine/utils/pixi'

export class TextureManager {
  private textures: Map<string, PIXI.Texture> = new Map()

  public async loadTileset(id: string, url: string): Promise<void> {
    if (this.textures.has(id)) return
    try {
      const texture = await PIXI.Assets.load(url)
      this.textures.set(id, texture)
      ZLogger.with('TextureManager').info(`Loaded ${id}`)
    } catch (e) {
      ZLogger.with('TextureManager').error(`Failed to load ${id}`, (e as Error).toString())
    }
  }

  public get(id: string): PIXI.Texture | undefined {
    return this.textures.get(id)
  }
}
