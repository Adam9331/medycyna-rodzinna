---
title: Prompt do tworzenia skal
draft: true
---

Wklej poniższy prompt do Claude, a pod nim tabelę/skalę (tekst, zdjęcie lub PDF).

````
Zamień skalę/tabelę kliniczną, którą wklejam poniżej, na gotową notatkę Markdown
do mojej strony medycznej (Obsidian + Quartz) z interaktywnym kalkulatorem w bloku ```skala.
Odpowiadaj po polsku, zwróć sam gotowy Markdown (bez zapisywania plików).

FORMAT BLOKU ```skala (jedna rzecz w linii):
skala: Pełna nazwa skali
opis: Krótka instrukcja dla użytkownika.
opcje: Tak | Nie                      <- etykiety odpowiedzi wspólne dla pytań
- Pytanie => 0 | 1                    <- punkty za kolejne opcje (bez "=>" punkty to 0,1,2...)
- Pytanie [Nigdy | Czasem | Często] => 0 | 1 | 2   <- własne opcje dla jednego pytania
wynik 0-5: Etykieta | Opis interpretacji | zielony
wynik 6-10: Etykieta | Opis | zolty      (kolory: zielony, zolty, pomaranczowy, czerwony)
wynik 11+: Etykieta | Opis | czerwony    ("a+" = a i więcej; kolor i opis opcjonalne)
zrodlo: Autor, rok
uwaga: (opcjonalnie) własne zastrzeżenie zamiast domyślnego

STRUKTURA NOTATKI:
1. Frontmatter: title, description (1 zdanie), tags (zawsze "kalkulatory" + dziedzina, np. geriatria).
2. 2–3 zdania wstępu: do czego służy skala, u kogo, kiedy ją stosować.
3. Nagłówek "## Kalkulator" i blok ```skala (dokładnie ten nagłówek – używam go do osadzania).
4. "## Interpretacja": tabela przedziałów punktowych z komentarzem klinicznym.
5. "## Uwagi praktyczne": krótko, ograniczenia skali, czynniki zakłócające.
6. "## Źródło".

ZASADY MERYTORYCZNE:
- Punktuj WYŁĄCZNIE według tabeli, którą wklejam. Nie dodawaj pytań, progów ani punktacji z własnej wiedzy.
- Zachowaj oryginalne brzmienie pytań (po polsku; jeśli wklejam angielską wersję, przetłumacz wiernie).
- Uważaj na pytania z odwróconą punktacją (np. "Nie" = 1 pkt) – sprawdź każde z osobna.
- Pozycje punktowane wieloma punktami (np. orientacja 0–5 w MMSE) zapisz jako pytanie z opcjami 0,1,2,...
  np.: - Orientacja w czasie [0 | 1 | 2 | 3 | 4 | 5] => 0 | 1 | 2 | 3 | 4 | 5
- Kalkulator NIE obsługuje: podskal liczonych osobno, korekt (wiek, wykształcenie), pól liczbowych/wzorów
  (np. BMI, eGFR). Jeśli skala tego wymaga, opisz korektę w uwadze i w interpretacji.
- Jeśli czegoś w tabeli brakuje lub jest niejednoznaczne (progi, kierunek punktacji), NIE zgaduj:
  dopisz na końcu sekcję "Do weryfikacji" z listą wątpliwości.
- Na końcu przelicz kontrolnie: maksymalna możliwa liczba punktów z bloku ma być równa maksimum skali z tabeli.

TABELA / SKALA:
[tu wklej]
````
