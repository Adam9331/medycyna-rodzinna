---
title: Szablon karty leku i zaleceń
draft: true
---

W notatce wstaw blok kodu z językiem `lek` (karta leku) albo `zalecenia` (karta zaleceń). Działa tak samo w Obsidianie (plugin mr-skala) i na stronie.

## Karta leku – pola

| Pole | Znaczenie |
| --- | --- |
| `nazwa:` | **wymagane** – nazwa handlowa z mocą |
| `substancja:` | substancja czynna (mniejsza czcionka) |
| `dawkowanie:` | tekst dawkowania widoczny zawsze (`**pogrubienie**` działa) |
| `typ: Rp` | dodaje „Rp.” i „D.S.” do recepty; **bez tego pola nie ma prefiksów** |
| `rp:` / `ds:` | własne prefiksy (domyślnie `Rp.` i `D.S.`) |
| `dawkowanie_recepty:` | tekst po D.S., jeśli ma być inny niż `dawkowanie` |
| `zamienniki:` | opcjonalne – buduje się samo z nazwy handlowej (bez mocy): indeks.mp.pl z wpisaną nazwą (jedno kliknięcie „Szukaj”) |
| `refundacja:` `chpl:` `laktacja:` | opcjonalne – domyślnie wyszukiwanie w Google (refundacja z nazwy handlowej na bartoszmowi.pl, ChPL i e-lactancia z substancji). Wpisz adres https, żeby nadpisać |
| `substancja_en:` | angielska nazwa substancji do wyszukiwania e-lactancia, np. `olopatadine` |
| `informacje:` | własne informacje o leku, pokazują się po kliknięciu „Informacje o leku / ChPL” (pod nimi zawsze jest link do ChPL). Pierwsza linia po `informacje:`, kolejne jako punkty `- ...`. Można użyć `**pogrubienia**` i linków `[tekst](https://adres)` |

## Kalkulator dawek (opcjonalny)

Włącz: `kalkulator: true`. Wtedy w karcie pojawia się przycisk „Kalkulator”.

| Pole | Znaczenie |
| --- | --- |
| `tryb:` | **wymagane**: `mg/kg/dawke` (dawka jednorazowa) albo `mg/kg/dobe` (dawka dobowa). Bez tego kalkulator się nie włączy |
| `dawka_domyslna:` | wartość w mg/kg zgodna z trybem |
| `podania_na_dobe:` | domyślna liczba podań |
| `stezenie_mg:` `stezenie_ml:` | np. 100 i 5 = „100 mg w 5 ml”; bez stężenia kalkulator pokazuje tylko mg |
| `maks_dawka_jednorazowa_mg:` `maks_dawka_dobowa_mg:` | limity; **puste pole = brak danych, nie brak ograniczeń** (kalkulator pokaże ostrzeżenie, że nie zweryfikowano) |
| `masa_min_kg:` `masa_max_kg:` | ograniczenia masy ciała |
| `wiek_min_mies:` `wiek_max_mies:` | ograniczenia wieku – pojawia się pole „Wiek (mies.)” |
| `zaokraglenie_ml:` | krok odmierzania objętości (np. `0.5`); bez pola nic nie jest zaokrąglane |
| `droga:` | np. „Doustnie” – dopisywane do D.S. w przeliczonej recepcie |

Liczby można pisać z przecinkiem lub kropką.

````text
```lek
nazwa: Nazwa leku 100 mg/5 ml
substancja: substancja czynna
dawkowanie: 5 mg/kg mc./dawkę, 3 razy dziennie
typ: Rp
kalkulator: true
tryb: mg/kg/dawke
dawka_domyslna: 5
podania_na_dobe: 3
stezenie_mg: 100
stezenie_ml: 5
maks_dawka_jednorazowa_mg:
maks_dawka_dobowa_mg:
```
````

## Karta zaleceń

````text
```zalecenia
tytul: Zalecenia — nazwa choroby

1. Pierwszy punkt.
2. Drugi punkt.
```
````

Przycisk „Kopiuj” kopiuje cały tekst pod tytułem (z numeracją i pustymi liniami). Długie zalecenia (ponad 8 linii lub 600 znaków) są domyślnie zwinięte.

Przykład informacji:

```
informacje: Najważniejsze dla POZ
- **Ciąża:** do weryfikacji w ChPL
- Laktacja: [e-lactancia](https://www.e-lactancia.org/)
- Przeciwwskazania: nadwrażliwość na substancję czynną
```
