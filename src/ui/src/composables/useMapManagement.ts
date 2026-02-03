import { nextTick, type Ref, type ComputedRef } from 'vue'
import { ZMap, ZLayer, type TileSelection, type ZMapInfo, ZAudioConfig } from '@engine/types'

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
    [ZLayer.ground]: { icon: 'ground', data: createGrid(), index: 0 },
    [ZLayer.walls]: { icon: 'wall', data: createGrid(), index: 1 },
    [ZLayer.decoration]: { icon: 'decoration', data: createGrid(), index: 2 },
    [ZLayer.highest]: { icon: 'highest', data: createGrid(), index: 3 }
  }
}

export const useMapManagement = (
  storedMaps: Ref<ZMap[]>,
  mapInfos: Ref<ZMapInfo[]>,
  activeMapID: Ref<number | null>,
  activeMap: ComputedRef<ZMap | undefined>,
  saveProject: () => void,
  history: { recordHistory: () => void }
): {
  createMap: (
    name: string,
    width: number,
    height: number,
    parentId?: number,
    tilesetConfig?: Record<string, string>,
    extraProps?: {
      displayName?: string
      bgm?: import('@engine/types').ZAudioConfig
      bgs?: import('@engine/types').ZAudioConfig
      parallax?: {
        name: string
        loopX: boolean
        loopY: boolean
        scrollX: number
        scrollY: number
      }
      note?: string
      disableAutoshadow?: boolean
    }
  ) => void
  createFolder: (name: string, parentId?: number) => void
  updateMapProperties: (
    mapId: number,
    props: {
      name: string
      width: number
      height: number
      tilesetConfig: Record<string, string>
      displayName?: string
      bgm?: import('@engine/types').ZAudioConfig
      bgs?: import('@engine/types').ZAudioConfig
      parallax?: {
        name: string
        loopX: boolean
        loopY: boolean
        scrollX: number
        scrollY: number
      }
      note?: string
      disableAutoshadow?: boolean
    }
  ) => void
  initMap: (width: number, height: number) => void
  setActiveMap: (id: number) => void
  deleteMap: (mapId: number) => void
  deleteFolder: (folderId: number) => void
  exportMapAsJSON: () => void
  importMapFromJSON: () => Promise<void>
  moveEntry: (
    id: number,
    newParentId: number,
    targetId?: number,
    position?: 'before' | 'after' | 'inside'
  ) => void
  renameEntry: (id: number, name: string) => void
  isDescendant: (parent: number, child: number) => boolean
  toggleFolderExpanded: (id: number) => void
} => {
  const createMap = (
    name: string,
    width: number,
    height: number,
    parentId: number = 0,
    tilesetConfig: Record<string, string> = {},
    extraProps: {
      displayName?: string
      bgm?: import('@engine/types').ZAudioConfig
      bgs?: import('@engine/types').ZAudioConfig
      parallax?: {
        name: string
        loopX: boolean
        loopY: boolean
        scrollX: number
        scrollY: number
      }
      note?: string
      disableAutoshadow?: boolean
    } = {}
  ): void => {
    const newId = mapInfos.value.length > 0 ? Math.max(...mapInfos.value.map((m) => m.id)) + 1 : 1

    const newMap: ZMap = {
      id: newId,
      name,
      width,
      height,
      layers: createEmptyLayers(width, height),
      events: [],
      tilesetConfig,
      ...extraProps
    }

    const newInfo: ZMapInfo = {
      id: newId,
      name,
      parentId,
      order: mapInfos.value.filter((m) => m.parentId === parentId).length,
      isFolder: false
    }

    storedMaps.value.push(newMap)
    mapInfos.value.push(newInfo)
    activeMapID.value = newMap.id

    saveProject()
    nextTick(() => history.recordHistory())
  }

  const createFolder = (name: string, parentId: number = 0): void => {
    const newId = mapInfos.value.length > 0 ? Math.max(...mapInfos.value.map((m) => m.id)) + 1 : 1

    const newFolder: ZMapInfo = {
      id: newId,
      name,
      parentId,
      order: mapInfos.value.filter((m) => m.parentId === parentId).length,
      isFolder: true,
      expanded: true
    }

    mapInfos.value.push(newFolder)
    saveProject()
  }

  const updateMapProperties = (
    mapId: number,
    props: {
      name: string
      width: number
      height: number
      tilesetConfig: Record<string, string>
      displayName?: string
      bgm?: ZAudioConfig
      bgs?: ZAudioConfig
      parallax?: {
        name: string
        loopX: boolean
        loopY: boolean
        scrollX: number
        scrollY: number
      }
      note?: string
      disableAutoshadow?: boolean
    }
  ): void => {
    const map = storedMaps.value.find((m) => m.id === mapId)
    const info = mapInfos.value.find((m) => m.id === mapId)
    if (!map) return

    map.name = props.name
    if (info) info.name = props.name

    map.tilesetConfig = props.tilesetConfig
    map.displayName = props.displayName
    map.bgm = props.bgm
    map.bgs = props.bgs
    map.parallax = props.parallax
    map.note = props.note
    map.disableAutoshadow = props.disableAutoshadow

    if (map.width !== props.width || map.height !== props.height) {
      Object.values(map.layers).forEach((layer) => {
        const oldData = layer.data
        const newData = Array.from({ length: props.height }, (_, y) =>
          Array.from({ length: props.width }, (_, x) =>
            y < oldData.length && oldData[y] && x < oldData[y].length ? oldData[y][x] : []
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
    mapInfos.value = mapInfos.value.filter((m) => m.id !== mapId)
    if (activeMapID.value === mapId) {
      activeMapID.value = storedMaps.value[0]?.id || null
    }
    saveProject()
    history.recordHistory()
  }

  const deleteFolder = (folderId: number): void => {
    const folder = mapInfos.value.find((m) => m.id === folderId)
    if (!folder) return

    const oldParentId = folder.parentId
    mapInfos.value.forEach((m) => {
      if (m.parentId === folderId) {
        m.parentId = oldParentId
      }
    })

    mapInfos.value = mapInfos.value.filter((m) => m.id !== folderId)
    normalizeOrders(oldParentId)
    saveProject()
  }

  const normalizeOrders = (parentId: number): void => {
    const items = mapInfos.value
      .filter((m) => m.parentId === parentId)
      .sort((a, b) => a.order - b.order)
    items.forEach((item, index) => {
      item.order = index
    })
  }

  const isDescendant = (parent: number, child: number): boolean => {
    const item = mapInfos.value.find((m) => m.id === child)
    if (!item) return false
    if (item.parentId === parent) return true
    if (item.parentId === 0) return false
    return isDescendant(parent, item.parentId)
  }

  const moveEntry = (
    id: number,
    newParentId: number,
    targetId?: number,
    position: 'before' | 'after' | 'inside' = 'inside'
  ): void => {
    // Prevent moving a folder into itself
    if (id === newParentId || id === targetId) return

    // Prevent moving a folder into its own descendant
    if (isDescendant(id, newParentId)) {
      console.error('Circular reference detected in MapTree')
      return
    }

    const entry = mapInfos.value.find((m) => m.id === id)
    if (!entry) return

    const oldParentId = entry.parentId

    if (position === 'inside') {
      entry.parentId = newParentId
      // Append to end
      const siblings = mapInfos.value
        .filter((m) => m.parentId === newParentId && m.id !== id)
        .sort((a, b) => a.order - b.order)
      entry.order = siblings.length
    } else {
      const target = mapInfos.value.find((m) => m.id === targetId)
      if (!target) return

      entry.parentId = target.parentId

      const siblings = mapInfos.value
        .filter((m) => m.parentId === entry.parentId && m.id !== id)
        .sort((a, b) => a.order - b.order)

      const targetIndex = siblings.findIndex((s) => s.id === targetId)
      const insertionIndex = position === 'before' ? targetIndex : targetIndex + 1

      siblings.splice(insertionIndex, 0, entry)
      siblings.forEach((item, index) => {
        item.order = index
      })
    }

    // Always normalize old parent and new parent
    normalizeOrders(oldParentId)
    if (entry.parentId !== oldParentId) {
      normalizeOrders(entry.parentId)
    }

    saveProject()
  }

  const renameEntry = (id: number, name: string): void => {
    const info = mapInfos.value.find((m) => m.id === id)
    if (info) {
      info.name = name
      if (!info.isFolder) {
        const map = storedMaps.value.find((m) => m.id === id)
        if (map) map.name = name
      }
      saveProject()
    }
  }

  const toggleFolderExpanded = (id: number): void => {
    const folder = mapInfos.value.find((m) => m.id === id)
    if (folder) {
      folder.expanded = !folder.expanded
      // We don't necessarily need to save project for just expanded state,
      // but if we want it persistent per project, we should.
      saveProject()
    }
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
          const newId = Math.max(...mapInfos.value.map((m) => m.id), 0) + 1
          importedMap.id = newId
          storedMaps.value.push(importedMap)
          mapInfos.value.push({
            id: newId,
            name: importedMap.name,
            parentId: 0,
            order: mapInfos.value.filter((m) => m.parentId === 0).length,
            isFolder: false
          })
          nextTick(() => {
            history.recordHistory()
            setActiveMap(importedMap.id)
          })
          saveProject()
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
    createFolder,
    updateMapProperties,
    initMap,
    setActiveMap,
    deleteMap,
    deleteFolder,
    exportMapAsJSON,
    importMapFromJSON,
    moveEntry,
    renameEntry,
    isDescendant,
    toggleFolderExpanded
  }
}
