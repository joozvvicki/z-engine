# Z Engine - Roadmap & Tasks

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
