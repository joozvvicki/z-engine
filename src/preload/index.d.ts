export interface LocalAPI {
  selectProjectFolder: () => Promise<string | null>
  readProjectFile: (path: string) => Promise<string>
  writeProjectFile: (path: string, content: string | Uint8Array) => Promise<void>
  createDirectory: (path: string) => Promise<void>
  checkFileExists: (path: string) => Promise<boolean>
  listDirectory: (path: string) => Promise<string[]>
  copyFile: (src: string, dest: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  selectAssets: (filters?: { name: string; extensions: string[] }[]) => Promise<string[]>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildGame: (options: any) => Promise<{ success: boolean; message: string }>
}

declare global {
  interface Window {
    api: LocalAPI
  }
}
