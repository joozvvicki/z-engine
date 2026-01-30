import { computed, type Ref, type ComputedRef } from 'vue'
import { TILESETS } from '../stores/editor/constants'
import type { ZMap } from '@engine/types'

export const useTilesets = (
  activeMap: ComputedRef<ZMap | undefined>,
  storedTilesetConfigs: Ref<
    Record<
      string,
      Record<
        string,
        {
          isSolid: boolean
          isHighPriority: boolean
          sortYOffset: number
          collisionMask: boolean[]
          dirBlock: number
        }
      >
    >
  >
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
  tilesetFileList: ComputedRef<{ name: string; url: string }[]>
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
    let normalizedUrl = tilesetUrl
    try {
      if (tilesetUrl.startsWith('http')) {
        normalizedUrl = new URL(tilesetUrl).pathname
      }
    } catch {
      // Keep original if parsing fails
    }

    if (!storedTilesetConfigs.value[normalizedUrl]) {
      storedTilesetConfigs.value[normalizedUrl] = {}
    }
    const key = `${x}_${y}`
    const current = storedTilesetConfigs.value[normalizedUrl][key] || {
      isSolid: false,
      isHighPriority: false
    }

    storedTilesetConfigs.value[normalizedUrl][key] = {
      ...current,
      ...config
    }
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
      return { name, url: url as string }
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
        result.push({ id: slot, url: config[slot] })
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
    tilesetFileList,
    currentMapTilesets,
    staticTilesets: TILESETS
  }
}
