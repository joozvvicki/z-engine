# Weekend Development Roadmap - Z-Engine + Neutralinojs + Auto-Build

## Sobota & Niedziela | 31 Stycznia - 1 Lutego 2026

> **Strategy**: Package Engine + Neutralinojs (.exe <15MB) + In-Engine Builder

## 🎯 Główny Cel

1. Stwórz **In-Engine Builder**: Klikasz "Build" w edytorze → dostajesz gotowe `.exe`.
2. Użyj **Neutralinojs**: Ultra-lekki runtime (~3-5MB binary).
3. **Zero configuration** dla użytkownika końcowego.

---

## 📊 Obecny Stan

### ✅ Zrobione

- Core Engine decoupled
- Project Data Structure (JSONs)
- Assets Loading Logic

### ⚠️ Do zrobienia

- Package engine (`@z-engine/core`)
- Game Template (Neutralino project)
- IPC Build Handlers w Editorze
- UI dla Buildera

---

## 📅 Plan na Sobotę (Foundation)

### Część 1: Package Engine (3h)

#### Task 1.1: NPM Package

- [ ] `src/engine/package.json` setup
- [ ] Entry point `src/engine/index.ts`
- [ ] Types generation
- [ ] Build script: `npm run build:engine`

### Część 2: Create Game Template (4-5h)

#### Task 2.1: Template Structure

To będzie "szablon", który edytor kopiuje do folderu buildu.

```txt
templates/game/
├── neutralino.config.json  # Config
├── package.json            # Deps (@z-engine/core)
├── vite.config.js          # Build config
└── resources/
    ├── index.html
    └── js/
        ├── main.js         # Game entry
        └── GameDataProvider.js
```

#### Task 2.2: Neutralino Config

- [ ] Setup `neutralino.config.json` z sensownymi defaults
- [ ] Window settings (resizable, title, icon)

#### Task 2.3: Game Runtime Code

- [ ] `main.js`: Inicjalizacja ZEngine + Neutralino
- [ ] `GameDataProvider.js`: Adapter czytający pliki przez `Neutralino.filesystem`

---

## 📅 Plan na Niedzielę (Automation)

### Część 3: In-Engine Builder (5h)

#### Task 3.1: Build Logic (Backend)

- [ ] **IPC Handler**: `project:buildGame(options)`
- [ ] **Step 1**: Create `build/` folder in project dir
- [ ] **Step 2**: Copy `templates/game` to `build/`
- [ ] **Step 3**: Inject Game Data:
  - Copy Maps/System/Tilesets to `build/resources/data/`
  - Copy Assets to `build/resources/img/`
- [ ] **Step 4**: Run Build Command:
  - `npm install` (if needed)
  - `neu build --release`

#### Task 3.2: Build UI (Frontend)

- [ ] **Build Modal** w Edytorze:
  - Platforms: [x] Windows [ ] Mac [ ] Linux
  - Game Name input
  - "Build" button
- [ ] **Progress Feedback**:
  - Console logs streaming z procesu buildu
  - "Build Success! Open Folder" button

#### Task 3.3: Output Management

- [ ] Move `.exe` to `dist/` folder
- [ ] Clean up temporary `build/` folder (optional)

### Część 4: Polish (2-3h)

#### Task 4.1: Icon Support

- [ ] Allow user to select `icon.png` in Editor
- [ ] Copy icon to `build/resources/icons/`
- [ ] Update `neutralino.config.json` icon path

#### Task 4.2: NSIS Installer (Setup.exe)

- [ ] Stwórz szablon skryptu NSIS (`installer.nsi`) w template
- [ ] Skrypt sprawdza obecność **WebView2 Runtime** w rejestrze
- [ ] Jeśli brak:
  - Pobiera `MicrosoftEdgeWebview2Setup.exe` (bootstrapper)
  - Instaluje cicho (`/silent /install`)
- [ ] Kompiluje finalny `MyGame-Setup.exe` (używając `makensis`)

#### Task 4.3: Output Integration

- [ ] Finalny plik: `dist/MyGame-Setup.exe` (zawiera grę + logikę instalacji WebView2)

#### Task 4.4: Documentation

- [ ] Guide: "How to release your game"

---

## 📝 User Workflow (Final Result)

1. **User**: Pracuje nad grą w Z-Engine Editor.
2. **User**: Klika **"Build Game"** w pasku narzędzi.
3. **Editor**: "Building Game... Packaging Installer... Done!"
4. **Editor**: Otwiera folder z plikiem `MyGame-Setup.exe`.
5. **Player**: Instaluje grę (automatycznie instaluje WebView2 jeśli brak).
6. **Player**: Gra działa! 🎉

---

## ⚡ Technical Stack

- **Builder**: Node.js (via Electron Main Process)
- **Target Runtime**: Neutralinojs
- **Installer**: NSIS (via makensis)
- **Engine**: @z-engine/core (pre-built)

---

## 🚧 Challenges & Solutions

1. **NPM Install time**:
   - _Solution_: Pre-install `node_modules` in template if possible, or use linked packages.
2. **Binary size**:
   - _Solution_: Neutralino is tiny (~3MB), mainly game assets will take space.
3. **WebView2 on Windows**:
   - _Solution_: NSIS Installer handles check & download automatically.
