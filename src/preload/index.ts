import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  selectProjectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openProject'),
  readProjectFile: (path: string): Promise<string> => ipcRenderer.invoke('fs:readFile', path),
  writeProjectFile: (path: string, content: string | Uint8Array): Promise<void> =>
    ipcRenderer.invoke('fs:writeFile', path, content),
  createDirectory: (path: string): Promise<void> => ipcRenderer.invoke('fs:mkdir', path),
  copyDirectory: (src: string, dest: string): Promise<void> =>
    ipcRenderer.invoke('fs:copyDir', src, dest),
  checkFileExists: (path: string): Promise<boolean> => ipcRenderer.invoke('fs:exists', path),
  listDirectory: (path: string): Promise<{ name: string; isDirectory: boolean }[]> =>
    ipcRenderer.invoke('fs:listDirectory', path),
  copyFile: (src: string, dest: string): Promise<void> =>
    ipcRenderer.invoke('fs:copyFile', src, dest),
  deleteFile: (path: string): Promise<void> => ipcRenderer.invoke('fs:deleteFile', path),
  selectAssets: (filters?: { name: string; extensions: string[] }[]): Promise<string[]> =>
    ipcRenderer.invoke('dialog:selectAssets', filters),
  getAppPath: (): Promise<string> => ipcRenderer.invoke('app:getAppPath'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildGame: (options: any): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('project:buildGame', options)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
