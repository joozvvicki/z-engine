<script setup lang="ts"></script>

<template>
  <div class="flex w-full h-full bg-gray-50/50 font-sans overflow-hidden p-6">
    <!-- Main Content (Sidebar removed, now integrated into global Navigation) -->
    <div
      class="flex-1 overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] flex flex-col"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
