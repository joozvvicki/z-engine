import { ref, type Ref } from 'vue'

export interface ViewportState {
  scale: Ref<number>
  pan: Ref<{ x: number; y: number }>
  isPanning: Ref<boolean>
}

export const useViewport = (): {
  scale: Ref<number>
  pan: Ref<{ x: number; y: number }>
  isPanning: Ref<boolean>
  handleWheel: (event: WheelEvent, container: HTMLElement | null) => void
  startPan: (x: number, y: number) => void
  updatePan: (x: number, y: number, container: HTMLElement | null) => void
  endPan: () => void
  resetViewport: (container: HTMLElement | null) => void
  updateTransform: (container: HTMLElement | null) => void
} => {
  const scale = ref(1)
  const pan = ref({ x: 0, y: 0 })
  const isPanning = ref(false)
  const lastPanPos = ref<{ x: number; y: number } | null>(null)

  const updateTransform = (container: HTMLElement | null): void => {
    if (container) {
      container.style.transformOrigin = '0 0'
      container.style.transform = `translate(${pan.value.x}px, ${pan.value.y}px) scale(${scale.value})`
    }
  }

  const handleWheel = (event: WheelEvent, container: HTMLElement | null): void => {
    if (!container) return

    if (event.ctrlKey) {
      const zoomSensitivity = 0.005
      const delta = -event.deltaY * zoomSensitivity
      const prevScale = scale.value
      const newScale = Math.min(Math.max(0.2, prevScale + delta), 4)

      const rect = container.getBoundingClientRect()
      const mouseX = (event.clientX - rect.left) / prevScale
      const mouseY = (event.clientY - rect.top) / prevScale

      scale.value = newScale
      pan.value.x -= mouseX * (newScale - prevScale)
      pan.value.y -= mouseY * (newScale - prevScale)
    } else {
      pan.value.x -= event.deltaX
      pan.value.y -= event.deltaY
    }

    updateTransform(container)
  }

  const startPan = (x: number, y: number): void => {
    isPanning.value = true
    lastPanPos.value = { x, y }
  }

  const updatePan = (x: number, y: number, container: HTMLElement | null): void => {
    if (isPanning.value && lastPanPos.value) {
      pan.value.x += x - lastPanPos.value.x
      pan.value.y += y - lastPanPos.value.y
      updateTransform(container)
      lastPanPos.value = { x, y }
    }
  }

  const endPan = (): void => {
    isPanning.value = false
    lastPanPos.value = null
  }

  const resetViewport = (container: HTMLElement | null): void => {
    scale.value = 1
    pan.value = { x: 0, y: 0 }
    updateTransform(container)
  }

  return {
    scale,
    pan,
    isPanning,
    handleWheel,
    startPan,
    updatePan,
    endPan,
    resetViewport,
    updateTransform
  }
}
