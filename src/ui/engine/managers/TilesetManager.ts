import { TilesetConfig, TileConfig } from '@engine/types'
import ZLogger from '@engine/core/ZLogger'

/**
 * Manages tileset metadata (collision, priorities, offsets).
 * Centralizes knowledge about how tiles should behave.
 */
export class TilesetManager {
  private configs: Record<string, TilesetConfig> = {}

  /**
   * Updates or replaces the configuration for multiple tilesets.
   * Typically called during map load.
   */
  public setConfigs(configs: Record<string, TilesetConfig>): void {
    this.configs = { ...this.configs, ...configs }
    ZLogger.with('TilesetManager').info(
      `Updated metadata for ${Object.keys(configs).length} tilesets`
    )
  }

  /**
   * Get the full config for a specific tileset URL.
   */
  public getConfig(tilesetUrl: string): TilesetConfig | undefined {
    return this.configs[this.normalizeUrl(tilesetUrl)]
  }

  /**
   * Get specific tile configuration.
   */
  public getTileConfig(tilesetUrl: string, tx: number, ty: number): TileConfig | undefined {
    const config = this.getConfig(tilesetUrl)
    if (!config) return undefined
    return config[`${tx}_${ty}`]
  }

  /**
   * Helper to normalize URLs for consistent lookups.
   */
  private normalizeUrl(url: string): string {
    if (!url) return ''
    try {
      if (url.startsWith('http')) {
        return new URL(url).pathname
      }
    } catch {
      // Fallback
    }
    return url
  }
}
