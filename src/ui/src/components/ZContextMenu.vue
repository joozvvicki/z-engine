<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

const props = defineProps<{
  show: boolean
  x: number
  y: number
}>()

const emit = defineEmits(['close'])

const menuRef = ref<HTMLElement | null>(null)
const adjustedX = ref(0)
const adjustedY = ref(0)

const updatePosition = async (): Promise<void> => {
  await nextTick()
  if (!menuRef.value) return

  const menuRect = menuRef.value.getBoundingClientRect()
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  let nx = props.x
  let ny = props.y

  // Prevent horizontal overflow
  if (nx + menuRect.width > windowWidth) {
    nx = windowWidth - menuRect.width - 5
  }

  // Prevent vertical overflow
  if (ny + menuRect.height > windowHeight) {
    ny = windowHeight - menuRect.height - 5
  }

  // Ensure it's not off-screen on the left/top
  nx = Math.max(5, nx)
  ny = Math.max(5, ny)

  adjustedX.value = nx
  adjustedY.value = ny
}

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      updatePosition()
    }
  }
)

watch([() => props.x, () => props.y], () => {
  if (props.show) {
    updatePosition()
  }
})

onMounted(() => {
  if (props.show) {
    updatePosition()
  }
})

const handleGlobalClick = (e: MouseEvent): void => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('mousedown', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', handleGlobalClick)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="menuRef"
      class="fixed bg-white border border-black/10 rounded-md shadow-xl z-999 flex flex-col overflow-hidden min-w-[140px] py-1"
      :style="{
        top: adjustedY + 'px',
        left: adjustedX + 'px'
      }"
    >
      <slot></slot>
    </div>
  </Teleport>
</template>
