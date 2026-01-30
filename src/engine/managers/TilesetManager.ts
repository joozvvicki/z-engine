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
   * Ensures 'z-proj://path/to/img/...' matches 'img/...'
   */
  private normalizeUrl(url: string): string {
    if (!url) return ''

    // 1. Remove standard protocols
    let clean = url
    if (clean.startsWith('http')) {
      try {
        clean = new URL(clean).pathname
      } catch {
        /* ignore */
      }
    }

    // 2. Remove z-proj:// (and potentially the project path host)
    // Format: z-proj://<project-path>/<relative-path>
    // We simply want to ensure we don't have the protocol.
    // Since we don't know the project path, we rely on the fact that our keys usually start with 'img/'
    // or we strip up to the last known common root.

    // Simple approach: Strip z-proj:// prefix first
    clean = clean.replace(/^z-proj:\/\//, '')

    // If it still looks like an absolute path but contains 'img/', try to grab from 'img/'
    const imgIndex = clean.indexOf('img/')
    if (imgIndex !== -1) {
      return clean.substring(imgIndex)
    }

    // Also handle src/ui/assets/img/ legacy
    const legacyIndex = clean.indexOf('src/ui/assets/')
    if (legacyIndex !== -1) {
      return clean.substring(legacyIndex + 'src/ui/assets/'.length)
    }

    // Fallback: remove leading slash
    return clean.replace(/^\/+/, '')
  }
}
