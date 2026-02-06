import ZLogger from '@engine/utils/ZLogger'
import { IEngineContext } from '@engine/types'

/**
 * PluginManager
 * Responsible for loading external scripts from the project's js/ directory.
 */
export class PluginManager {
  private context: IEngineContext

  constructor(context: IEngineContext) {
    this.context = context
  }

  /**
   * Loads all libraries and plugins from the project.
   */
  public async loadAll(): Promise<void> {
    ZLogger.with('PluginManager').info('Initializing plugin loading...')

    // 1. Load Libraries (e.g. core overrides)
    await this.loadFromDirectory('js/libs')

    // 2. Load Plugins
    await this.loadFromDirectory('js/plugins')

    ZLogger.with('PluginManager').info('All scripts loaded.')
  }

  /**
   * Scans a directory and loads all .js files.
   */
  private async loadFromDirectory(subpath: string): Promise<void> {
    if (!this.context.dataProvider) return

    try {
      // Since resolveAssetUrl gives a z-proj URL, and we need a list of files,
      // we need a new method in dataProvider to list files.
      // But wait, the dataProvider is implemented in useEngine.ts.
      // I should add getFileList to ZDataProvider.

      // For now, let's assume we can get the file list from the data provider.
      const fileList = await this.context.dataProvider.getFileList(subpath)
      const jsFiles = fileList.filter((f: string) => f.endsWith('.js'))

      for (const fileName of jsFiles) {
        await this.loadScript(`${subpath}/${fileName}`)
      }
    } catch (e) {
      ZLogger.with('PluginManager').error(`Failed to load from ${subpath}:`, e)
    }
  }

  /**
   * Loads and executes a single script.
   */
  private async loadScript(path: string): Promise<void> {
    const url = this.context.dataProvider?.resolveAssetUrl(path)
    if (!url) return

    ZLogger.with('PluginManager').info(`Loading script: ${path}`)

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = url
      script.type = 'text/javascript'
      script.async = false // Load in order

      script.onload = () => {
        ZLogger.with('PluginManager').info(`Script loaded: ${path}`)
        resolve()
      }

      script.onerror = (e) => {
        ZLogger.with('PluginManager').error(`Script error: ${path}`, e)
        reject(e)
      }

      document.body.appendChild(script)
    })
  }
}
