import { ref, computed, type Ref, ComputedRef } from 'vue'
import { useEditorStore } from '@ui/stores/editor'
import type { IconMap } from '@engine/types'

export const useTilesetSelection = (
  iconMapping: Ref<IconMap[]>,
  GRID_SIZE: number
): {
  handleMouseDown: (e: MouseEvent) => void
  handleMouseMove: (e: MouseEvent) => void
  handleMouseUp: () => void
  selectionStyle: ComputedRef<{
    left: string
    top: string
    width: string
    height: string
  } | null>
} => {
  const store = useEditorStore()

  const isSelecting = ref(false)
  const startPos = ref({ x: 0, y: 0 })
  const isSelectingNormalTilesInA = ref(false)

  const getGridPos = (e: MouseEvent): { x: number; y: number } => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return {
      x: Math.floor((e.clientX - rect.left) / GRID_SIZE),
      y: Math.floor((e.clientY - rect.top) / GRID_SIZE)
    }
  }

  const handleMouseDown = (e: MouseEvent): void => {
    const pos = getGridPos(e)

    if (store.activeTab === 'A') {
      const found = iconMapping.value.find((m) => m.uiX === pos.x && m.uiY === pos.y)
      if (found) {
        if (found.isAuto) {
          store.setSelection({
            x: found.ox,
            y: found.oy,
            w: found.w,
            h: found.h,
            tilesetId: found.tilesetId,
            isAutotile: true
          })
          isSelectingNormalTilesInA.value = false
        } else {
          isSelecting.value = true
          isSelectingNormalTilesInA.value = true
          startPos.value = pos
          store.setSelection({
            x: found.ox,
            y: found.oy,
            w: found.w,
            h: found.h,
            tilesetId: found.tilesetId,
            isAutotile: false
          })
        }
      }
    } else {
      isSelecting.value = true
      isSelectingNormalTilesInA.value = false
      startPos.value = pos
      store.setSelection({
        x: pos.x,
        y: pos.y,
        w: 1,
        h: 1,
        tilesetId: store.activeTab,
        isAutotile: false
      })
    }
  }

  const handleMouseMove = (e: MouseEvent): void => {
    if (!isSelecting.value) return
    const pos = getGridPos(e)
    const xMinUI = Math.min(startPos.value.x, pos.x)
    const yMinUI = Math.min(startPos.value.y, pos.y)
    const w = Math.abs(startPos.value.x - pos.x) + 1
    const h = Math.abs(startPos.value.y - pos.y) + 1

    if (store.activeTab === 'A' && isSelectingNormalTilesInA.value) {
      const startTile = iconMapping.value.find((m) => m.uiX === xMinUI && m.uiY === yMinUI)
      if (startTile && !startTile.isAuto) {
        store.setSelection({
          x: startTile.ox,
          y: startTile.oy,
          w,
          h,
          tilesetId: startTile.tilesetId,
          isAutotile: false
        })
      }
    } else if (store.activeTab !== 'A') {
      const x = Math.min(startPos.value.x, pos.x)
      const y = Math.min(startPos.value.y, pos.y)
      store.setSelection({
        x,
        y,
        w,
        h,
        tilesetId: store.activeTab,
        isAutotile: false
      })
    }
  }

  const handleMouseUp = (): void => {
    isSelecting.value = false
    isSelectingNormalTilesInA.value = false
  }

  const selectionStyle = computed(() => {
    if (!store.selection) return null
    if (store.selection.pattern) return null // Hide selection in tileset selector if we have a pattern (paste mode)
    const sel = store.selection
    const isA = ['A1', 'A2', 'A3', 'A4', 'A5'].includes(sel.tilesetId)

    if (store.activeTab === 'A' && !isA) return null
    if (store.activeTab !== 'A' && isA) return null
    if (!isA && store.activeTab !== sel.tilesetId) return null

    if (store.activeTab === 'A') {
      const map = iconMapping.value.find(
        (m) => m.ox === sel.x && m.oy === sel.y && m.tilesetId === sel.tilesetId
      )
      return map
        ? {
            left: map.uiX * GRID_SIZE + 'px',
            top: map.uiY * GRID_SIZE + 'px',
            width: sel.w * GRID_SIZE + 'px',
            height: sel.h * GRID_SIZE + 'px'
          }
        : null
    } else {
      return {
        left: sel.x * GRID_SIZE + 'px',
        top: sel.y * GRID_SIZE + 'px',
        width: sel.w * GRID_SIZE + 'px',
        height: sel.h * GRID_SIZE + 'px'
      }
    }
  })

  return { handleMouseDown, handleMouseMove, handleMouseUp, selectionStyle }
}
