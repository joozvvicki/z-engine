// GameDataProvider.js
// Reads data from application resources

export class GameDataProvider {
  async getMap(id) {
    try {
      const filename = `Map${String(id).padStart(3, '0')}.json`
      const response = await fetch(`./build-resources/data/${filename}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (e) {
      console.error(`Failed to load map ${id}`, e)
      return null
    }
  }

  async getTilesetConfigs() {
    try {
      const response = await fetch('./build-resources/data/Tilesets.json')
      if (!response.ok) return {}
      return await response.json()
    } catch (e) {
      return {}
    }
  }

  async getSystemData() {
    try {
      const response = await fetch('./build-resources/data/System.json')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (e) {
      console.error('Failed to load System.json', e)
      return null
    }
  }

  getTilesetUrl(slotId) {
    // In the exported game, tilesets are in resources/img/tilesets/
    // But map data might refer to them by project-relative path "img/tilesets/World_A1.png"
    // We assume the export process maintains the structure or we map it.
    // Ideally, the configs map slot -> relative path.
    // The engine calls resolveAssetUrl on the result.
    return '' // Engine usually uses getTilesetConfigs for the URL map
  }

  resolveAssetUrl(path) {
    // path is something like "img/tilesets/World_A1.png"
    // We map it to "./resources/img/tilesets/World_A1.png"

    // Clean path
    let clean = path.replace(/^\/+/, '')
    if (clean.startsWith('src/ui/assets/')) {
      clean = clean.replace('src/ui/assets/', '')
    }
    const resolved = `./build-resources/${clean}`
    console.log(`[GDP] Resolving: '${path}' -> '${resolved}'`)
    return resolved
  }

  setTileAt(x, y, tile, isStacking, layer) {
    // Runtime is read-only for map data usually
    // Or we could implement in-memory modification
  }
}
