<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ZEngineSignal } from '@engine/types'

const isVisible = ref(false)
const messageText = ref('')

const onShowMessage = (data: { text: string }): void => {
  messageText.value = data.text
  isVisible.value = true
}

const closeMessage = (): void => {
  if (!isVisible.value) return
  isVisible.value = false
  messageText.value = ''

  // Notify engine that message is finished
  if (window.$zEngine?.eventSystem) {
    window.$zEngine.eventSystem.finishMessage()
  }
}

const onKeyDown = (e: KeyboardEvent): void => {
  if (isVisible.value && (e.key === 'Enter' || e.key === ' ' || e.key === 'z')) {
    closeMessage()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  if (window.$zEngine?.eventBus) {
    window.$zEngine.eventBus.on(ZEngineSignal.ShowMessage, onShowMessage)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (window.$zEngine?.eventBus) {
    window.$zEngine.eventBus.off(ZEngineSignal.ShowMessage, onShowMessage)
  }
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isVisible"
      class="absolute bottom-12 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 pointer-events-auto"
      @click="closeMessage"
    >
      <div
        class="bg-black/80 backdrop-blur-md border-2 border-white/20 rounded-xl p-6 text-white shadow-2xl overflow-hidden relative group cursor-pointer"
      >
        <!-- Decorative corners -->
        <div class="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white/40"></div>
        <div class="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-white/40"></div>
        <div class="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-white/40"></div>
        <div class="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white/40"></div>

        <p class="text-lg leading-relaxed font-medium">
          {{ messageText }}
        </p>

        <div
          class="absolute bottom-2 right-4 flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest font-bold"
        >
          <span>Click or Press</span>
          <span class="bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-white/60"
            >Enter</span
          >
        </div>

        <!-- Animated indicator -->
        <div
          class="absolute bottom-2 right-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-8 border-t-white/60 animate-bounce"
        ></div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
