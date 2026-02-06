/// <reference types="vite/client" />

import type { ZEngine } from '@engine/core/ZEngine'

declare global {
  interface LocalAPI {
    selectProjectFolder: () => Promise<string | null>
    readProjectFile: (path: string) => Promise<string>
    writeProjectFile: (path: string, content: string | Uint8Array) => Promise<void>
    createDirectory: (path: string) => Promise<void>
    copyDirectory: (src: string, dest: string) => Promise<void>
    checkFileExists: (path: string) => Promise<boolean>
    listDirectory: (path: string) => Promise<{ name: string; isDirectory: boolean }[]>
    copyFile: (src: string, dest: string) => Promise<void>
    deleteFile: (path: string) => Promise<void>
    selectAssets: (filters?: { name: string; extensions: string[] }[]) => Promise<string[]>
    getAppPath: () => Promise<string>
    buildGame: (options: any) => Promise<{ success: boolean; message: string }>
  }

  interface Window {
    $zEngine: ZEngine | null
    api: LocalAPI
  }
}
