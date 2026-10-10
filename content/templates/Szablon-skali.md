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
