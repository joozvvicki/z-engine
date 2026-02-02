/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZMap, TilesetConfig, ZSystemData, TileSelection } from '@engine/types'
import { VERSION } from 'pixi.js'

export class ProjectService {
  private static projectPath: string | null = null

  public static async selectProject(): Promise<string | null> {
    const path = await window.api.selectProjectFolder()
    if (path) {
      this.projectPath = path
      this.addToHistory(path)
    }
    return path
  }

  public static get currentPath(): string | null {
    return this.projectPath
  }

  public static clearProject(): void {
    this.projectPath = null
  }

  private static addToHistory(path: string): void {
    const history = this.getHistory()
    const newHistory = [path, ...history.filter((p) => p !== path)].slice(0, 5)
    localStorage.setItem('Z_ProjectHistory', JSON.stringify(newHistory))
    localStorage.setItem('Z_LastProjectPath', path)
  }

  public static getHistory(): string[] {
    try {
      const history = localStorage.getItem('Z_ProjectHistory')
      return history ? JSON.parse(history) : []
    } catch {
      return []
    }
  }

  public static removeFromHistory(path: string): void {
    const history = this.getHistory()
    const newHistory = history.filter((p) => p !== path)
    localStorage.setItem('Z_ProjectHistory', JSON.stringify(newHistory))
    if (localStorage.getItem('Z_LastProjectPath') === path) {
      localStorage.removeItem('Z_LastProjectPath')
    }
  }

  public static loadLastProject(): string | null {
    const path = localStorage.getItem('Z_LastProjectPath')
    if (path) {
      this.projectPath = path
    }
    return path
  }

  public static resolveAssetUrl(relativePath: string): string {
    if (!this.projectPath) return relativePath
    if (
      relativePath.startsWith('http') ||
      relativePath.startsWith('data:') ||
      relativePath.startsWith('file:')
    ) {
      return relativePath
    }
    // Normalize path separators: remove double slashes, ensure single slash
    let cleanPath = relativePath.replace(/^\/+/, '')

    // Fix for legacy/dev paths:
    // If path starts with "src/ui/assets/img/", rewrite it to "img/"
    // This handles cases where dev paths were saved into the project JSON.
    if (cleanPath.startsWith('src/ui/assets/img/')) {
      cleanPath = cleanPath.replace('src/ui/assets/img/', 'img/')
    }

    // Use custom protocol to bypass CORS/Fetch restrictions
    return `z-proj://${this.projectPath}/${cleanPath}`
  }

  public static getRelativePath(fullUrl: string): string {
    if (!this.projectPath) return fullUrl
    if (fullUrl.startsWith('z-proj://')) {
      // Remove protocol and project path
      // Format: z-proj://<projectPath>/<relativePath>
      // We need to be careful about matching.
      const prefix = `z-proj://${this.projectPath}/`
      if (fullUrl.startsWith(prefix)) {
        return fullUrl.substring(prefix.length)
      }
      // If path separators are mixed or encoding differs?
      // Simple fallback: split by 'z-proj://' and then try to find project path?
      // Actually, since we control resolveAssetUrl, strict match should work if project path is normalized.
    }
    // Also handle Dev/Http URLs if necessary?
    return fullUrl
  }

  public static async loadSystemData(): Promise<ZSystemData | null> {
    if (!this.projectPath) return null
    try {
      const content = await window.api.readProjectFile(`${this.projectPath}/data/System.json`)
      return JSON.parse(content)
    } catch (e) {
      console.warn('System.json not found or invalid', e)
      return null
    }
  }

  public static async saveSystemData(data: ZSystemData): Promise<void> {
    if (!this.projectPath) return
    await window.api.writeProjectFile(`${this.projectPath}/data/System.json`, JSON.stringify(data))
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
    await window.api.writeProjectFile(`${this.projectPath}/data/${filename}`, JSON.stringify(map))
  }

  public static async loadTilesets(): Promise<Record<string, TilesetConfig>> {
    return (await this.loadDatabaseFile('Tilesets.json')) || {}
  }

  public static async saveTilesets(configs: Record<string, TilesetConfig>): Promise<void> {
    await this.saveDatabaseFile('Tilesets.json', configs)
  }

  public static async loadDatabaseFile<T>(filename: string): Promise<T | null> {
    if (!this.projectPath) return null
    try {
      const content = await window.api.readProjectFile(`${this.projectPath}/data/${filename}`)
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  public static async saveDatabaseFile(filename: string, data: any): Promise<void> {
    if (!this.projectPath) return
    await window.api.writeProjectFile(`${this.projectPath}/data/${filename}`, JSON.stringify(data))
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
      JSON.stringify(infos)
    )
  }

  public static async createProject(parentPath: string, name: string): Promise<string> {
    const projectPath = `${parentPath}/${name}`

    // 1. Create Directories
    await window.api.createDirectory(projectPath)
    await window.api.createDirectory(`${projectPath}/data`)
    await window.api.createDirectory(`${projectPath}/img`)
    await window.api.createDirectory(`${projectPath}/img/tilesets`)
    await window.api.createDirectory(`${projectPath}/img/characters`)

    // Copy Default Assets (Tilesets & Character)
    await this.copyDefaultAssets(projectPath)

    // 2. Create Default Data Files
    const systemData = {
      switches: new Array(20).fill(''),
      variables: new Array(20).fill(''),
      actors: [],
      startMapId: 1,
      startX: 0,
      startY: 0,
      playerGraphic: 'img/characters/character.png'
    }

    const mapInfos = [{ id: 1, name: 'MAP001', parentId: 0, order: 1 }]

    // Helper to create empty layer data
    const createLayerData = (w: number, h: number): (TileSelection[] | null)[][] =>
      Array.from({ length: h }, () => Array.from({ length: w }, () => []))

    const map001 = {
      id: 1,
      name: 'MAP001',
      width: 20,
      height: 15,
      layers: {
        ground: { icon: 'ground', data: createLayerData(20, 15), index: 0 },
        walls: { icon: 'wall', data: createLayerData(20, 15), index: 1 },
        decoration: { icon: 'decoration', data: createLayerData(20, 15), index: 2 },
        highest: { icon: 'highest', data: createLayerData(20, 15), index: 3 }
      },
      events: [],
      tilesetConfig: {
        A1: 'img/tilesets/World_A1.png',
        A2: 'img/tilesets/World_A2.png',
        A3: 'img/tilesets/World_A3.png',
        A4: 'img/tilesets/World_A4.png',
        A5: 'img/tilesets/World_A5.png',
        B: 'img/tilesets/World_B.png',
        C: 'img/tilesets/World_C.png',
        D: 'img/tilesets/World_D.png',
        Roofs: 'img/tilesets/Roofs.png'
      }
    }

    await window.api.writeProjectFile(`${projectPath}/data/System.json`, JSON.stringify(systemData))
    await window.api.writeProjectFile(`${projectPath}/data/MapInfos.json`, JSON.stringify(mapInfos))
    await window.api.writeProjectFile(`${projectPath}/data/Tilesets.json`, JSON.stringify({}))
    await window.api.writeProjectFile(`${projectPath}/data/Map001.json`, JSON.stringify(map001))

    // 3. Create Project Metadata
    const meta = `Z Engine v. 0.1.0 with PIXI.js v. ${VERSION}`
    await window.api.writeProjectFile(`${projectPath}/Game.zproj`, meta)

    this.projectPath = projectPath
    this.addToHistory(projectPath)
    return projectPath
  }

  public static isLoaded(): boolean {
    return this.projectPath !== null
  }

  public static async getProjectFiles(subpath: string): Promise<string[]> {
    if (!this.projectPath) return []
    try {
      const fullDir = `${this.projectPath}/${subpath}`
      const files = await window.api.listDirectory(fullDir)
      return files
    } catch {
      return []
    }
  }

  public static async getProjectData(): Promise<ZSystemData | null> {
    if (!this.projectPath) return null
    try {
      const content = await window.api.readProjectFile(`${this.projectPath}/data/System.json`)
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  public static async buildGame(
    platform: string,
    gameName: string
  ): Promise<{ success: boolean; message: string }> {
    if (!this.projectPath) return { success: false, message: 'No project loaded' }
    return await window.api.buildGame({
      projectPath: this.projectPath,
      platform,
      gameName
    })
  }

  private static async copyDefaultAssets(projectPath: string): Promise<void> {
    // 1. Tilesets
    const tilesets = import.meta.glob('@ui/assets/img/tilesets/*.png', {
      eager: true,
      query: '?url',
      import: 'default'
    })
    for (const [path, url] of Object.entries(tilesets)) {
      try {
        const response = await fetch(url as string)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)
        const filename = path.split('/').pop()
        if (filename) {
          await window.api.writeProjectFile(`${projectPath}/img/tilesets/${filename}`, buffer)
        }
      } catch (e) {
        console.error(`Failed to copy tileset ${path}`, e)
      }
    }

    // 2. Character
    const characters = import.meta.glob('@ui/assets/img/characters/*.png', {
      eager: true,
      query: '?url',
      import: 'default'
    })
    for (const [path, url] of Object.entries(characters)) {
      try {
        const response = await fetch(url as string)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)
        const filename = path.split('/').pop()
        if (filename) {
          await window.api.writeProjectFile(`${projectPath}/img/characters/${filename}`, buffer)
        }
      } catch (e) {
        console.error(`Failed to copy character ${path}`, e)
      }
    }
  }
}
