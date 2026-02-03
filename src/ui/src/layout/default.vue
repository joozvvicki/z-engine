<script setup lang="ts">
import Navigation from '@ui/components/Navigation.vue'
</script>

<template>
  <div class="flex h-screen overflow-hidden w-screen">
    <Navigation />
    <main class="flex-1 h-full overflow-hidden relative">
      <slot />
    </main>
  </div>
</template>
