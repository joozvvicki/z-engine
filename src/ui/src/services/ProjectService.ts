import type { ZMap, TilesetConfig } from '@engine/types'

export class ProjectService {
  private static projectPath: string | null = null

  public static async selectProject(): Promise<string | null> {
    const path = await window.api.selectProjectFolder()
    if (path) {
      this.projectPath = path
    }
    return path
  }

  public static get currentPath(): string | null {
    return this.projectPath
  }

  public static isLoaded(): boolean {
    return this.projectPath !== null
  }

  public static async loadSystemData(): Promise<{
    switches: string[]
    variables: string[]
  } | null> {
    if (!this.projectPath) return null
    try {
      const content = await window.api.readProjectFile(`${this.projectPath}/data/System.json`)
      return JSON.parse(content)
    } catch (e) {
      console.warn('System.json not found or invalid', e)
      return null
    }
  }

  public static async saveSystemData(data: {
    switches: string[]
    variables: string[]
  }): Promise<void> {
    if (!this.projectPath) return
    await window.api.writeProjectFile(
      `${this.projectPath}/data/System.json`,
      JSON.stringify(data, null, 2)
    )
  }

  public static async loadMap(id: number): Promise<ZMap | null> {
    if (!this.projectPath) return null
    const filename = `Map${id.toString().padStart(3, '0')}.json`
    try {
      const content = await window.api.readProjectFile(`${this.projectPath}/data/${filename}`)
      return JSON.parse(content) as ZMap
    } catch (e) {
      console.warn(`Failed to load map ${id}`, e)
      return null
    }
  }

  public static async saveMap(map: ZMap): Promise<void> {
    if (!this.projectPath) return
    const filename = `Map${map.id.toString().padStart(3, '0')}.json`
    await window.api.writeProjectFile(
      `${this.projectPath}/data/${filename}`,
      JSON.stringify(map, null, 2)
    )
  }

  public static async saveTilesets(configs: Record<string, TilesetConfig>): Promise<void> {
    if (!this.projectPath) return
    await window.api.writeProjectFile(
      `${this.projectPath}/data/Tilesets.json`,
      JSON.stringify(configs, null, 2)
    )
  }

  public static async loadTilesets(): Promise<Record<string, TilesetConfig>> {
    if (!this.projectPath) return {}
    try {
      const content = await window.api.readProjectFile(`${this.projectPath}/data/Tilesets.json`)
      return JSON.parse(content)
    } catch {
      return {}
    }
  }

  public static async loadMapInfos(): Promise<any[]> {
    if (!this.projectPath) return []
    try {
      const content = await window.api.readProjectFile(`${this.projectPath}/data/MapInfos.json`)
      return JSON.parse(content)
    } catch {
      return []
    }
  }

  public static async saveMapInfos(infos: any[]): Promise<void> {
    if (!this.projectPath) return
    await window.api.writeProjectFile(
      `${this.projectPath}/data/MapInfos.json`,
      JSON.stringify(infos, null, 2)
    )
  }
}
