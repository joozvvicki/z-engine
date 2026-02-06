<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-100 p-4"
        @click.self="close"
      >
        <div
          class="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] w-full max-w-md overflow-hidden border border-slate-200"
        >
          <div class="p-8 pb-0">
            <div class="flex items-center gap-3 mb-2">
              <div
                class="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100"
              >
                <IconBox class="w-5 h-5" />
              </div>
              <h2 class="text-3xl font-black text-slate-900 tracking-tight">Build Game</h2>
            </div>
            <p class="text-slate-500 text-sm">
              Przygotuj swoją paczkę instalacyjną w kilka sekund.
            </p>
          </div>

          <div v-if="!isBuilding" class="p-8 space-y-6">
            <div class="space-y-2">
              <label class="text-xs font-black uppercase tracking-widest text-slate-400 ml-1"
                >Game Identity</label
              >
              <input
                v-model="gameName"
                type="text"
                class="w-full bg-slate-50 border border-slate-200 text-slate-900 px-5 py-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold placeholder:text-slate-300"
                placeholder="Enter game name..."
              />
            </div>

            <div class="space-y-2">
              <label class="text-xs font-black uppercase tracking-widest text-slate-400 ml-1"
                >Target Platform</label
              >
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-for="p in ['win', 'mac', 'linux']"
                  :key="p"
                  :class="[
                    'py-3 rounded-2xl border-2 font-bold text-xs uppercase tracking-tight transition-all',
                    platform === p
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                  ]"
                  @click="platform = p"
                >
                  {{ p === 'win' ? 'Windows' : p }}
                </button>
              </div>
            </div>

            <div class="flex gap-3 pt-4">
              <button
                class="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer"
                @click="close"
              >
                Discard
              </button>
              <button
                class="flex-2 py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-30"
                :disabled="!gameName"
                @click="build"
              >
                Start Build
              </button>
            </div>
          </div>

          <div v-else class="p-12 text-center">
            <div v-if="!buildResult" class="py-6">
              <div class="relative w-20 h-20 mx-auto mb-8">
                <div class="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div
                  class="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"
                ></div>
              </div>
              <h3 class="text-2xl font-black text-slate-900 mb-2 tracking-tight">
                Kompilowanie...
              </h3>
              <p class="text-slate-400 text-sm">
                Twoja przygoda zaraz nabierze realnych kształtów.
              </p>
            </div>

            <div v-else class="py-4">
              <div
                :class="[
                  'w-20 h-20 rounded-2xl mx-auto mb-8 flex items-center justify-center text-3xl shadow-2xl',
                  buildResult.success
                    ? 'bg-emerald-50 text-emerald-500 shadow-emerald-100'
                    : 'bg-rose-50 text-rose-500 shadow-rose-100'
                ]"
              >
                <Check v-if="buildResult.success" />
                <X v-else />
              </div>

              <h3 class="text-2xl font-black text-slate-900 mb-2 tracking-tight">
                {{ buildResult.success ? 'Ready to Play!' : 'Build Failed' }}
              </h3>
              <p class="text-slate-500 text-sm mb-8 px-4 leading-relaxed">
                {{ buildResult.message }}
              </p>

              <button
                class="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black rounded-2xl transition-all"
                @click="close"
              >
                Back to Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ProjectService } from '../services/ProjectService'
import { IconBox } from '@tabler/icons-vue'

const isOpen = ref(false)
const isBuilding = ref(false)
const gameName = ref('My Game')
const platform = ref('win')
const buildResult = ref<{ success: boolean; message: string } | null>(null)

const open = (): void => {
  isOpen.value = true
  isBuilding.value = false
  buildResult.value = null
  if (ProjectService.currentPath) {
    const parts = ProjectService.currentPath.split('/') || ProjectService.currentPath.split('\\')
    gameName.value = parts[parts.length - 1]
  }
}

const close = (): void => {
  if (isBuilding.value && !buildResult.value) return
  isOpen.value = false
}

const build = async (): Promise<void> => {
  isBuilding.value = true
  buildResult.value = null

  try {
    const result = await ProjectService.buildGame(platform.value, gameName.value)
    buildResult.value = result
  } catch (e) {
    buildResult.value = { success: false, message: (e as Error).message || 'Kompilacja przerwana' }
  }
}

defineExpose({ open })
</script>
