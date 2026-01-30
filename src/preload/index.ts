import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  selectProjectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:openProject'),
  readProjectFile: (path: string): Promise<string> => ipcRenderer.invoke('fs:readFile', path),
  writeProjectFile: (path: string, content: string): Promise<void> =>
    ipcRenderer.invoke('fs:writeFile', path, content),
  createDirectory: (path: string): Promise<void> => ipcRenderer.invoke('fs:mkdir', path),
  checkFileExists: (path: string): Promise<boolean> => ipcRenderer.invoke('fs:exists', path)
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
