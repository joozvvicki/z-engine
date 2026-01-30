export interface LocalAPI {
  selectProjectFolder: () => Promise<string | null>
  readProjectFile: (path: string) => Promise<string>
  writeProjectFile: (path: string, content: string) => Promise<void>
  createDirectory: (path: string) => Promise<void>
  checkFileExists: (path: string) => Promise<boolean>
  listDirectory: (path: string) => Promise<string[]>
}

declare global {
  interface Window {
    api: LocalAPI
  }
}
