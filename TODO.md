# Z Engine - Roadmap & Tasks

## 🎯 Plan na 30 June 2026 (Najbliższe kroki)

### 1. Refaktoryzacja Store'a (`editor/index.ts`) - ZROBIONE

Obecny plik `editor/index.ts` (~700 linii) jest zbyt duży. Musimy go podzielić na mniejsze moduły:

- [ ] `useMapStore.ts`: Zarządzanie mapami, warstwami i `activeMap`.
- [ ] `useToolStore.ts`: Narzędzia, selekcja, duszki (ghosts).
- [ ] `useDatabaseStore.ts`: Przełączniki, zmienne, aktorzy (dane statyczne).
- [ ] `useHistoryStore.ts`: Integracja z `HistoryManager`.

### 2. Rozbudowa i Polerowanie Bazy Danych

Mamy już `SystemTab` (Switches/Variables) oraz `ActorsTab` (Bohaterowie) w `DatabasePage.vue`, ale wymagają one szlifu:

- [ ] **Actors**: Implementacja wyboru grafiki (Face/Sprite) oraz listy cech (Traits).
- [ ] **System**: Optymalizacja listy przełączników (np. lazy loading dla dużych ilości).
- [ ] **Nowe Zakładki**:
  - [ ] `ClassesTab.vue`: Statystyki i krzywe doświadczenia.
  - [ ] `ItemsTab.vue`: Zarządzanie przedmiotami.
- [ ] **Globalna szukajka**: Szybkie przeszukiwanie całej bazy danych.

### 3. System Zapisu (Persistence)

- [ ] Implementacja zapisu projektu do pliku (JSON).
- [ ] Implementacja "Save Game" (serializacja `GameStateManager` do pliku).
- [ ] Autozapis podczas pracy w edytorze.

### 4. Szlifowanie Silnika

- [ ] Naprawa ostrzeżeń `deprecated glob` podczas budowania (`npm run build`).
- [ ] Implementacja animacji dla eventów (np. obracanie się, "stepping animation").

---

## 🏗️ Brakujące funkcjonalności (Long-term)

1. System Bazy Danych (Database)
   Obecnie w kodzie istnieją tylko pliki-zaślepki. Brakuje edytorów oraz struktury danych dla:
   - Klasy (Classes): Statystyki, krzywe doświadczenia, umiejętności.
   - Umiejętności (Skills): Typy, koszty, efekty, animacje, obrażenia.
   - Przedmioty (Items): Typy, efekty, zużywalność.
   - Bronie i Pancerze (Weapons & Armors): Ekwipunek i jego statystyki.
   - Przeciwnicy (Enemies): Statystyki, dropy, akcje.
   - Grupy Potworów (Troops): Konfiguracja walk, pozycje wrogów, eventy bitewne.
   - Stany (States): Trucizna, paraliż, buffy/debuffy.
   - Animacje (Animations): Edytor efektów wizualnych walki/mapy.
   - Tilesety (Tilesets): Zaawansowana konfiguracja (przejrzystość, drabiny, liczniki, tagi terenu).
   - Zdarzenia Wspólne (Common Events): Skrypty wywoływane globalnie.
   - System: Muzyka startowa, dźwięki menu, początkowa drużyna, pojazdy.

2. Edytor i Interpreter Zdarzeń (Event System). W kodzie widać jedynie zalążek ZEvent z polem pages: unknown[]. Brakuje:
   - Strony Zdarzeń (Event Pages): Warunki aktywacji (przełączniki, zmienne, przedmiot).
   - Wyzwalacze (Triggers): Przycisk akcji, dotyk gracza, autorun, równoległe.
   - Komendy Zdarzeń (Event Commands): Cała logika gry, m.in.:
     - Wiadomości (Tekst, Wybory, Wprowadzanie liczb).
     - Kontrola przepływu (Warunki, Pętle, Etykiety).
     - Operacje na drużynie (Złoto, Przedmioty, Leczenie).
     - Ruch i Mapa (Teleportacja, Ustawianie zdarzeń, Przewijanie mapy).
     - Ekran i Audio (Flash, Shake, Tint, BGM/SE).
     - System (Zmienne, Przełączniki, Zmiana nazwy/klasy).

3. System Walki (Battle System)
   Brak jakiegokolwiek śladu implementacji. Potrzeba:
   - Silnik turowy: Kolejkowanie akcji, obliczanie obrażeń, tury.
   - Interfejs walki (UI): Wybór akcji, paski HP/MP, wyświetlanie animacji.
   - AI Przeciwników: Wybór akcji przez wrogów na podstawie warunków.
   - Scena walki: Tła bitewne, renderowanie sprite'ów wrogów i aktorów (Sideview/Frontview).

4. Silnik Gry (Game Engine / Runtime)
   Edytor pozwala edytować mapę, ale brakuje "gry" jako takiej:
   - Pętla gry (Game Loop): Główna pętla aktualizująca stan gry, nie tylko renderowanie mapy.
   - Sceny (Scenes): Menadżer scen (Title, Map, Battle, Menu, Gameover).
   - Zapis i Odczyt (Save/Load): Serializacja całego stanu gry (nie tylko bazy danych edytora).
   - Menu w grze: Ekwipunek, Status, Opcje, Zapis.
   - System Okien (Window System): UI w grze (ramki, kursory, layout).

5. Edytor Map - Dodatki
   Zgodnie z plikiem TODO oraz analizą:
   - Regiony: Malowanie regionów do sterowania losowymi walkami lub eventami.
   - Cień (Shadow Pen): Ręczne rysowanie cieni.
   - Zarządzanie warstwami: Bardziej zaawansowane opcje blokowania/ukrywania.

6. Inne
   - Menedżer Zasobów (Resource Manager): Import/Eksport grafik i dźwięków.
   - Generator Postaci: (Opcjonalnie, ale jest w RPG Makerach).
   - System Pluginów: Możliwość pisania własnych skryptów w JS/TS zmieniających działanie silnika.
   - Eksport Gry (Deployment): Budowanie gotowej gry .exe/.app (nie edytora).
