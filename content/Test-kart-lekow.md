---
title: Test kart leków i zaleceń
description: Notatka testowa komponentów DrugCard, kalkulatora dawek i kart zaleceń. Dane wymyślone – nie zalecenia kliniczne.
---

> [!warning] Notatka testowa
> Nazwy leków i dawki poniżej są **wymyślone** i służą wyłącznie do testowania komponentów. Nie publikuj tej notatki na stronie (usuń ją po testach).

## 1. Zwykła karta leku (bez kalkulatora)

```lek
nazwa: Olodon Free 1 mg/ml
substancja: olopatadyna
dawkowanie: 1 kropla do oka 2 × dziennie
typ: Rp
dawkowanie_recepty: Do oczu, 1 kropla 2 razy dziennie
```

## 2. Kalkulator mg/kg mc./dawkę (ze stężeniem i limitami)

```lek
nazwa: Testol zawiesina 100 mg/5 ml
substancja: testosubstancja (przykład)
dawkowanie: 5 mg/kg mc./dawkę, 3 razy dziennie
typ: Rp
droga: Doustnie
kalkulator: true
tryb: mg/kg/dawke
dawka_domyslna: 5
podania_na_dobe: 3
stezenie_mg: 100
stezenie_ml: 5
maks_dawka_jednorazowa_mg: 300
maks_dawka_dobowa_mg: 600
zaokraglenie_ml: 0.5
```

## 3. Kalkulator mg/kg mc./dobę (z ograniczeniami masy i wieku)

```lek
nazwa: Dobexol syrop 250 mg/5 ml
substancja: dobexolina (przykład)
dawkowanie: 30 mg/kg mc./dobę w 3 dawkach podzielonych
typ: Rp
kalkulator: true
tryb: mg/kg/dobe
dawka_domyslna: 30
podania_na_dobe: 3
stezenie_mg: 250
stezenie_ml: 5
maks_dawka_jednorazowa_mg: 500
maks_dawka_dobowa_mg: 1500
masa_min_kg: 5
masa_max_kg: 50
wiek_min_mies: 3
wiek_max_mies: 144
```

## 4. Kalkulator bez stężenia (tylko mg) i bez limitów

```lek
nazwa: Tabletkol 50 mg
substancja: tabletkolina (przykład)
dawkowanie: 2 mg/kg mc./dawkę, 2 razy dziennie
kalkulator: true
tryb: mg/kg/dawke
dawka_domyslna: 2
podania_na_dobe: 2
```

## 5. Zalecenia krótkie

```zalecenia
tytul: Zalecenia — ostre zapalenie gardła

1. Odpoczynek i odpowiednie nawodnienie.
2. Leczenie objawowe zgodnie z zaleceniem lekarza.
3. Unikanie czynników drażniących.
4. W przypadku pogorszenia stanu zdrowia — ponowna konsultacja.
```

## 6. Zalecenia długie (domyślnie skrócony podgląd)

```zalecenia
tytul: Zalecenia — przykład długiej listy

1. Pacjent powinien przyjmować leki wyłącznie zgodnie z zaleceniem lekarza.
2. Należy zapewnić odpowiednie nawodnienie – kilka małych porcji płynów w ciągu dnia.
3. W przypadku gorączki powyżej 38,5°C należy skontaktować się z lekarzem.
4. Zalecany jest odpoczynek w domu przez 3–5 dni.
5. Dziecko nie powinno uczęszczać do szkoły do czasu ustąpienia objawów.
6. Należy unikać kontaktu z osobami z obniżoną odpornością.
7. Pomieszczenie należy regularnie wietrzyć.
8. Wskazane jest mycie rąk po kontakcie z wydzieliną z nosa lub gardła.

Kiedy zgłosić się pilnie:
9. Utrudnione oddychanie lub świszczący oddech.
10. Brak możliwości przyjmowania płynów przez ponad 12 godzin.
11. Nasilająca się senność lub trudności z wybudzeniem.
12. Pojawienie się wysypki o nieznanej przyczynie.
```

## Lista kontrolna testów

- [ ] Kopiowanie: nazwa, dawkowanie, cała recepta, przeliczone dawkowanie, zalecenia.
- [ ] Rozwijanie i zwijanie kart, panelu kalkulatora i długich zaleceń.
- [ ] Masa 20 kg w karcie 2: wynik 100 mg, 5 ml, 300 mg.
- [ ] Przecinek dziesiętny (np. 12,5 kg) i wartości błędne (0, tekst, ujemne).
- [ ] Zmiana trybu pokazuje ostrzeżenie, „Zmodyfikowano” i „Przywróć domyślne”.
- [ ] Masa 70 kg w karcie 2: przekroczenie limitu blokuje kopiowanie.
- [ ] Karta 3: wymaga wieku; poza zakresem blokuje kopiowanie.
- [ ] Karta 4: brak ml i komunikat o braku limitów.
- [ ] Wiele kart na jednej stronie działa niezależnie; nawigacja do innej notatki i z powrotem.
- [ ] Widok mobilny i tryb ciemny; notatka premium po odszyfrowaniu.
