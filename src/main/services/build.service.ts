import { ipcMain } from 'electron'
import { join } from 'path'
import { cp, mkdir, rm, writeFile, readFile } from 'fs/promises'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export class BuildService {
  constructor() {
    ipcMain.handle('project:buildGame', async (_, options) => {
      return this.buildGame(options)
    })
  }

  async buildGame(options: {
    projectPath: string
    platform: string
    gameName: string
  }): Promise<{ success: boolean; message: string }> {
    console.log('[BuildService] Starting Tauri build for:', options.gameName)
    const { projectPath, gameName } = options
    const buildDir = join(projectPath, 'build')

    // Use game-tauri template
    const templateDir = join(process.cwd(), 'templates', 'game-tauri')

    try {
      // 1. Clean / Create Build Dir
      if (existsSync(buildDir)) {
        try {
          await rm(buildDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 })
        } catch (e) {
          console.warn('[BuildService] fs.rm failed, forcing with rm -rf...', e)
          await execAsync(`rm -rf "${buildDir}"`)
        }
      }
      await mkdir(buildDir, { recursive: true })

      // 2. Copy Template
      console.log('[BuildService] Copying Tauri template...')
      await cp(templateDir, buildDir, { recursive: true })

      // 3. Inject Project Data
      // 3. Inject Project Data
      console.log('[BuildService] Injecting data...')
      const publicDir = join(buildDir, 'public')
      // Ensure public dir exists
      if (!existsSync(publicDir)) {
        await mkdir(publicDir, { recursive: true })
      }

      const buildResourcesDir = join(publicDir, 'build-resources')
      const dataDir = join(buildResourcesDir, 'data')
      const imgDir = join(buildResourcesDir, 'img')

      // 3a. Copy Engine Core & Update Dependencies
      console.log('[BuildService] Bundling engine core...')
      const engineSrc = join(process.cwd(), 'src', 'engine')
      const engineDest = join(buildDir, 'engine')

      // Copy engine (excluding node_modules)
      await cp(engineSrc, engineDest, {
        recursive: true,
        filter: (src) => !src.includes('node_modules')
      })

      // Build the engine locally
      console.log('[BuildService] Building engine...')
      await execAsync('npm install', { cwd: engineDest })
      await execAsync('npm run build', { cwd: engineDest })

      // Update built engine's package.json to point to dist
      const enginePkgPath = join(engineDest, 'package.json')
      const enginePkgRaw = await readFile(enginePkgPath, 'utf-8')
      const enginePkg = JSON.parse(enginePkgRaw)
      enginePkg.main = './dist/index.js'
      enginePkg.types = './dist/index.d.ts'
      await writeFile(enginePkgPath, JSON.stringify(enginePkg, null, 2))

      // Update game's package.json to point to local engine copy
      const pkgPath = join(buildDir, 'package.json')
      const pkgRaw = await readFile(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgRaw)
      pkg.dependencies['@z-engine/core'] = 'file:./engine'
      await writeFile(pkgPath, JSON.stringify(pkg, null, 2))

      // Ensure target dirs
      await mkdir(dataDir, { recursive: true })
      await mkdir(imgDir, { recursive: true })

      // Copy Maps and System.json
      const projectDataDir = join(projectPath, 'data')
      if (existsSync(projectDataDir)) {
        await cp(projectDataDir, dataDir, { recursive: true })
      }

      // Copy Assets (img)
      const projectImgDir = join(projectPath, 'img')
      if (existsSync(projectImgDir)) {
        await cp(projectImgDir, imgDir, { recursive: true })
      }

      // Copy Custom Icon (if exists)
      const projectIcon = join(projectPath, 'icon.png')
      const tauriIconDir = join(buildDir, 'src-tauri', 'icons')

      if (existsSync(projectIcon)) {
        // Copy to Tauri icons directory
        await cp(projectIcon, join(tauriIconDir, 'icon.png'))
      }

      // Copy icons, js, and img folders from template if they exist
      const templateIconsDir = join(buildDir, 'resources', 'icons')
      const templateJsDir = join(buildDir, 'resources', 'js')
      const templateImgDir = join(buildDir, 'resources', 'img')

      if (existsSync(templateIconsDir)) {
        await cp(templateIconsDir, join(buildResourcesDir, 'icons'), { recursive: true })
      }
      if (existsSync(templateJsDir)) {
        await cp(templateJsDir, join(buildResourcesDir, 'js'), { recursive: true })
      }
      // Copy default assets (if not overwritten by project, but here we copy on top? No, project copied first)
      // Ideally we copy template first, then project. But project copy is lines 99-103.
      // So this copies template ON TOP of project if file names collide?
      // cp default is overwrite: true.
      // We should use overwrite: false to preserve project files?
      // Or move this block BEFORE project copy?
      // Moving block is safer. But simple cp with overwrite: false (force: false) is easier?
      // Node fs cp options: force: true (default).
      // Let's assume we want project assets to win.
      // So we should have copied template FIRST.
      // But project is already copied (lines 102).
      // So we should copy template img ONLY if file doesn't exist? cp doesn't support that easily.
      // Let's just copy template img with force: false (error on exist) -> catch error?
      // Or simpler: Just copy template img to temp, then copy project on top.

      // Let's modify to copy template img with `force: false` (actually `errorOnExist: true` exists in some APIs, node cp has `force`).
      // `force: true` overwrites. `force: false` fails if dest exists? No, force false just doesn't overwrite?
      // Node docs: `force`: When `true`, overwrite existing file. Default: `true`.

      if (existsSync(templateImgDir)) {
        await cp(templateImgDir, join(buildResourcesDir, 'img'), { recursive: true, force: false })
      }

      // 4. Update Tauri Config
      const configPath = join(buildDir, 'src-tauri', 'tauri.conf.json')
      const configRaw = await readFile(configPath, 'utf-8')
      const config = JSON.parse(configRaw)

      // Update game-specific settings
      config.productName = gameName || 'Z-Engine Game'
      config.identifier = `pl.z-engine.${gameName.toLowerCase().replace(/\\s+/g, '-')}`
      config.app.windows[0].title = gameName || 'Z-Engine Game'

      await writeFile(configPath, JSON.stringify(config, null, 2))

      // 5. Install Dependencies & Build
      console.log('[BuildService] Installing dependencies...')
      await execAsync('npm install', { cwd: buildDir })

      console.log('[BuildService] Building with Tauri...')
      try {
        // Add Rust/Cargo to PATH for Tauri
        const cargoPath = join(process.env.HOME || '', '.cargo', 'bin')
        const env = {
          ...process.env,
          PATH: `${cargoPath}:${process.env.PATH}`
        }
        const { stdout, stderr } = await execAsync('npx tauri build', { cwd: buildDir, env })
        console.log('[BuildService] Build stdout:', stdout)
        if (stderr) console.warn('[BuildService] Build stderr:', stderr)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('[BuildService] Build failed with error:', err.message)
        console.error('[BuildService] Build stdout:', err.stdout)
        console.error('[BuildService] Build stderr:', err.stderr)
        throw err
      }

      // 6. Move Output
      const distDir = join(projectPath, 'dist')
      await mkdir(distDir, { recursive: true })

      // Tauri outputs to src-tauri/target/release/bundle/
      const tauriBundleDir = join(buildDir, 'src-tauri', 'target', 'release', 'bundle')
      console.log('[BuildService] Checking Tauri output at:', tauriBundleDir)

      if (existsSync(tauriBundleDir)) {
        const { readdir } = await import('fs/promises')
        const bundleContents = await readdir(tauriBundleDir)
        console.log('[BuildService] Found bundles:', bundleContents)

        // Copy all bundles to dist
        for (const bundleType of bundleContents) {
          const src = join(tauriBundleDir, bundleType)
          const dest = join(distDir, bundleType)
          await cp(src, dest, { recursive: true })
          console.log(`[BuildService] Copied ${bundleType} to dist`)
        }

        // Fix macOS Quarantine
        if (process.platform === 'darwin') {
          console.log('[BuildService] Removing macOS quarantine attributes...')
          try {
            await execAsync(`xattr -cr "${distDir}"`)
          } catch {
            // Ignore error if no attributes found
          }
        }
      } else {
        console.error('[BuildService] Tauri bundle folder NOT found!')
        const { readdir } = await import('fs/promises')
        const targetDir = join(buildDir, 'src-tauri', 'target')
        if (existsSync(targetDir)) {
          const targetContents = await readdir(targetDir)
          console.log('[BuildService] Target dir contents:', targetContents)
        }
      }

      console.log('[BuildService] Tauri Build Complete!')
      return { success: true, message: `Build saved to ${distDir}` }
    } catch (error) {
      console.error('[BuildService] Error:', error)
      return { success: false, message: (error as Error).message }
    }
  }
}
