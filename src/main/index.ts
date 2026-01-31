import { app, shell, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import installExtension from 'electron-devtools-installer'
import { BuildService } from './BuildService'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', async () => {
    mainWindow.show()

    mainWindow.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../ui/index.html'))
  }
}

// Register custom protocol privileges
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'z-proj',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true, // This allows fetch() to work with z-proj://
      bypassCSP: true, // Optional, but helpful
      corsEnabled: true // Allow CORS requests
    }
  }
])

app.whenReady().then(() => {
  electronApp.setAppUserModelId('pl.joozvvicki.z-engine')

  // Initialize Services
  new BuildService()

  // Register custom protocol for local file access
  protocol.handle('z-proj', async (request) => {
    try {
      const parsed = new URL(request.url)
      let filePath = parsed.pathname

      // On Mac/Linux, if "z-proj://Users/..." is passed (2 slashes), "Users" becomes the hostname.
      // We need to recover it as part of the path.
      if (process.platform !== 'win32' && parsed.hostname) {
        filePath = `/${parsed.hostname}${parsed.pathname}`
      }

      // Decode URL to handle spaces
      filePath = decodeURIComponent(filePath)

      // Remove leading slash on Windows if needed (e.g. /C:/...)
      if (process.platform === 'win32' && filePath.startsWith('/') && !filePath.startsWith('//')) {
        filePath = filePath.slice(1)
      }

      // Read file directly
      const data = await fs.readFile(filePath)

      // Guess mime type
      const ext = filePath.split('.').pop()?.toLowerCase()
      let mimeType = 'application/octet-stream'
      if (ext === 'png') mimeType = 'image/png'
      if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
      if (ext === 'json') mimeType = 'application/json'
      if (ext === 'js') mimeType = 'text/javascript'
      if (ext === 'html') mimeType = 'text/html'
      if (ext === 'css') mimeType = 'text/css'

      return new Response(data, {
        headers: { 'content-type': mimeType }
      })
    } catch (error) {
      console.error('Failed to handle z-proj request:', error, request.url)
      return new Response('Not Found', { status: 404 })
    }
  })

  if (process.env.NODE_ENV === 'development') {
    try {
      const name = installExtension('aamddddknhcagpehecnhphigffljadon')
      console.log(`Added Extension: ${name}`)
    } catch (err) {
      console.log('An error occurred: ', err)
    }
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC Handlers
  ipcMain.handle('dialog:openProject', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled) return null
    return filePaths[0]
  })

  ipcMain.handle('fs:readFile', async (_, path) => {
    return await fs.readFile(path, 'utf-8')
  })

  ipcMain.handle('fs:writeFile', async (_, path, content) => {
    await fs.writeFile(path, content)
  })

  ipcMain.handle('fs:mkdir', async (_, path) => {
    await fs.mkdir(path, { recursive: true })
  })

  ipcMain.handle('fs:exists', async (_, path) => {
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('fs:listDirectory', async (_, path) => {
    try {
      // Return filenames only
      return await fs.readdir(path)
    } catch {
      return []
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
