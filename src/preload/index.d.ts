import { ElectronAPI } from '@electron-toolkit/preload'

export interface LocalAPI {
  selectProjectFolder: () => Promise<string | null>
  readProjectFile: (path: string) => Promise<string>
  writeProjectFile: (path: string, content: string) => Promise<void>
  checkFileExists: (path: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: LocalAPI
  }
}
