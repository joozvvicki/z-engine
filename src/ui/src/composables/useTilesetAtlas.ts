/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref, watch, type Ref } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import { IconMap } from '@engine/types'

export const useTilesetAtlas = (): {
  processedImageUrl: Ref<string>
  isProcessing: Ref<boolean>
  iconMapping: Ref<IconMap[]>
  GRID_SIZE: number
  atlasWidth: Ref<number>
  atlasHeight: Ref<number>
} => {
  const store = useEditorStore()
  const processedImageUrl = ref('')
  const isProcessing = ref(false)
  const iconMapping = ref<IconMap[]>([])
  const atlasWidth = ref(0)
  const atlasHeight = ref(0)

  const GRID_SIZE = 48
  const ICONS_PER_ROW = 8

  const A4_LAYOUT = [
    { yStart: 0, h: 3 },
    { yStart: 3, h: 2 },
    { yStart: 5, h: 3 },
    { yStart: 8, h: 2 },
    { yStart: 10, h: 3 },
    { yStart: 13, h: 2 }
  ]

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  const processTileset = async (): Promise<void> => {
    isProcessing.value = true
    iconMapping.value = []

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (store.activeTab === 'A') {
      const aTilesets = ['A1', 'A2', 'A3', 'A4', 'A5']
      const tempTilesData: { img: HTMLImageElement; tiles: any[]; id: string }[] = []

      for (const id of aTilesets) {
        const ts = store.tilesets.find((t) => t.id === id)
        if (!ts) continue

        try {
          const img = await loadImage(ts.url)
          const cols = Math.floor(img.width / GRID_SIZE)
          const rows = Math.floor(img.height / GRID_SIZE)
          const tiles: any[] = []

          if (id === 'A1') {
            const a1X = [0, 6, 8, 14]
            for (let y = 0; y < rows; y += 3)
              for (const x of a1X)
                if (x < cols) tiles.push({ ox: x, oy: y, w: 2, h: 3, isAuto: true })
          } else if (id === 'A2') {
            for (let y = 0; y < rows; y += 3)
              for (let x = 0; x < cols; x += 2)
                tiles.push({ ox: x, oy: y, w: 2, h: 3, isAuto: true })
          } else if (id === 'A3') {
            for (let y = 0; y < rows; y += 2)
              for (let x = 0; x < cols; x += 2)
                tiles.push({ ox: x, oy: y, w: 2, h: 2, isAuto: true })
          } else if (id === 'A4') {
            for (const l of A4_LAYOUT)
              for (let x = 0; x < cols; x += 2)
                if (l.yStart < rows) tiles.push({ ox: x, oy: l.yStart, w: 2, h: l.h, isAuto: true })
          } else if (id === 'A5') {
            for (let y = 0; y < rows; y++)
              for (let x = 0; x < cols; x++) tiles.push({ ox: x, oy: y, w: 1, h: 1, isAuto: false })
          }
          tempTilesData.push({ img, tiles, id })
        } catch (e) {
          console.error(`Load error ${id}`, e)
        }
      }

      const totalIcons = tempTilesData.reduce((acc, curr) => acc + curr.tiles.length, 0)
      canvas.width = ICONS_PER_ROW * GRID_SIZE
      canvas.height = Math.ceil(totalIcons / ICONS_PER_ROW) * GRID_SIZE

      let globalIndex = 0
      tempTilesData.forEach((data) => {
        data.tiles.forEach((tile) => {
          const uiX = globalIndex % ICONS_PER_ROW
          const uiY = Math.floor(globalIndex / ICONS_PER_ROW)

          ctx.drawImage(
            data.img,
            tile.ox * GRID_SIZE,
            tile.oy * GRID_SIZE,
            GRID_SIZE,
            GRID_SIZE,
            uiX * GRID_SIZE,
            uiY * GRID_SIZE,
            GRID_SIZE,
            GRID_SIZE
          )

          const originalTs = store.tilesets.find((t) => t.id === data.id)
          const targetUrl = originalTs?.url || data.img.src

          iconMapping.value.push({
            uiX,
            uiY,
            ...tile,
            tilesetId: data.id,
            url: targetUrl,
            isAuto: tile.isAuto
          })
          globalIndex++
        })
      })
    } else {
      const ts = store.tilesets.find((t) => t.id === store.activeTab)
      if (ts) {
        const img = await loadImage(ts.url)
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        // Populate iconMapping for non-A tabs too?
        // TilesetSelector currently uses a different loop for B-E.
      }
    }
    processedImageUrl.value = canvas.toDataURL()
    isProcessing.value = false
    atlasWidth.value = canvas.width
    atlasHeight.value = canvas.height
  }

  watch([() => store.activeTab, () => store.tilesets], processTileset, {
    immediate: true,
    deep: true
  })

  return { processedImageUrl, isProcessing, iconMapping, GRID_SIZE, atlasWidth, atlasHeight }
}
