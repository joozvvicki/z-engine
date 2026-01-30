import { nextTick, type Ref, type ComputedRef } from 'vue'
import { ZMap, ZLayer, type TileSelection } from '@engine/types'

// Helper do tworzenia pustej struktury warstw
export const createEmptyLayers = (
  width: number,
  height: number
): Record<
  ZLayer,
  {
    icon: string
    data: (TileSelection[] | null)[][]
    index: number
  }
> => {
  const createGrid = (): (TileSelection[] | null)[][] => {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => []))
  }
  return {
    [ZLayer.ground]: { data: createGrid(), index: 0, icon: 'background' },
    [ZLayer.walls]: { data: createGrid(), index: 1, icon: 'wall' },
    [ZLayer.decoration]: { data: createGrid(), index: 2, icon: 'cactus' },
    [ZLayer.events]: { data: createGrid(), index: 3, icon: 'box' },
    [ZLayer.highest]: { data: createGrid(), index: 4, icon: 'star' }
  }
}

export const useMapManagement = (
  storedMaps: Ref<ZMap[]>,
  activeMapID: Ref<number | null>,
  activeMap: ComputedRef<ZMap | undefined>,
  saveProject: () => void,
  history: { recordHistory: () => void }
): {
  createMap: (
    name: string,
    width: number,
    height: number,
    tilesetConfig?: Record<string, string>
  ) => void
  updateMapProperties: (
    mapId: number,
    props: {
      name: string
      width: number
      height: number
      tilesetConfig: Record<string, string>
    }
  ) => void
  initMap: (width: number, height: number) => void
  setActiveMap: (id: number) => void
  deleteMap: (mapId: number) => void
  exportMapAsJSON: () => void
  importMapFromJSON: () => Promise<void>
} => {
  const createMap = (
    name: string,
    width: number,
    height: number,
    tilesetConfig: Record<string, string> = {}
  ): void => {
    const newId =
      storedMaps.value.length > 0 ? Math.max(...storedMaps.value.map((m) => m.id)) + 1 : 1
    const newMap: ZMap = {
      id: newId,
      name,
      width,
      height,
      layers: createEmptyLayers(width, height),
      events: [],
      tilesetConfig
    }
    storedMaps.value.push(newMap)
    activeMapID.value = newMap.id

    // Inicjalizacja historii dla nowej mapy
    nextTick(() => history.recordHistory())
  }

  const updateMapProperties = (
    mapId: number,
    props: { name: string; width: number; height: number; tilesetConfig: Record<string, string> }
  ): void => {
    const map = storedMaps.value.find((m) => m.id === mapId)
    if (!map) return

    map.name = props.name
    map.tilesetConfig = props.tilesetConfig

    // Resize logic if dimensions changed (cropping or padding)
    if (map.width !== props.width || map.height !== props.height) {
      // Re-initialize layers with new size, preserving OLD data where possible
      Object.values(map.layers).forEach((layer) => {
        const oldData = layer.data
        const newData = Array.from({ length: props.height }, (_, y) =>
          Array.from({ length: props.width }, (_, x) =>
            y < oldData.length && oldData[y] && x < oldData[y].length ? oldData[y][x] : null
          )
        )
        layer.data = newData
      })

      map.width = props.width
      map.height = props.height
    }

    saveProject()
    history.recordHistory()
  }

  const initMap = (width: number, height: number): void => {
    if (!activeMap.value) return

    activeMap.value.width = width
    activeMap.value.height = height
    activeMap.value.layers = createEmptyLayers(width, height)

    saveProject()
    history.recordHistory()
  }

  const setActiveMap = (id: number): void => {
    if (activeMapID.value === id) return
    activeMapID.value = id
  }

  const deleteMap = (mapId: number): void => {
    storedMaps.value = storedMaps.value.filter((m) => m.id !== mapId)
    if (activeMapID.value === mapId) {
      activeMapID.value = storedMaps.value[0]?.id || null
    }
    saveProject()
    history.recordHistory()
  }

  const exportMapAsJSON = (): void => {
    if (!activeMap.value) return
    const dataStr = JSON.stringify(activeMap.value)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `Map${activeMap.value.id}_${activeMap.value.name.replace(/\s+/g, '_')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const importMapFromJSON = async (): Promise<void> => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.style.display = 'none'
    document.body.appendChild(input)

    input.onchange = async () => {
      if (input.files?.[0]) {
        try {
          const text = await input.files[0].text()
          const importedMap = JSON.parse(text)
          importedMap.id = Math.max(...storedMaps.value.map((m) => m.id), 0) + 1
          storedMaps.value.push(importedMap)
          nextTick(() => {
            history.recordHistory()
            setActiveMap(importedMap.id)
          })
        } catch (e) {
          console.error('Failed to import map', e)
        }
      }
      document.body.removeChild(input)
    }
    input.click()
  }

  return {
    createMap,
    updateMapProperties,
    initMap,
    setActiveMap,
    deleteMap,
    exportMapAsJSON,
    importMapFromJSON
  }
}
