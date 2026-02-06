<script setup lang="ts">
import * as prettier from 'prettier/standalone'
import * as parserBabel from 'prettier/plugins/babel'
import * as parserEstree from 'prettier/plugins/estree'

import { ref, shallowRef, onMounted } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { GAME_DEFS as Z_ENGINE_TYPES } from '@ui/assets/index'
import { ProjectService, type ProjectFileNode } from '../services/ProjectService'
import FileTreeNode from '../components/FileTreeNode.vue'
import { useEditorStore } from '@ui/stores/editor'
import {
  IconSearch,
  IconPlus,
  IconFileCode,
  IconDeviceFloppy,
  IconCode,
  IconRefresh,
  IconVariable
} from '@tabler/icons-vue'

// --- TYPY ---
interface ScriptFile {
  id: string
  name: string
  path: string // ścieżka relatywna od projectPath, np. 'js/plugins/MyPlugin.js'
  content: string
  isUnsaved: boolean
  isReadOnly: boolean
}

// --- DANE ---
const rootNode = ref<ProjectFileNode | null>(null)
const expandedFolders = ref<Set<string>>(new Set(['js', 'js/libs', 'js/plugins']))
const isLoadingFiles = ref(true)

// --- STATE ---
const activeFileId = ref<string>('')
const searchQuery = ref('')
const editorRef = shallowRef() // Referencja do instancji edytora

// --- COMPUTED ---
const activeFile = ref<ScriptFile | null>(null)

const toggleFolder = (path: string): void => {
  if (expandedFolders.value.has(path)) {
    expandedFolders.value.delete(path)
  } else {
    expandedFolders.value.add(path)
  }
}

// --- HELPERS ---
const refreshFileList = async (): Promise<void> => {
  ProjectService.ensureProjectPath()
  isLoadingFiles.value = true
  try {
    const tree = await ProjectService.getDirectoryTree('js')
    rootNode.value = tree
  } catch (e) {
    console.error('Failed to load project scripts:', e)
  } finally {
    isLoadingFiles.value = false
  }
}

const syncSource = async (): Promise<void> => {
  isLoadingFiles.value = true
  try {
    await ProjectService.syncEngineSource()
    await refreshFileList()
  } catch (e) {
    alert('Failed to sync engine source: ' + e)
  } finally {
    isLoadingFiles.value = false
  }
}

// --- Lifecycle ---
onMounted(async () => {
  ProjectService.ensureProjectPath()
  await ProjectService.syncEngineAssets()
  await refreshFileList()
})

// --- ACTIONS ---
const selectFile = async (node: ProjectFileNode): Promise<void> => {
  if (node.isDirectory) return

  isLoadingFiles.value = true
  try {
    const content = await ProjectService.readProjectFile(node.path)
    activeFileId.value = node.path
    activeFile.value = {
      id: node.path,
      name: node.name,
      path: node.path,
      content,
      isUnsaved: false,
      isReadOnly: node.path.startsWith('js/libs') && !node.path.includes('z-engine-source')
    }
  } catch (e) {
    console.error('Failed to read file:', e)
  } finally {
    isLoadingFiles.value = false
  }
}

const createNewFile = async (): Promise<void> => {
  const name = prompt('Filename:', 'Untitled.js')
  if (name) {
    const fileName = name.endsWith('.js') ? name : `${name}.js`
    const path = `js/plugins/${fileName}`
    const content = '// Start coding...\n'

    try {
      await ProjectService.writeProjectFile(path, content)
      await refreshFileList()
      await selectFile({
        name: fileName,
        path,
        isDirectory: false
      })
    } catch (e) {
      alert('Failed to create file: ' + e)
    }
  }
}

const deleteFile = async (node: ProjectFileNode): Promise<void> => {
  if (confirm(`Delete ${node.name}?`)) {
    try {
      await ProjectService.deleteProjectFile(node.path)
      if (activeFileId.value === node.path) {
        activeFile.value = null
        activeFileId.value = ''
      }
      await refreshFileList()
    } catch (e) {
      alert('Failed to delete file: ' + e)
    }
  }
}

const saveFile = async (): Promise<void> => {
  if (activeFile.value) {
    try {
      await ProjectService.writeProjectFile(activeFile.value.path, activeFile.value.content)
      activeFile.value.isUnsaved = false
      const store = useEditorStore()
      store.triggerEngineReload()
      console.log('Saved:', activeFile.value.name)
    } catch (e) {
      alert('Failed to save file: ' + e)
    }
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
  readOnly: false,

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

const handleMount = (editor: any, monaco: any): void => {
  editorRef.value = editor

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: true,
    noLib: false,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    baseUrl: 'file:///',
    paths: {
      '@engine/*': ['js/libs/z-engine-source/*']
    }
  })

  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    baseUrl: 'file:///',
    paths: {
      '@engine/*': ['js/libs/z-engine-source/*']
    }
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

  // Sync engine source files into Monaco environment
  const syncMonacoEnvironment = async (): Promise<void> => {
    ProjectService.ensureProjectPath()
    try {
      const sourceFiles = await ProjectService.getFlatFileTree('js/libs/z-engine-source')

      // Use setExtraLibs to avoid duplicates and ensure clean slate
      const extraLibs: { content: string; filePath: string }[] = sourceFiles.map((f) => ({
        content: f.content,
        filePath: `file:///${f.path}`
      }))

      // Add default Z_ENGINE_TYPES as well
      const pixiShim = `
declare module "pixi.js" {
    export import Application = PIXI.Application;
    export import Container = PIXI.Container;
    export import Graphics = PIXI.Graphics;
    export import Sprite = PIXI.Sprite;
    export import Text = PIXI.Text;
    export import Texture = PIXI.Texture;
    export import Assets = PIXI.Assets;
    export import Point = PIXI.Point;
    export import Rectangle = PIXI.Rectangle;
    export import Matrix = PIXI.Matrix;
    export import Ticker = PIXI.Ticker;
    export import Color = PIXI.Color;
    export import FederatedPointerEvent = PIXI.FederatedPointerEvent;
    
    export default PIXI;
}
declare module "pixi.js/unsafe-eval" {
    export {};
}
`
      extraLibs.push({
        content: Z_ENGINE_TYPES + pixiShim,
        filePath: 'file:///z-engine.d.ts'
      })

      monaco.languages.typescript.javascriptDefaults.setExtraLibs(extraLibs)
      monaco.languages.typescript.typescriptDefaults.setExtraLibs(extraLibs)

      console.log(`Monaco environment synced with ${sourceFiles.length} engine source files.`)
    } catch (e) {
      console.error('Failed to sync Monaco environment:', e)
    }
  }

  syncMonacoEnvironment()

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
    monaco.editor.getModels().map((m: any) => m.uri.toString())
  )

  monaco.languages.registerDocumentFormattingEditProvider('javascript', {
    async provideDocumentFormattingEdits(model: any): Promise<any[]> {
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

const handleChange = (val: string | undefined): void => {
  if (activeFile.value && val !== undefined) {
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
          <div class="flex gap-2">
            <button
              class="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors"
              title="Sync Engine Source"
              @click="syncSource"
            >
              <IconVariable :size="18" />
            </button>
            <button
              class="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Refresh"
              @click="refreshFileList"
            >
              <IconRefresh :size="18" :class="{ 'animate-spin': isLoadingFiles }" />
            </button>
            <button
              class="p-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="New Script"
              @click="createNewFile"
            >
              <IconPlus :size="18" />
            </button>
          </div>
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

      <div
        v-if="isLoadingFiles"
        class="flex-1 flex flex-col items-center justify-center text-slate-400"
      >
        <IconRefresh class="animate-spin mb-2" :size="24" />
        <span class="text-xs font-bold uppercase tracking-widest">Loading...</span>
      </div>

      <div v-else class="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
        <template v-if="rootNode">
          <FileTreeNode
            v-for="child in rootNode.children"
            :key="child.path"
            :node="child"
            :depth="0"
            :active-id="activeFileId"
            :expanded-folders="expandedFolders"
            @select="selectFile"
            @toggle="toggleFolder"
            @delete="deleteFile"
          />
        </template>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 relative">
      <header class="h-16 px-8 flex items-center justify-between shrink-0">
        <div v-if="activeFile" class="flex items-center gap-4">
          <div class="flex flex-col">
            <h2 class="text-lg font-bold text-slate-800 leading-none">{{ activeFile.name }}</h2>
            <span class="text-[9px] text-slate-400 font-mono mt-1">{{ activeFile.path }}</span>
          </div>
          <span
            class="px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wide"
            >{{ activeFile.isReadOnly ? 'Read Only' : 'JS' }}</span
          >
          <span
            v-if="activeFile.isUnsaved"
            class="flex items-center gap-1 text-[11px] font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full"
            ><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Unsaved</span
          >
        </div>
        <div v-else class="text-slate-400 font-medium">No file selected</div>
        <button
          :disabled="!activeFile || activeFile.isReadOnly"
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
              <IconFileCode :size="14" /> <span>{{ activeFile.path }}</span>
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
              :path="activeFile.path"
              :value="activeFile.content"
              language="javascript"
              theme="tokyo-night-pro"
              :options="{ ...MONACO_OPTIONS, readOnly: activeFile.isReadOnly }"
              class="h-full w-full"
              @mount="handleMount"
              @change="handleChange"
            />
          </div>

          <div
            class="h-8 bg-[#16161e] border-t border-[#1a1b26] flex items-center justify-between px-4 text-[10px] text-[#565f89] select-none font-medium uppercase tracking-wider shrink-0 z-10"
          >
            <div class="flex items-center gap-4">
              <span v-if="activeFile.isReadOnly">Read Only Mode</span>
              <span v-else>Monaco Editor Ready</span>
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
