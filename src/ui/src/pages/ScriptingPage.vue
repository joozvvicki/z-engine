<script setup lang="ts">
import * as prettier from 'prettier/standalone'
import * as parserBabel from 'prettier/plugins/babel'
import * as parserEstree from 'prettier/plugins/estree'

import { ref, computed, shallowRef } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { GAME_DEFS as Z_ENGINE_TYPES } from '@ui/assets/index'
import {
  IconSearch,
  IconPlus,
  IconFileCode,
  IconDeviceFloppy,
  IconTrash,
  IconCode,
  IconBrandJavascript
} from '@tabler/icons-vue'

// --- TYPY ---
interface ScriptFile {
  id: string
  name: string
  content: string
  isUnsaved: boolean
}

// --- DANE ---
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
    console.log("System booting...");

    const _init = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _init.call(this);
        this._version = "2.0.0";
        // Monaco Editor wykryje tu błędy składniowe!
        const maxLevel = 99;
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
}`
  }
])

// --- STATE ---
const activeFileId = ref<string>('core')
const searchQuery = ref('')
const editorRef = shallowRef() // Referencja do instancji edytora

// --- COMPUTED ---
const activeFile = computed(() => files.value.find((f) => f.id === activeFileId.value))

const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value
  return files.value.filter((f) => f.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

// --- ACTIONS ---
const selectFile = (id: string): void => {
  activeFileId.value = id
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

const saveFile = () => {
  if (activeFile.value) {
    activeFile.value.isUnsaved = false
    // Tutaj logika zapisu na backend/dysk
    console.log('Saved:', activeFile.value.name)
  }
}

// --- MONACO CONFIGURATION ---
const MONACO_OPTIONS = {
  // Layout & Fonty
  automaticLayout: true,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace", // Upewnij się, że masz ten font
  fontSize: 14, // Nieco większy tekst dla czytelności
  lineHeight: 24, // Większy odstęp między liniami (oddychający kod)
  fontLigatures: true, // <--- TO ROBI ROBOTĘ (np. strzałki =>)

  // Zachowanie
  formatOnType: true,
  formatOnPaste: true,
  tabSize: 2,

  // Wygląd UI
  minimap: {
    enabled: true,
    scale: 0.65,
    renderCharacters: false // Bardziej abstrakcyjna, czystsza minimapa
  },
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,

  // Profesjonalne dodatki
  bracketPairColorization: { enabled: true }, // Kolorowe nawiasy zagnieżdżone
  guides: {
    indentation: true,
    bracketPairs: true // Linie łączące pary nawiasów
  },
  renderLineHighlight: 'all', // Podświetla całą linię, a nie tylko pod tekstem
  scrollBeyondLastLine: false,
  padding: { top: 20, bottom: 20 },

  // Ukrywanie zbędnych elementów dla czystszego looku
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  matchBrackets: 'always'
}

const handleMount = (editor: any, monaco: any) => {
  editorRef.value = editor

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true, // Włącza sprawdzanie błędów w JS na podstawie typów
    noLib: false
  })

  console.log('--- Monaco Mount ---')
  console.log('Z_ENGINE_TYPES length:', Z_ENGINE_TYPES?.length)
  console.log('Z_ENGINE_TYPES snippet:', Z_ENGINE_TYPES?.substring(0, 200))

  const libUri = 'file:///z-engine.d.ts'
  const testUri = 'file:///test-global.d.ts'

  // Eager sync helps worker pick up defaults faster
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true)
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)

  // Use setExtraLibs to ensure a clean slate and avoid duplicates on remount
  const libs = [
    {
      content: Z_ENGINE_TYPES,
      filePath: libUri
    },
    {
      content: 'declare const MONACO_WORKS: string;',
      filePath: testUri
    }
  ]

  // Manual provider test - if this shows up, the UI is fine
  if (!(window as any).monaco_completion_set) {
    ;(window as any).monaco_completion_set = true
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }
        return {
          suggestions: [
            {
              label: 'MONACO_MANUAL_TEST',
              kind: monaco.languages.CompletionItemKind.Variable,
              documentation: 'This is a manual test suggestion',
              insertText: 'MONACO_MANUAL_TEST',
              range: range
            }
          ]
        }
      }
    })
  }

  monaco.languages.typescript.javascriptDefaults.setExtraLibs(libs)
  monaco.languages.typescript.typescriptDefaults.setExtraLibs(libs)

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  })

  console.log(
    'Extra libs set. Current libs:',
    monaco.languages.typescript.javascriptDefaults.getExtraLibs()
  )
  console.log(
    'Models:',
    monaco.editor.getModels().map((m) => m.uri.toString())
  )

  monaco.languages.registerDocumentFormattingEditProvider('javascript', {
    async provideDocumentFormattingEdits(model: any) {
      const text = model.getValue()

      try {
        // Wywołanie Prettiera
        const formatted = await prettier.format(text, {
          parser: 'babel',
          plugins: [parserBabel, parserEstree],

          // --- KONFIGURACJA PRETTIERA ---
          singleQuote: true, // Pojedyncze cudzysłowy
          semi: true, // Średniki na końcu
          tabWidth: 2, // Wcięcia 2 spacje
          trailingComma: 'none', // Brak przecinków na końcu list
          printWidth: 80, // Łamanie linii po 80 znakach
          arrowParens: 'always' // (x) => ... zamiast x => ...
        })

        // Zwracamy edycję dla Monaco (podmieniamy cały tekst)
        return [
          {
            range: model.getFullModelRange(),
            text: formatted
          }
        ]
      } catch (error) {
        console.error('Prettier formatting failed:', error)
        return [] // W razie błędu nie rób nic
      }
    }
  })

  // Definicja motywu "Tokyo Night Storm Pro"
  monaco.editor.defineTheme('tokyo-night-pro', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Podstawy
      { token: 'comment', foreground: '565f89', fontStyle: 'italic' },
      { token: 'delimiter', foreground: '89ddff' }, // Nawiasy, kropki
      { token: 'delimiter.bracket', foreground: 'a9b1d6' },

      // Słowa kluczowe i operatory
      { token: 'keyword', foreground: 'bb9af7', fontStyle: 'bold' },
      { token: 'operator', foreground: '89ddff' },
      { token: 'storage', foreground: 'bb9af7' },

      // Typy i Klasy
      { token: 'type', foreground: '2ac3de' },
      { token: 'class', foreground: 'c0caf5', fontStyle: 'bold' },
      { token: 'constructor', foreground: 'c0caf5' },

      // Zmienne i Funkcje
      { token: 'identifier', foreground: 'c0caf5' },
      { token: 'function', foreground: '7aa2f7', fontStyle: 'bold' },
      { token: 'variable.predefined', foreground: 'ff757f' }, // np. this, super

      // Wartości
      { token: 'string', foreground: '9ece6a' },
      { token: 'number', foreground: 'ff9e64' },
      { token: 'regexp', foreground: 'b4f9f8' },
      { token: 'constant', foreground: 'ff9e64' }
    ],
    colors: {
      // Tło i ogólne
      'editor.background': '#1a1b26', // Głęboki granat
      'editor.foreground': '#a9b1d6',

      // UI Edytora
      'editorCursor.foreground': '#c0caf5',
      'editorLineNumber.foreground': '#565f89',
      'editorLineNumber.activeForeground': '#ff9e64', // Aktywna linia na pomarańczowo

      // Selekcja i podświetlenia
      'editor.selectionBackground': '#515c7e40',
      'editor.inactiveSelectionBackground': '#515c7e20',
      'editor.lineHighlightBackground': '#292e42', // Subtelne podświetlenie obecnej linii

      // Scrollbary
      'scrollbarSlider.background': '#565f8940',
      'scrollbarSlider.hoverBackground': '#565f8980',
      'scrollbarSlider.activeBackground': '#565f89cc',

      // Widgety i dymki
      // Używamy trochę ciemniejszego koloru niż tło edytora, żeby się "odbił"
      'editorHoverWidget.background': '#16161e',
      'editorHoverWidget.border': '#292e42', // Subtelna, ciemna ramka

      // Tło paska statusu dymku (tam gdzie jest "View Problem")
      'editorHoverWidget.statusBarBackground': '#1a1b26',

      // Kolory linków w dymkach (np. "View Problem")
      'textLink.foreground': '#7aa2f7', // Jasnoniebieski
      'textLink.activeForeground': '#bb9af7', // Fioletowy po najechaniu

      // Kolory błędów i ostrzeżeń w dymku
      errorForeground: '#f7768e', // Czerwony/Różowy
      warningForeground: '#e0af68', // Pomarańczowy

      // Ogólne tło dla innych widgetów (np. "Find & Replace")
      'editorWidget.background': '#16161e',
      'editorWidget.border': '#292e42',
      'editorWidget.resizeBorder': '#7aa2f7'
    }
  })

  monaco.editor.setTheme('tokyo-night-pro')

  // Skrót zapisu
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    saveFile()
  })
}

const handleChange = (val: string) => {
  if (activeFile.value) {
    activeFile.value.content = val
    activeFile.value.isUnsaved = true
  }
}
</script>

<template>
  <div class="flex h-full w-full bg-[#f8f9fc] text-slate-800 font-sans overflow-hidden">
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
          @click="saveFile"
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

          <div class="flex-1 relative overflow-hidden">
            <VueMonacoEditor
              :key="activeFile.id"
              :path="activeFile.name"
              :value="activeFile.content"
              language="javascript"
              theme="tokyo-night-pro"
              :options="MONACO_OPTIONS"
              class="h-full w-full"
              @mount="handleMount"
              @change="handleChange"
            />
          </div>

          <div
            class="h-8 bg-[#16161e] border-t border-[#1a1b26] flex items-center justify-between px-4 text-[10px] text-[#565f89] select-none font-medium uppercase tracking-wider shrink-0 z-10"
          >
            <div class="flex items-center gap-4">
              <span>Monaco Editor Ready</span>
            </div>
            <div class="flex items-center gap-4">
              <span>JavaScript</span>
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

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
.font-sans {
  font-family: 'Inter', sans-serif;
}
.font-mono {
  font-family: 'JetBrains Mono', monospace;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

.monaco-hover {
  /* Zaokrąglone rogi - klucz do nowoczesnego wyglądu */
  border-radius: 12px !important;

  /* Nowoczesny, głęboki cień (pasujący do Tokyo Night) */
  box-shadow:
    0 8px 24px -6px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(65, 72, 104, 0.3) !important;

  /* Usunięcie domyślnej, ostrej ramki Monaco (zastępujemy ją cieniem wyżej) */
  border: none !important;

  /* Trochę więcej "oddechu" wewnątrz */
  padding: 4px !important;

  /* Płynne pojawianie się */
  transition:
    opacity 0.1s ease-in-out,
    transform 0.1s ease-in-out;
  backdrop-filter: blur(8px); /* Opcjonalne: efekt rozmycia tła pod dymkiem */
}

/* 2. Wewnętrzna zawartość dymku */
.monaco-editor-hover .monaco-editor-hover-content {
  /* Ładniejsze odstępy dla tekstu błędu */
  padding: 8px 12px !important;
  border-radius: 8px !important;
}

/* 3. Pasek statusu na dole ("View Problem...") */
.monaco-editor-hover .hover-status-bar {
  border-top: 1px solid rgba(65, 72, 104, 0.3) !important;
  padding: 6px 12px !important;
  border-bottom-left-radius: 12px !important;
  border-bottom-right-radius: 12px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 4. Linki w dymku */
.monaco-hover a {
  text-decoration: none !important;
}
.monaco-hover a:hover {
  text-decoration: underline !important;
}

/* 5. (Opcjonalnie) Stylizacja menu autouzupełniania (Suggest Widget) */
/* Żeby pasowało stylem do dymków błędów */
.monaco-editor .suggest-widget {
  border-radius: 12px !important;
  box-shadow:
    0 8px 24px -6px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(65, 72, 104, 0.3) !important;
  border: none !important;
}
.monaco-editor .suggest-widget .monaco-list-row.focused {
  border-radius: 6px !important;
}
.monaco-hover {
  /* Zaokrąglone rogi - klucz do nowoczesnego wyglądu */
  border-radius: 12px !important;

  /* Nowoczesny, głęboki cień (pasujący do Tokyo Night) */
  box-shadow:
    0 8px 24px -6px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(65, 72, 104, 0.3) !important;

  /* Usunięcie domyślnej, ostrej ramki Monaco (zastępujemy ją cieniem wyżej) */
  border: none !important;

  /* Trochę więcej "oddechu" wewnątrz */
  padding: 4px !important;

  /* Płynne pojawianie się */
  transition:
    opacity 0.1s ease-in-out,
    transform 0.1s ease-in-out;
  backdrop-filter: blur(8px); /* Opcjonalne: efekt rozmycia tła pod dymkiem */
}

/* 2. Wewnętrzna zawartość dymku */
.monaco-editor-hover .monaco-editor-hover-content {
  /* Ładniejsze odstępy dla tekstu błędu */
  padding: 8px 12px !important;
  border-radius: 8px !important;
}

/* 3. Pasek statusu na dole ("View Problem...") */
.monaco-editor-hover .hover-status-bar {
  border-top: 1px solid rgba(65, 72, 104, 0.3) !important;
  padding: 6px 12px !important;
  border-bottom-left-radius: 12px !important;
  border-bottom-right-radius: 12px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 4. Linki w dymku */
.monaco-hover a {
  text-decoration: none !important;
}
.monaco-hover a:hover {
  text-decoration: underline !important;
}

/* 5. (Opcjonalnie) Stylizacja menu autouzupełniania (Suggest Widget) */
/* Żeby pasowało stylem do dymków błędów */
.monaco-editor .suggest-widget {
  border-radius: 12px !important;
  box-shadow:
    0 8px 24px -6px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(65, 72, 104, 0.3) !important;
  border: none !important;
}
.monaco-editor .suggest-widget .monaco-list-row.focused {
  border-radius: 6px !important;
}
</style>
