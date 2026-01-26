<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '@ui/stores/editor'

const store = useEditorStore()

const iconMapping = ref<
  { uiX: number; uiY: number; ox: number; oy: number; w: number; h: number }[]
>([])
const processedImageUrl = ref('')
const isProcessing = ref(false)

// Struktura rzędów A4 (Dachy/Ściany)
const A4_LAYOUT = [
  { yStart: 0, h: 3 },
  { yStart: 3, h: 2 },
  { yStart: 5, h: 3 },
  { yStart: 8, h: 2 },
  { yStart: 10, h: 3 },
  { yStart: 13, h: 2 }
]

const isAutotileTab = computed(() => ['A1', 'A2', 'A3', 'A4'].includes(store.activeTab))

const rawTilesetUrl = computed(() => {
  const ts = store.tilesets.find((t) => t.id === store.activeTab)
  return ts ? ts.url : ''
})

const processTilesetImage = async (): Promise<void> => {
  if (!rawTilesetUrl.value) return
  isProcessing.value = true
  iconMapping.value = []

  const img = new Image()
  img.src = rawTilesetUrl.value
  await new Promise((resolve) => (img.onload = resolve))

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rawCols = img.width / store.tileSize
  const rawRows = img.height / store.tileSize
  const tilesToExtract: { ox: number; oy: number; w: number; h: number }[] = []

  if (store.activeTab === 'A1') {
    const a1IconsX = [0, 6, 8, 14]
    for (let y = 0; y < rawRows; y += 3) {
      for (const x of a1IconsX) {
        if (x < rawCols) tilesToExtract.push({ ox: x, oy: y, w: 2, h: 3 })
      }
    }
  } else if (store.activeTab === 'A2') {
    // W A2 każdy blok 2x3 jest unikalny.
    for (let y = 0; y < rawRows; y += 3) {
      for (let x = 0; x < rawCols; x += 2) tilesToExtract.push({ ox: x, oy: y, w: 2, h: 3 })
    }
  } else if (store.activeTab === 'A3') {
    // A3 to bloki 2x2.
    for (let y = 0; y < rawRows; y += 2) {
      for (let x = 0; x < rawCols; x += 2) tilesToExtract.push({ ox: x, oy: y, w: 2, h: 2 })
    }
  } else if (store.activeTab === 'A4') {
    // A4 używa Twojego specyficznego layoutu.
    for (const l of A4_LAYOUT) {
      if (l.yStart >= rawRows) continue
      for (let x = 0; x < rawCols; x += 2)
        tilesToExtract.push({ ox: x, oy: l.yStart, w: 2, h: l.h })
    }
  }

  if (isAutotileTab.value) {
    const iconsPerRow = 8
    canvas.width = Math.min(tilesToExtract.length, iconsPerRow) * store.tileSize
    canvas.height = Math.ceil(tilesToExtract.length / iconsPerRow) * store.tileSize

    tilesToExtract.forEach((tile, index) => {
      const uiX = index % iconsPerRow
      const uiY = Math.floor(index / iconsPerRow)
      ctx.drawImage(
        img,
        tile.ox * store.tileSize,
        tile.oy * store.tileSize,
        store.tileSize,
        store.tileSize,
        uiX * store.tileSize,
        uiY * store.tileSize,
        store.tileSize,
        store.tileSize
      )
      iconMapping.value.push({ uiX, uiY, ...tile })
    })
  } else {
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
  }

  processedImageUrl.value = canvas.toDataURL()
  isProcessing.value = false
}

watch(rawTilesetUrl, processTilesetImage, { immediate: true })

const handleMouseDown = (e: MouseEvent): void => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / store.tileSize)
  const ty = Math.floor((e.clientY - rect.top) / store.tileSize)

  if (isAutotileTab.value) {
    const found = iconMapping.value.find((m) => m.uiX === tx && m.uiY === ty)
    if (found) {
      store.setSelection({
        x: found.ox,
        y: found.oy,
        w: found.w,
        h: found.h,
        tilesetId: store.activeTab,
        isAutotile: true
      })
    }
  } else {
    isSelecting.value = true
    startPos.value = { x: tx, y: ty }
    store.setSelection({ x: tx, y: ty, w: 1, h: 1, tilesetId: store.activeTab, isAutotile: false })
  }
}

const isSelecting = ref(false)
const startPos = ref({ x: 0, y: 0 })

const handleMouseMove = (e: MouseEvent): void => {
  if (!isSelecting.value) return

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const tx = Math.floor((e.clientX - rect.left) / store.tileSize)
  const ty = Math.floor((e.clientY - rect.top) / store.tileSize)

  const x = Math.min(startPos.value.x, tx)
  const y = Math.min(startPos.value.y, ty)
  const w = Math.abs(startPos.value.x - tx) + 1
  const h = Math.abs(startPos.value.y - ty) + 1

  store.setSelection({
    x,
    y,
    w,
    h,
    tilesetId: store.activeTab,
    isAutotile: false
  })
}
const handleMouseUp = (): boolean => (isSelecting.value = false)

const selectionStyle = computed(() => {
  if (!store.selection || store.selection.tilesetId !== store.activeTab) return null
  const sel = store.selection
  let x = sel.x,
    y = sel.y,
    w = sel.w,
    h = sel.h

  if (isAutotileTab.value) {
    const map = iconMapping.value.find((m) => m.ox === sel.x && m.oy === sel.y)
    if (map) {
      x = map.uiX
      y = map.uiY
      w = 1
      h = 1
    }
  }

  return {
    left: x * store.tileSize + 'px',
    top: y * store.tileSize + 'px',
    width: w * store.tileSize + 'px',
    height: h * store.tileSize + 'px'
  }
})
</script>

<template>
  <div class="flex flex-col h-full border-l border-white/5 select-none">
    <div class="flex p-1 gap-1 border-b border-white/5">
      <button
        v-for="ts in store.tilesets.map((t) => t.id)"
        :key="ts"
        :class="
          store.activeTab === ts ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-white/5'
        "
        class="flex-1 py-1.5 text-[10px] font-bold rounded uppercase transition-colors"
        @click="store.activeTab = ts"
      >
        {{ ts }}
      </button>
    </div>

    <div class="flex-1 overflow-auto p-4 relative scrollbar-thin">
      <div
        v-if="isProcessing"
        class="absolute inset-0 flex items-center justify-center text-white/40 text-[10px] uppercase tracking-widest animate-pulse"
      >
        Przetwarzanie...
      </div>

      <div
        v-else
        class="relative w-max border border-white/10 shadow-2xl bg-[#1a1a1a] cursor-crosshair"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseUp"
      >
        <img :src="processedImageUrl" class="block pixelated pointer-events-none" />
        <div class="absolute inset-0 pointer-events-none opacity-5 grid-bg"></div>
        <div
          v-if="selectionStyle"
          :style="selectionStyle"
          class="absolute border-2 border-yellow-400 z-10 mix-blend-difference shadow-lg"
        >
          <div
            v-if="isAutotileTab"
            class="absolute -top-4 left-[-2px] bg-yellow-400 text-[8px] text-black px-1 font-bold"
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
    linear-gradient(to right, #fff 1px, transparent 1px),
    linear-gradient(to bottom, #fff 1px, transparent 1px);
  background-size: 48px 48px;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
</style>
