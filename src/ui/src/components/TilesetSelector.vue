<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '@ui/stores/editor'

const store = useEditorStore()

const iconMapping = ref<
  {
    uiX: number
    uiY: number
    ox: number
    oy: number
    w: number
    h: number
    tilesetId: string
    isAuto: boolean
  }[]
>([])
const processedImageUrl = ref('')
const isProcessing = ref(false)

const SELECTION_GRID = 48
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

/**
 * Główna funkcja procesująca:
 * Łączy A1-A4 w jeden atlas lub renderuje standardowy arkusz B/C/D
 */
const processTileset = async (): Promise<void> => {
  isProcessing.value = true
  iconMapping.value = []

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (store.activeTab === 'A') {
    const aTilesets = ['A1', 'A2', 'A3', 'A4']
    const tempTilesData: any[] = []

    // 1. Zbieranie danych o ikonach z arkuszy A
    for (const id of aTilesets) {
      const ts = store.tilesets.find((t) => t.id === id)
      if (!ts) continue

      try {
        const img = await loadImage(ts.url)
        const rawCols = img.width / SELECTION_GRID
        const rawRows = img.height / SELECTION_GRID
        const tiles: any[] = []

        if (id === 'A1') {
          const a1X = [0, 6, 8, 14]
          for (let y = 0; y < rawRows; y += 3) {
            for (const x of a1X) if (x < rawCols) tiles.push({ ox: x, oy: y, w: 2, h: 3 })
          }
        } else if (id === 'A2') {
          for (let y = 0; y < rawRows; y += 3) {
            for (let x = 0; x < rawCols; x += 2) tiles.push({ ox: x, oy: y, w: 2, h: 3 })
          }
        } else if (id === 'A3') {
          for (let y = 0; y < rawRows; y += 2) {
            for (let x = 0; x < rawCols; x += 2) tiles.push({ ox: x, oy: y, w: 2, h: 2 })
          }
        } else if (id === 'A4') {
          for (const l of A4_LAYOUT) {
            if (l.yStart >= rawRows) continue
            for (let x = 0; x < rawCols; x += 2) tiles.push({ ox: x, oy: l.yStart, w: 2, h: l.h })
          }
        }
        tempTilesData.push({ img, tiles, id })
      } catch (e) {
        console.error(`Nie udało się załadować ${id}`, e)
      }
    }

    const totalIcons = tempTilesData.reduce((acc, curr) => acc + curr.tiles.length, 0)
    canvas.width = ICONS_PER_ROW * SELECTION_GRID
    canvas.height = Math.ceil(totalIcons / ICONS_PER_ROW) * SELECTION_GRID

    let globalIndex = 0
    tempTilesData.forEach((data) => {
      data.tiles.forEach((tile: any) => {
        const uiX = globalIndex % ICONS_PER_ROW
        const uiY = Math.floor(globalIndex / ICONS_PER_ROW)

        ctx.drawImage(
          data.img,
          tile.ox * SELECTION_GRID,
          tile.oy * SELECTION_GRID,
          SELECTION_GRID,
          SELECTION_GRID,
          uiX * SELECTION_GRID,
          uiY * SELECTION_GRID,
          SELECTION_GRID,
          SELECTION_GRID
        )

        iconMapping.value.push({ uiX, uiY, ...tile, tilesetId: data.id, isAuto: true })
        globalIndex++
      })
    })
  } else {
    // Widok standardowy dla B, C, D
    const ts = store.tilesets.find((t) => t.id === store.activeTab)
    if (ts) {
      try {
        const img = await loadImage(ts.url)
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
      } catch (e) {
        console.error('Błąd ładowania arkusza statycznego', e)
      }
    }
  }

  processedImageUrl.value = canvas.toDataURL()
  isProcessing.value = false
}

watch([() => store.activeTab, () => store.tilesets], processTileset, {
  immediate: true,
  deep: true
})

const isSelecting = ref(false)
const startPos = ref({ x: 0, y: 0 })

const handleMouseDown = (e: MouseEvent): void => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / SELECTION_GRID)
  const ty = Math.floor((e.clientY - rect.top) / SELECTION_GRID)

  if (store.activeTab === 'A') {
    const found = iconMapping.value.find((m) => m.uiX === tx && m.uiY === ty)
    if (found) {
      store.setSelection({
        x: found.ox,
        y: found.oy,
        w: found.w,
        h: found.h,
        tilesetId: found.tilesetId,
        isAutotile: true
      })
    }
  } else {
    isSelecting.value = true
    startPos.value = { x: tx, y: ty }
    store.setSelection({
      x: tx,
      y: ty,
      w: 1,
      h: 1,
      tilesetId: store.activeTab,
      isAutotile: false
    })
  }
}

const handleMouseMove = (e: MouseEvent): void => {
  if (!isSelecting.value || store.activeTab === 'A') return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / SELECTION_GRID)
  const ty = Math.floor((e.clientY - rect.top) / SELECTION_GRID)

  const x = Math.min(startPos.value.x, tx)
  const y = Math.min(startPos.value.y, ty)
  const w = Math.abs(startPos.value.x - tx) + 1
  const h = Math.abs(startPos.value.y - ty) + 1

  store.setSelection({ x, y, w, h, tilesetId: store.activeTab, isAutotile: false })
}

const handleMouseUp = (): boolean => (isSelecting.value = false)

const selectionStyle = computed(() => {
  if (!store.selection) return null
  const sel = store.selection
  const isA = ['A1', 'A2', 'A3', 'A4'].includes(sel.tilesetId)

  // Mapowanie pozycji ramki dla widoku scalonego A
  if (store.activeTab === 'A' && isA) {
    const map = iconMapping.value.find(
      (m) => m.ox === sel.x && m.oy === sel.y && m.tilesetId === sel.tilesetId
    )
    return map
      ? {
          left: map.uiX * SELECTION_GRID + 'px',
          top: map.uiY * SELECTION_GRID + 'px',
          width: SELECTION_GRID + 'px',
          height: SELECTION_GRID + 'px'
        }
      : null
  }
  // Standardowa ramka dla B, C, D
  else if (store.activeTab === sel.tilesetId && !isA) {
    return {
      left: sel.x * SELECTION_GRID + 'px',
      top: sel.y * SELECTION_GRID + 'px',
      width: sel.w * SELECTION_GRID + 'px',
      height: sel.h * SELECTION_GRID + 'px'
    }
  }
  return null
})
</script>

<template>
  <div class="flex flex-col h-full border-l border-white/5 select-none">
    <div class="flex p-1 gap-1 border-b border-white/5">
      <button
        v-for="tab in ['A', 'B', 'C', 'D']"
        :key="tab"
        :class="
          store.activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-white/5'
        "
        class="flex-1 py-1.5 text-[10px] font-bold rounded uppercase transition-colors cursor-pointer"
        @click="store.activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <div class="flex-1 overflow-auto relative scrollbar-thin">
      <div
        v-if="isProcessing"
        class="absolute inset-0 flex items-center justify-center text-white/40 text-[10px] uppercase tracking-widest animate-pulse"
      >
        Optymalizacja atlasu...
      </div>

      <div
        v-else
        class="relative w-max border border-white/10 shadow-2xl cursor-crosshair"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <img
          :src="processedImageUrl"
          class="block pixelated pointer-events-none"
          draggable="false"
        />
        <div class="absolute inset-0 pointer-events-none opacity-5 grid-bg"></div>

        <div
          v-if="selectionStyle"
          :style="selectionStyle"
          class="absolute border-2 border-yellow-400 z-10 shadow-lg"
        >
          <div
            v-if="store.activeTab === 'A'"
            class="absolute top-0 left-[-2px] bg-yellow-400 text-[8px] text-black px-1 font-bold"
          >
            AUTO
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
.grid-bg {
  background-image:
    linear-gradient(to right, #000 1px, transparent 1px),
    linear-gradient(to bottom, #000 1px, transparent 1px);
  background-size: 48px 48px;
}
.shadow-selection {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
</style>
