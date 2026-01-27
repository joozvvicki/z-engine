import * as PIXI from 'pixi.js'

export class TextureManager {
  private textures: Map<string, PIXI.Texture> = new Map()

  public async loadTileset(id: string, url: string): Promise<void> {
    if (this.textures.has(id)) return
    try {
      const texture = await PIXI.Assets.load(url)
      this.textures.set(id, texture)
      console.log(`[TextureManager] Loaded ${id}`)
    } catch (e) {
      console.error(`[TextureManager] Failed to load ${id}`, e)
    }
  }

  public get(id: string): PIXI.Texture | undefined {
    return this.textures.get(id)
  }
}
