<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  IconSearch,
  IconPlus,
  IconFileCode,
  IconDeviceFloppy,
  IconTrash,
  IconCode,
  IconMenu2,
  IconCheck,
  IconBrandJavascript
} from '@tabler/icons-vue'

// --- DANE I TYPY ---
interface ScriptFile {
  id: string
  name: string
  content: string
  isUnsaved: boolean
}

const files = ref<ScriptFile[]>([
  {
    id: 'core',
    name: 'Game_Core.js',
    isUnsaved: false,
    content: `/*:
 * @target MZ
 * @plugindesc Core Engine Mechanics
 * @author DevTeam
 */

(() => {
    // --- Initialization ---
    console.log("System booting...");
    
    const _init = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _init.call(this);
        this._version = "2.0.0";
        const maxLevel = 99;
        
        if (this._version) {
            return true;
        }
    };
})();`
  },
  {
    id: 'combat',
    name: 'Battle_System.js',
    isUnsaved: true,
    content: `class BattleManager_Z extends BattleManager {
    setup(troopId, canEscape, canLose) {
        super.setup(troopId, canEscape, canLose);
        this._atbGauge = 0;
    }

    update() {
        if (!this.isBusy()) {
            this.updateATB();
        }
    }
}`
  }
])

// --- STATE ---
const activeFileId = ref<string>('core')
const searchQuery = ref('')

// Refy do synchronizacji scrolla
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const highlightRef = ref<HTMLElement | null>(null)
const lineNumbersRef = ref<HTMLDivElement | null>(null)

// --- COMPUTED ---
const activeFile = computed(() => files.value.find((f) => f.id === activeFileId.value))

const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value
  return files.value.filter((f) => f.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

const lineCount = computed(() => {
  if (!activeFile.value) return 1
  return activeFile.value.content.split('\n').length
})

const cursorLine = ref(1)
const cursorCol = ref(1)

// --- SYNTAX HIGHLIGHTER (Naprawiony - One Pass) ---
const highlightedCode = computed(() => {
  if (!activeFile.value) return ''
  let code = activeFile.value.content

  // 1. Escape HTML (bezpieczeństwo + poprawne wyświetlanie < >)
  // Robimy to PRZED kolorowaniem, żeby tekst wewnątrz tagów HTML też był bezpieczny
  code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 2. DEFINICJA JEDNEGO GIGANTYCZNEGO REGEXA
  // Kolejność grup (...) jest kluczowa dla argumentów w funkcji replace
  const tokenRegex = new RegExp(
    [
      // GRUPA 1: Komentarze ( //... lub /*...*/ )
      /((?:\/\/.*)|(?:\/\*[\s\S]*?\*\/))/.source,

      // GRUPA 2: Stringi ( '...', "...", `...` )
      /((?:'[^\r\n]*?')|(?:"[^\r\n]*?")|(?:`[\s\S]*?`))/.source,

      // GRUPA 3: Słowa kluczowe (dodaję więcej dla pełniejszego JS)
      /(\b(?:const|let|var|function|class|return|if|else|for|while|do|switch|case|break|continue|default|import|export|from|new|this|super|extends|try|catch|finally|async|await|throw|void|typeof|instanceof)\b)/
        .source,

      // GRUPA 4: Obiekty wbudowane i typy
      /(\b(?:console|window|document|Math|Array|Object|String|Boolean|JSON|Promise|Date|Map|Set|Symbol)\b)/
        .source,

      // GRUPA 5: Funkcje (słowo przed nawiasem)
      /(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\())/.source,

      // GRUPA 6: Liczby
      /(\b\d+(?:\.\d+)?(?:x[0-9a-fA-F]+)?\b)/.source
    ].join('|'),
    'g'
  )

  // 3. JEDNOPRZEBIEGOWA ZAMIANA
  return code.replace(tokenRegex, (match, comment, string, keyword, builtin, func, number) => {
    if (comment) return `<span class="token-comment">${match}</span>`
    if (string) return `<span class="token-string">${match}</span>`
    if (keyword) return `<span class="token-keyword">${match}</span>`
    if (builtin) return `<span class="token-builtin">${match}</span>`
    if (func) return `<span class="token-function">${match}</span>`
    if (number) return `<span class="token-number">${match}</span>`

    return match // Fallback (nie powinno wystąpić dla dopasowań, ale dla bezpieczeństwa)
  })
})

// --- ACTIONS ---
const selectFile = (id: string): void => {
  activeFileId.value = id
  nextTick(() => {
    resetScroll()
  })
}

const createNewFile = (): void => {
  const name = prompt('Filename:', 'Untitled.js')
  if (name) {
    const id = Date.now().toString()
    files.value.push({
      id,
      name: name.endsWith('.js') ? name : `${name}.js`,
      content: '// Start coding...\n',
      isUnsaved: true
    })
    selectFile(id)
  }
}

const deleteFile = (id: string): void => {
  if (confirm('Delete this file?')) {
    const idx = files.value.findIndex((f) => f.id === id)
    files.value.splice(idx, 1)
    if (activeFileId.value === id) activeFileId.value = ''
  }
}

// --- EDITOR LOGIC ---
const handleTab = (e: KeyboardEvent): void => {
  const el = e.target as HTMLTextAreaElement
  const start = el.selectionStart
  const end = el.selectionEnd
  el.setRangeText('  ', start, end, 'end')
  activeFile.value!.content = el.value
  activeFile.value!.isUnsaved = true
}

// Synchronizacja Scrolla (Kluczowa dla techniki Overlay)
const handleScroll = (): void => {
  if (textareaRef.value) {
    const scrollTop = textareaRef.value.scrollTop
    const scrollLeft = textareaRef.value.scrollLeft

    if (highlightRef.value) {
      highlightRef.value.scrollTop = scrollTop
      highlightRef.value.scrollLeft = scrollLeft
    }
    if (lineNumbersRef.value) {
      lineNumbersRef.value.scrollTop = scrollTop
    }
  }
}

const resetScroll = (): void => {
  if (textareaRef.value) textareaRef.value.scrollTop = 0
  handleScroll()
}

const updateCursor = (e: Event): void => {
  const el = e.target as HTMLTextAreaElement
  if (!el) return
  const val = el.value.substring(0, el.selectionStart)
  const lines = val.split('\n')
  cursorLine.value = lines.length
  cursorCol.value = lines[lines.length - 1].length + 1
}

// Skrót Ctrl+S
const handleKeydown = (e: KeyboardEvent): void => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (activeFile.value) activeFile.value.isUnsaved = false
  }
}
</script>

<template>
  <div
    class="flex h-full w-full bg-[#f8f9fc] text-slate-800 font-sans overflow-hidden"
    @keydown="handleKeydown"
  >
    <aside
      class="w-72 bg-white border-r border-slate-100 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
    >
      <div class="p-6 pb-2">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-2 text-slate-800">
            <div class="bg-indigo-600 text-white p-1.5 rounded-lg">
              <IconCode :size="18" stroke-width="2.5" />
            </div>
            <span class="font-bold tracking-tight text-lg">CodeManager</span>
          </div>
          <button
            class="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            @click="createNewFile"
          >
            <IconPlus :size="18" />
          </button>
        </div>

        <div class="relative group">
          <IconSearch
            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            :size="16"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search scripts..."
            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50 rounded-xl text-sm font-medium transition-all outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          class="group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent"
          :class="
            activeFileId === file.id
              ? 'bg-white shadow-sm border-slate-100 ring-1 ring-black/5'
              : 'hover:bg-slate-50 text-slate-500 hover:text-slate-700'
          "
          @click="selectFile(file.id)"
        >
          <div
            class="p-2 rounded-lg transition-colors"
            :class="
              activeFileId === file.id
                ? 'bg-indigo-50 text-indigo-600'
                : 'bg-slate-100 text-slate-400'
            "
          >
            <IconBrandJavascript :size="18" stroke-width="2" />
          </div>
          <div class="flex-1 min-w-0">
            <h4
              class="text-sm font-bold truncate leading-tight"
              :class="activeFileId === file.id ? 'text-slate-800' : ''"
            >
              {{ file.name }}
            </h4>
          </div>
          <div
            v-if="file.isUnsaved"
            class="w-2 h-2 rounded-full bg-amber-400 shadow-sm shrink-0"
          ></div>
          <button
            class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all absolute right-2 bg-white shadow-sm rounded-lg"
            @click.stop="deleteFile(file.id)"
          >
            <IconTrash :size="14" />
          </button>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 relative">
      <header class="h-16 px-8 flex items-center justify-between shrink-0">
        <div v-if="activeFile" class="flex items-center gap-4">
          <h2 class="text-lg font-bold text-slate-800">{{ activeFile.name }}</h2>
          <span
            class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wide"
            >JS</span
          >
          <span
            v-if="activeFile.isUnsaved"
            class="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full"
            ><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Unsaved</span
          >
        </div>
        <div v-else class="text-slate-400 font-medium">No file selected</div>
        <button
          :disabled="!activeFile"
          class="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black hover:shadow-lg hover:shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50"
          @click="activeFile && (activeFile.isUnsaved = false)"
        >
          <IconDeviceFloppy :size="16" /> <span>Save</span>
        </button>
      </header>

      <div class="flex-1 px-8 pb-8 min-h-0 flex flex-col">
        <div
          v-if="activeFile"
          class="flex-1 bg-[#1a1b26] rounded-2xl shadow-2xl shadow-indigo-900/10 overflow-hidden flex flex-col border border-slate-900/5 relative ring-4 ring-white"
        >
          <div
            class="h-10 bg-[#16161e] border-b border-[#1a1b26] flex items-center justify-between px-4 select-none shrink-0 z-10"
          >
            <div class="flex items-center gap-2 opacity-50 text-white text-xs font-mono">
              <IconFileCode :size="14" /> <span>src/scripts/{{ activeFile.name }}</span>
            </div>
            <div class="flex gap-1.5">
              <div class="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
              <div class="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
            </div>
          </div>

          <div class="flex-1 relative overflow-hidden group">
            <div
              ref="lineNumbersRef"
              class="absolute left-0 top-0 bottom-0 w-12 bg-[#1a1b26] text-[#565f89] text-right pr-4 pt-6 text-[13px] font-mono leading-[1.6] select-none z-20 overflow-hidden"
            >
              <div v-for="n in lineCount" :key="n">{{ n }}</div>
            </div>

            <pre
              ref="highlightRef"
              class="absolute inset-0 pl-12 pt-6 pr-6 pb-6 m-0 pointer-events-none text-[13px] font-mono leading-[1.6] whitespace-pre overflow-hidden text-[#a9b1d6]"
              v-html="highlightedCode"
            ></pre>

            <textarea
              ref="textareaRef"
              v-model="activeFile.content"
              spellcheck="false"
              class="absolute inset-0 pl-12 pt-6 pr-6 pb-6 w-full h-full bg-transparent text-transparent caret-white text-[13px] font-mono leading-[1.6] outline-none resize-none border-none whitespace-pre overflow-auto vs-scrollbar z-10"
              @keydown.tab.prevent="handleTab"
              @scroll="handleScroll"
              @keyup="updateCursor"
              @click="updateCursor"
              @input="activeFile.isUnsaved = true"
            ></textarea>
          </div>

          <div
            class="h-8 bg-[#16161e] border-t border-[#1a1b26] flex items-center justify-between px-4 text-[10px] text-[#565f89] select-none font-medium uppercase tracking-wider shrink-0 z-10"
          >
            <div class="flex items-center gap-4">
              <span class="flex items-center gap-1.5"
                ><IconMenu2 :size="10" /> Ln {{ cursorLine }}, Col {{ cursorCol }}</span
              >
            </div>
            <div class="flex items-center gap-4">
              <span class="text-emerald-400 flex items-center gap-1"
                ><IconCheck :size="10" /> Syntax ON</span
              >
              <span>UTF-8</span>
            </div>
          </div>
        </div>

        <div
          v-else
          class="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200"
        >
          <IconCode :size="32" class="opacity-50 mb-4" />
          <p class="font-bold text-slate-600">No file selected</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style>
/* STYLE GLOBALNE DLA TOKENÓW (Tokyo Night Theme) */
.token-keyword {
  color: #bb9af7;
  font-weight: bold;
} /* Fiolet */
.token-function {
  color: #7aa2f7;
} /* Niebieski */
.token-string {
  color: #9ece6a;
} /* Zielony */
.token-number {
  color: #ff9e64;
} /* Pomarańcz */
.token-comment {
  color: #565f89;
  font-style: italic;
} /* Szary */
.token-builtin {
  color: #2ac3de;
} /* Cyan */
</style>

<style scoped>
/* Fonty */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
.font-sans {
  font-family: 'Inter', sans-serif;
}
.font-mono,
textarea,
pre {
  font-family: 'JetBrains Mono', monospace;
  font-variant-ligatures: none;
}

/* Scrollbary */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.vs-scrollbar::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
.vs-scrollbar::-webkit-scrollbar-track {
  background: #1a1b26;
}
.vs-scrollbar::-webkit-scrollbar-thumb {
  background: #2f334d;
  border: 4px solid #1a1b26;
  border-radius: 8px;
}
.vs-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #414868;
}
.vs-scrollbar::-webkit-scrollbar-corner {
  background: #1a1b26;
}

/* WAŻNE: Wyrównanie Overlay */
textarea,
pre {
  tab-size: 2;
  /* Musi być identyczne dla obu warstw! */
  letter-spacing: normal;
  word-spacing: normal;
}
textarea::selection {
  background: rgba(118, 148, 208, 0.3);
}
</style>
