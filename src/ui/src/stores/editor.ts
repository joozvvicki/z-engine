import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface TileSelection {
  x: number
  y: number
  w: number
  h: number
  tilesetId: string
}

export type ZTool = 'brush' | 'eraser'
export type ZLayer = 'ground' | 'decoration' | 'events'

export const useEditorStore = defineStore('editor', () => {
  const tileSize = ref(48)
  const selection = ref<TileSelection>({ x: 0, y: 0, w: 1, h: 1, tilesetId: 'A1' })
  const mapData = ref<(TileSelection | null)[][]>([])
  const activeLayer = ref<ZLayer>('ground')
  const layers: ZLayer[] = ['ground', 'decoration', 'events']

  function setLayer(layer: ZLayer): void {
    activeLayer.value = layer
  }

  const currentTool = ref<ZTool>('brush')

  function setTool(tool: ZTool): void {
    if (currentTool.value === 'eraser') {
      selection.value = { x: 0, y: 0, w: 1, h: 1, tilesetId: 'A1' }
    }
    currentTool.value = tool
  }

  function setSelection(newSelection: TileSelection): void {
    selection.value = newSelection
  }

  function initMap(width: number, height: number): void {
    mapData.value = Array.from({ length: height }, () => Array.from({ length: width }, () => null))
  }

  function setTileAt(x: number, y: number, selection: TileSelection | null): void {
    if (mapData.value[y] && mapData.value[y][x] !== undefined) {
      mapData.value[y][x] = selection
    }
  }

  return {
    tileSize,
    selection,
    mapData,
    activeLayer,
    currentTool,
    layers,
    setLayer,
    setTool,
    initMap,
    setTileAt,
    setSelection
  }
})
