<script setup lang="ts">
import { type ProjectFileNode } from '../services/ProjectService'
import {
  IconFolder,
  IconFolderOpen,
  IconBrandJavascript,
  IconBrandTypescript,
  IconTrash,
  IconChevronRight,
  IconChevronDown,
  IconFileText
} from '@tabler/icons-vue'

const props = defineProps<{
  node: ProjectFileNode
  depth: number
  activeId: string
  expandedFolders: Set<string>
}>()

const emit = defineEmits<{
  (e: 'select', node: ProjectFileNode): void
  (e: 'toggle', path: string): void
  (e: 'delete', node: ProjectFileNode): void
}>()

const isExpanded = (path: string): boolean => props.expandedFolders.has(path)

const getFileIcon = (name: string): any => {
  if (name.endsWith('.js')) return IconBrandJavascript
  if (name.endsWith('.ts')) return IconBrandTypescript
  return IconFileText
}

const getFileColor = (name: string): string => {
  if (name.endsWith('.js')) return 'text-yellow-500'
  if (name.endsWith('.ts')) return 'text-blue-500'
  return 'text-slate-400'
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Row -->
    <div
      class="group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all"
      :class="[
        activeId === node.path
          ? 'bg-indigo-50 text-indigo-700'
          : 'hover:bg-slate-50 text-slate-600',
        node.isDirectory ? 'font-semibold' : 'font-medium'
      ]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="node.isDirectory ? emit('toggle', node.path) : emit('select', node)"
    >
      <!-- Chevron for Folders -->
      <div v-if="node.isDirectory" class="w-4 flex items-center justify-center opacity-40">
        <IconChevronDown v-if="isExpanded(node.path)" :size="14" />
        <IconChevronRight v-else :size="14" />
      </div>
      <div v-else class="w-4"></div>

      <!-- Icon -->
      <component
        :is="
          node.isDirectory
            ? isExpanded(node.path)
              ? IconFolderOpen
              : IconFolder
            : getFileIcon(node.name)
        "
        :size="16"
        :class="node.isDirectory ? 'text-indigo-400' : getFileColor(node.name)"
      />

      <!-- Name -->
      <span class="flex-1 truncate text-xs">{{ node.name }}</span>

      <!-- Actions (Plugin only) -->
      <button
        v-if="!node.isDirectory && node.path.startsWith('js/plugins')"
        class="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
        @click.stop="emit('delete', node)"
      >
        <IconTrash :size="12" />
      </button>
    </div>

    <!-- Children -->
    <template v-if="node.isDirectory && isExpanded(node.path)">
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :active-id="activeId"
        :expanded-folders="expandedFolders"
        @select="(n) => emit('select', n)"
        @toggle="(p) => emit('toggle', p)"
        @delete="(n) => emit('delete', n)"
      />
    </template>
  </div>
</template>
