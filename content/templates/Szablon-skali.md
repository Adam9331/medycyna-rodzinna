---
title: Szablon skali
draft: true
---

Skopiuj blok poniżej do nowej notatki (folder Kalkulatory) i zmień treść.

- `opcje:` etykiety odpowiedzi wspólne dla pytań
- `=> a | b` po pytaniu = punkty za kolejne opcje (bez tego: 0, 1, 2...)
- własne opcje dla jednego pytania: `- Pytanie [Nigdy | Czasem | Często] => 0 | 1 | 2`
- `wynik a-b:` lub `wynik a+:` → `etykieta | opis | kolor` (kolory: zielony, zolty, pomaranczowy, czerwony; opis i kolor opcjonalne)

```skala
skala: Nazwa skali
opis: Krótka instrukcja dla użytkownika.
opcje: Tak | Nie
- Pytanie 1 => 0 | 1
- Pytanie 2 => 1 | 0
wynik 0-1: Niskie ryzyko | Opis interpretacji. | zielony
wynik 2-2: Wysokie ryzyko | Opis interpretacji. | czerwony
zrodlo: Autor, rok
```

## Tryb kryteriów (rozpoznania, np. ICHD-3, DSM)

Zamiast punktów kalkulator pokazuje na żywo, czy kryteria są spełnione.

- `rozpoznanie:` nazwa (można kilka; każde oceniane osobno)
- `kryterium: Etykieta | min N` – wystarczy N pozycji "Tak"; `| wszystkie` lub bez wartości = każda pozycja musi być "Tak"
- `- pozycja` pod kryterium = pytanie Tak/Nie
- `wskazowki: Tytuł` + `wskazowka: tekst` – ramka z uwagami pod rozpoznaniem
- `spelnione:` / `niespelnione:` – własny tekst wyniku (opcjonalnie)

```skala
skala: Nazwa kryteriów
opis: Zaznacz cechy obecne u pacjenta.
rozpoznanie: Nazwa rozpoznania
kryterium: A. Warunek konieczny
- Cecha 1
kryterium: B. Objawy | min 2
- Objaw 1
- Objaw 2
- Objaw 3
wskazowki: Ważne
wskazowka: Dodatkowa uwaga.
zrodlo: Autor, rok
```

