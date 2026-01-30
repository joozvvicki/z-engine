<script setup lang="ts">
import {
  IconBackground,
  IconBox,
  IconHelp,
  IconHome,
  IconCactus,
  IconWall,
  IconStar
} from '@tabler/icons-vue'

const iconsMap = {
  ground: IconBackground,
  wall: IconWall,
  decoration: IconCactus,
  event: IconBox,
  highest: IconStar,
  home: IconHome,
  help: IconHelp
}

interface Props {
  icon: string
  size?: number
  stroke?: number
  color?: string
  tooltip?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  stroke: 2,
  color: 'currentColor'
})
</script>

<template>
  <div class="group relative w-full h-full">
    <component :is="iconsMap[props.icon]" :size="size" :stroke-width="stroke" :color="color" />

    <div
      v-if="tooltip"
      class="absolute -top-0.5 z-1000 left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-white/5"
    >
      {{ tooltip }}
      <div
        class="absolute z-1001 top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black rotate-45 border-l border-b border-white/5"
      ></div>
    </div>
  </div>
</template>
