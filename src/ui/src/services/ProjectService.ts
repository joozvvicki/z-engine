/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZMap, TilesetConfig, ZSystemData, TileSelection, GameSaveFile } from '@engine/types'
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
    if (!fullUrl) return ''
    if (!this.projectPath) return fullUrl

    let path = fullUrl
    if (path.startsWith('z-proj://')) {
      const prefix = `z-proj://${this.projectPath}/`
      if (path.startsWith(prefix)) {
        path = path.substring(prefix.length)
      } else {
        // Handle potentially missing trailing slash in projectPath or different separators
        const protocolPrefix = 'z-proj://'
        const afterProtocol = path.substring(protocolPrefix.length)
        if (afterProtocol.includes(this.projectPath)) {
          path = afterProtocol.split(this.projectPath).pop()?.replace(/^\/+/, '') || path
        }
      }
    }

    // Final cleanup: remove leading slashes and legacy prefixes
    return path.replace(/^\/+/, '')
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

  public static async saveGame(slotId: number, data: GameSaveFile): Promise<void> {
    if (!this.projectPath) return
    const filename = `save_${slotId}.json`
    await this.ensureSaveDirectory()
    await window.api.writeProjectFile(`${this.projectPath}/saves/${filename}`, JSON.stringify(data))
  }

  public static async loadGame(slotId: number): Promise<GameSaveFile | null> {
    if (!this.projectPath) return null
    const filename = `save_${slotId}.json`
    try {
      const content = await window.api.readProjectFile(`${this.projectPath}/saves/${filename}`)
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  public static async doesSaveExist(slotId: number): Promise<boolean> {
    if (!this.projectPath) return false
    const filename = `save_${slotId}.json`
    return await window.api.checkFileExists(`${this.projectPath}/saves/${filename}`)
  }

  private static async ensureSaveDirectory(): Promise<void> {
    if (!this.projectPath) return
    const saveDir = `${this.projectPath}/saves`
    const exists = await window.api.checkFileExists(saveDir)
    if (!exists) {
      await window.api.createDirectory(saveDir)
    }
  }

  public static async createProject(parentPath: string, name: string): Promise<string> {
    const projectPath = `${parentPath}/${name}`

    // 1. Create Directories
    await window.api.createDirectory(projectPath)
    await window.api.createDirectory(`${projectPath}/data`)
    await window.api.createDirectory(`${projectPath}/img`)
    await window.api.createDirectory(`${projectPath}/img/tilesets`)
    await window.api.createDirectory(`${projectPath}/img/characters`)
    await window.api.createDirectory(`${projectPath}/img/parallaxes`)
    await window.api.createDirectory(`${projectPath}/audio`)
    await window.api.createDirectory(`${projectPath}/audio/bgm`)
    await window.api.createDirectory(`${projectPath}/audio/bgs`)

    // Copy Default Assets (Tilesets & Character)
    await this.copyDefaultAssets(projectPath)

    // 2. Create Default Data Files
    const systemData = {
      projectName: name,
      version: '1.0.0',
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

  public static async importAssets(subpath: string): Promise<boolean> {
    if (!this.projectPath) return false
    try {
      // 1. Select files
      const sourcePaths = await window.api.selectAssets()
      if (sourcePaths.length === 0) return false

      // 2. Ensure destination exists
      const destDir = `${this.projectPath}/${subpath}`
      const exists = await window.api.checkFileExists(destDir)
      if (!exists) {
        await window.api.createDirectory(destDir)
      }

      // 3. Copy files
      for (const src of sourcePaths) {
        const filename = src.split(/[/\\]/).pop()
        if (filename) {
          await window.api.copyFile(src, `${destDir}/${filename}`)
        }
      }
      return true
    } catch (e) {
      console.error('Failed to import assets', e)
      return false
    }
  }

  public static async deleteAsset(subpath: string, filename: string): Promise<boolean> {
    if (!this.projectPath) return false
    try {
      const fullPath = `${this.projectPath}/${subpath}/${filename}`
      await window.api.deleteFile(fullPath)
      return true
    } catch (e) {
      console.error('Failed to delete asset', e)
      return false
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

    // 3. System
    const system = import.meta.glob('@ui/assets/img/system/*.png', {
      eager: true,
      query: '?url',
      import: 'default'
    })

    await window.api.createDirectory(`${projectPath}/img/system`)

    for (const [path, url] of Object.entries(system)) {
      try {
        const response = await fetch(url as string)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)
        const filename = path.split('/').pop()
        if (filename) {
          await window.api.writeProjectFile(`${projectPath}/img/system/${filename}`, buffer)
        }
      } catch (e) {
        console.error(`Failed to copy system asset ${path}`, e)
      }
    }
  }
}
