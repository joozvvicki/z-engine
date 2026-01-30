import { computed, type Ref, type ComputedRef } from 'vue'
import { TILESETS } from '../stores/editor/constants'
import type { ZMap, TilesetConfig } from '@engine/types'
import { ProjectService } from '../services/ProjectService'

export const useTilesets = (
  activeMap: ComputedRef<ZMap | undefined>,
  storedTilesetConfigs: Ref<Record<string, TilesetConfig>>,
  onUpdate?: () => void
): {
  updateTileConfig: (
    tilesetUrl: string,
    x: number,
    y: number,
    config: Partial<{
      isSolid: boolean
      isHighPriority: boolean
      collisionMask: boolean[]
      sortYOffset: number
      dirBlock: number
    }>
  ) => void
  getTileConfig: (tilesetUrl: string, x: number, y: number) => TilesetConfig['key'] | undefined
  getTileConfigMap: (tilesetUrl: string) => Record<string, TilesetConfig['key']> | undefined
  tilesetFileList: ComputedRef<{ name: string; url: string; relativePath: string }[]>
  currentMapTilesets: ComputedRef<{ id: string; url: string }[]>
  staticTilesets: { id: string; url: string }[]
} => {
  const updateTileConfig = (
    tilesetUrl: string,
    x: number,
    y: number,
    config: Partial<{
      isSolid: boolean
      isHighPriority: boolean
      collisionMask: boolean[]
      sortYOffset: number
      dirBlock: number
    }>
  ): void => {
    // We must use the project-relative path as the key for storage,
    // because that's how it's saved in Tilesets.json and loaded back.
    // tilesetUrl here might be a resolved absolute URL (z-proj://...)
    // or a full http URL if running in dev mode.
    const normalizedUrl = ProjectService.getRelativePath(tilesetUrl)

    if (!storedTilesetConfigs.value[normalizedUrl]) {
      storedTilesetConfigs.value[normalizedUrl] = {}
    }
    const key = `${x}_${y}`
    const current = storedTilesetConfigs.value[normalizedUrl][key] || {
      isSolid: false,
      isHighPriority: false,
      dirBlock: 0
    }

    storedTilesetConfigs.value[normalizedUrl][key] = {
      ...current,
      ...config
    }

    if (onUpdate) onUpdate()
  }

  const getTileConfig = (
    tilesetUrl: string,
    x: number,
    y: number
  ): TilesetConfig['key'] | undefined => {
    const normalizedUrl = ProjectService.getRelativePath(tilesetUrl)
    const key = `${x}_${y}`
    return storedTilesetConfigs.value[normalizedUrl]?.[key]
  }

  const getTileConfigMap = (
    tilesetUrl: string
  ): Record<string, TilesetConfig['key']> | undefined => {
    const normalizedUrl = ProjectService.getRelativePath(tilesetUrl)
    return storedTilesetConfigs.value[normalizedUrl]
  }

  // Scanning available tileset files
  const availableTilesetFiles = import.meta.glob('@ui/assets/img/tilesets/*.png', {
    eager: true,
    as: 'url'
  })

  // Computed: Dynamically resolve tileset list for properties modal
  const tilesetFileList = computed(() => {
    return Object.entries(availableTilesetFiles).map(([path, url]) => {
      const name = path.split('/').pop() || path
      // Construct project-relative path (standardized key)
      const relativePath = `img/tilesets/${name}`
      return { name, url: url as string, relativePath }
    })
  })

  // Computed: Dynamically resolve tilesets for the current map
  const currentMapTilesets = computed(() => {
    if (!activeMap.value) return TILESETS

    const config = activeMap.value.tilesetConfig || {}
    const result: { id: string; url: string }[] = []

    // Slots A1-A5, B, C, D, E, Roofs
    const slots = ['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'Roofs']
    slots.forEach((slot) => {
      if (config[slot]) {
        result.push({ id: slot, url: ProjectService.resolveAssetUrl(config[slot]) })
      } else {
        // Fallback to default if not set
        const def = TILESETS.find((t) => t.id === slot)
        if (def) result.push(def)
      }
    })
    return result
  })

  return {
    updateTileConfig,
    getTileConfig,
    getTileConfigMap,
    tilesetFileList,
    currentMapTilesets,
    staticTilesets: TILESETS
  }
}
