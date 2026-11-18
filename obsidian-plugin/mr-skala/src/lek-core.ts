// Wspólna logika kart leków, kalkulatora dawek i kart zaleceń dla pacjenta.
// Używana przez stronę (lek.inline.ts) i plugin do Obsidiana (obsidian-plugin/mr-skala).
//
// SKŁADNIA (blok kodu w Obsidianie – tak samo jak ```skala):
//
// ```lek
// nazwa: Olodon Free 1 mg/ml
// substancja: olopatadyna
// dawkowanie: 1 kropla do oka 2 × dziennie
// typ: Rp                      (opcjonalnie: Rp. dodawane tylko gdy podano "typ")
// rp: Rp.                      (opcjonalnie: własny prefiks, domyślnie "Rp.")
// ds: D.S.                     (opcjonalnie: własny prefiks, domyślnie "D.S.")
// dawkowanie_recepty: Do oczu, 1 kropla 2 razy dziennie   (opcjonalnie: tekst po D.S.)
// zamienniki: https://...      (opcjonalnie: bezpośredni link; brak = strona główna bazy)
// refundacja: ... | laktacja: ... | chpl: ...
// kalkulator: true
// tryb: mg/kg/dawke            (albo mg/kg/dobe) – WYMAGANE przy kalkulatorze
// dawka_domyslna: 5
// podania_na_dobe: 3
// stezenie_mg: 100             (opcjonalnie; razem ze stezenie_ml)
// stezenie_ml: 5
// maks_dawka_jednorazowa_mg:   (puste = brak danych, NIE brak ograniczeń)
// maks_dawka_dobowa_mg:
// masa_min_kg: / masa_max_kg: / wiek_min_mies: / wiek_max_mies:
// zaokraglenie_ml: 0.5         (opcjonalnie: krok odmierzania objętości)
// droga: Doustnie              (opcjonalnie: dodawane do D.S. przy przeliczonej recepcie)
// ```
//
// ```zalecenia
// tytul: Zalecenia — ostre zapalenie gardła
// 1. Odpoczynek i odpowiednie nawodnienie.
// 2. ...
// ```

export type LinkKey = "zamienniki" | "refundacja" | "laktacja" | "chpl"
export type Mode = "dose" | "day"

export type CalcDef = {
  mode: Mode | null
  defaultDose: number | null
  defaultFreq: number | null
  concMg: number | null
  concMl: number | null
  maxSingleMg: number | null
  maxDailyMg: number | null
  weightMin: number | null
  weightMax: number | null
  ageMin: number | null
  ageMax: number | null
  roundMl: number | null
  route: string
  errors: string[]
}

export type Drug = {
  name: string
  route: string
  substance: string
  dosing: string
  isRx: boolean
  rpPrefix: string
  dsPrefix: string
  rxDosing: string
  info: string[]
  links: Record<LinkKey, string>
  calc: CalcDef | null
}

export type Recommendations = { title: string; body: string }

const LINK_HOMES: Record<LinkKey, string> = {
  zamienniki: "https://zamienniki.pharmindex.pl/",
  refundacja: "https://bartoszmowi.pl/drugs",
  laktacja: "https://www.e-lactancia.org/",
  chpl: "https://rejestry.ezdrowie.gov.pl/rpl/search/public",
}
const LINK_LABELS: Record<LinkKey, string> = {
  zamienniki: "Zamienniki",
  refundacja: "Refundacja",
  laktacja: "e-lactancia",
  chpl: "ChPL",
}
// Automatyczne linki: z nazwy handlowej i substancji budowane są adresy wyszukiwania.
// {q} = fraza do wyszukania. Gdy poznamy dokładne adresy wyszukiwarek tych baz,
// wystarczy podmienić poniższe szablony (np. "https://baza.pl/szukaj?q={q}").
const LINK_AUTO: Record<
  LinkKey,
  { template: string; from: "name" | "substance"; plus?: boolean }
> = {
  zamienniki: {
    template: "https://indeks.mp.pl/leki/subst.html?phrase={q}",
    from: "name",
    plus: true,
  },
  refundacja: {
    template: "https://www.google.com/search?q=site%3Abartoszmowi.pl+{q}&udm=14&hl=pl",
    from: "name",
    plus: true,
  },
  laktacja: {
    template: "https://www.google.com/search?q=e-lactancia+{q}&udm=14&hl=pl",
    from: "substance",
    plus: true,
  },
  chpl: {
    template: "https://www.google.com/search?q=ChPL+{q}&udm=14&hl=pl",
    from: "substance",
    plus: true,
  },
}

// „Olodon Free 1 mg/ml” -> „Olodon Free” (bez mocy i postaci)
export function searchName(name: string): string {
  return name.replace(/\s+\d.*$/, "").trim() || name.trim()
}

function autoLink(k: LinkKey, name: string, substance: string): string {
  const a = LINK_AUTO[k]
  const raw = a.from === "name" ? searchName(name) : substance.trim()
  if (!raw) return LINK_HOMES[k]
  let q = encodeURIComponent(raw)
  if (a.plus) q = q.replace(/%20/g, "+")
  return a.template.replace("{q}", q)
}

const LINK_KEYS: LinkKey[] = ["zamienniki", "refundacja", "laktacja", "chpl"]

let uid = 0

/* ───────────── pomocnicze ───────────── */

export function normKey(k: string): string {
  return k
    .trim()
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s-]+/g, "_")
}

// Liczba z polskim przecinkiem. Zwraca null dla pustego, NaN dla nieprawidłowego.
export function parseNum(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null
  const t = String(s).trim()
  if (t === "") return null
  if (!/^\d+([.,]\d+)?$/.test(t)) return NaN
  const n = Number(t.replace(",", "."))
  return Number.isFinite(n) ? n : NaN
}

// Format polski: przecinek, bez zbędnych zer.
export function fmt(n: number, maxDecimals = 2): string {
  const d = Math.abs(n) > 0 && Math.abs(n) < 0.1 ? Math.max(maxDecimals, 3) : maxDecimals
  const s = Number(n.toFixed(d)).toString()
  return s.replace(".", ",")
}

export function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== "https:" && u.protocol !== "http:") return null
    return u.toString()
  } catch {
    return null
  }
}

function truthy(v: string): boolean {
  return /^(true|tak|yes|1|prawda)$/i.test(v.trim())
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (className) e.className = className
  if (text !== undefined) e.textContent = text
  return e
}

// **pogrubienie** bez innerHTML (ochrona przed XSS)
function appendRich(parent: HTMLElement, text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  for (const p of parts) {
    if (!p) continue
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      parent.appendChild(el("strong", undefined, p.slice(2, -2)))
    } else {
      parent.appendChild(document.createTextNode(p))
    }
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // próbujemy zapasowej metody
  }
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.top = "-1000px"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    ta.remove()
    return ok
  } catch {
    return false
  }
}

type IconKind = "copy" | "external" | "chevron-down" | "chevron-up"

function icon(kind: IconKind): SVGElement {
  const NS = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(NS, "svg")
  svg.setAttribute("viewBox", "0 0 24 24")
  svg.setAttribute("width", "1em")
  svg.setAttribute("height", "1em")
  svg.setAttribute("fill", "none")
  svg.setAttribute("stroke", "currentColor")
  svg.setAttribute("stroke-width", "2")
  svg.setAttribute("stroke-linecap", "round")
  svg.setAttribute("stroke-linejoin", "round")
  svg.setAttribute("aria-hidden", "true")
  svg.setAttribute("focusable", "false")
  svg.setAttribute("class", "mr-ico")
  const add = (tag: string, attrs: Record<string, string>) => {
    const e = document.createElementNS(NS, tag)
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
    svg.appendChild(e)
  }
  if (kind === "copy") {
    add("rect", { x: "9", y: "9", width: "11", height: "11", rx: "2.5" })
    add("path", { d: "M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" })
  } else if (kind === "external") {
    add("path", { d: "M14 4h6v6" })
    add("path", { d: "M20 4l-9 9" })
    add("path", { d: "M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" })
  } else if (kind === "chevron-down") {
    add("path", { d: "M6 9l6 6 6-6" })
  } else {
    add("path", { d: "M6 15l6-6 6 6" })
  }
  return svg
}

function setLabel(b: HTMLElement, label: string, ico?: IconKind, iconFirst = false) {
  b.textContent = ""
  const span = el("span", "mr-btn-label", label)
  if (ico && iconFirst) b.appendChild(icon(ico))
  b.appendChild(span)
  if (ico && !iconFirst) b.appendChild(icon(ico))
}

function makeCopyButton(
  label: string,
  getText: () => string | null,
  className = "mr-drug-btn",
  ico?: IconKind,
  iconFirst = false,
) {
  const b = el("button", className)
  b.type = "button"
  setLabel(b, label, ico, iconFirst)
  let timer: ReturnType<typeof setTimeout> | undefined
  b.addEventListener("click", async () => {
    const text = getText()
    if (text === null) return
    const ok = await copyText(text)
    b.dataset.state = ok ? "copied" : "failed"
    setLabel(b, ok ? "Skopiowano" : "Nie udało się", ico, iconFirst)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      setLabel(b, label, ico, iconFirst)
      delete b.dataset.state
    }, 1600)
  })
  return b
}

/* ───────────── parser karty leku ───────────── */

export function parseDrug(src: string): Drug | null {
  const f: Record<string, string> = {}
  const infoLines: string[] = []
  let cur = ""
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#") || line.startsWith("//")) continue
    // linie informacji: wypunktowania „- ...” i wcięte kontynuacje po „informacje:”
    if (cur === "informacje" && (/^[-*•]\s+/.test(line) || /^\s/.test(raw))) {
      infoLines.push(line)
      continue
    }
    const m = line.match(/^([^:]+?)\s*:\s*(.*)$/)
    if (!m) continue
    // przy duplikatach wygrywa pierwsze wystąpienie
    const k = normKey(m[1])
    const key = k === "info" ? "informacje" : k
    cur = key
    if (key === "informacje") {
      if (m[2].trim()) infoLines.unshift(m[2].trim())
      continue
    }
    if (!(key in f)) f[key] = m[2].trim()
  }
  if (!f.nazwa) return null

  const isRx = !!f.typ && /^rp/i.test(f.typ)
  const links = {} as Record<LinkKey, string>
  for (const k of LINK_KEYS) {
    const custom = f[k] ? safeUrl(f[k]) : null
    const subst = k === "laktacja" && f.substancja_en ? f.substancja_en : f.substancja || ""
    links[k] = custom || autoLink(k, f.nazwa, subst)
  }

  let calc: CalcDef | null = null
  if (f.kalkulator && truthy(f.kalkulator)) {
    const errors: string[] = []
    const num = (key: string, label: string, positive = true): number | null => {
      const v = parseNum(f[key])
      if (v === null) return null
      if (Number.isNaN(v) || (positive && v <= 0)) {
        errors.push(`Nieprawidłowa wartość pola „${label}”.`)
        return null
      }
      return v
    }
    let mode: Mode | null = null
    if (f.tryb) {
      const t = normKey(f.tryb)
      if (/dob/.test(t)) mode = "day"
      else if (/dawk/.test(t)) mode = "dose"
    }
    if (!mode) {
      errors.push(
        "Nie określono trybu dawkowania. Ustaw „tryb: mg/kg/dawke” albo „tryb: mg/kg/dobe”.",
      )
    }
    const concMg = num("stezenie_mg", "stezenie_mg")
    const concMl = num("stezenie_ml", "stezenie_ml")
    if ((concMg === null) !== (concMl === null)) {
      errors.push("Stężenie wymaga obu pól: stezenie_mg i stezenie_ml.")
    }
    calc = {
      mode,
      defaultDose: num("dawka_domyslna", "dawka_domyslna"),
      defaultFreq: num("podania_na_dobe", "podania_na_dobe"),
      concMg,
      concMl,
      maxSingleMg: num("maks_dawka_jednorazowa_mg", "maks_dawka_jednorazowa_mg"),
      maxDailyMg: num("maks_dawka_dobowa_mg", "maks_dawka_dobowa_mg"),
      weightMin: num("masa_min_kg", "masa_min_kg"),
      weightMax: num("masa_max_kg", "masa_max_kg"),
      ageMin: num("wiek_min_mies", "wiek_min_mies", false),
      ageMax: num("wiek_max_mies", "wiek_max_mies", false),
      roundMl: num("zaokraglenie_ml", "zaokraglenie_ml"),
      route: f.droga || "",
      errors,
    }
  }

  return {
    name: f.nazwa,
    substance: f.substancja || "",
    dosing: f.dawkowanie || "",
    route: f.droga || "",
    isRx,
    rpPrefix: f.rp || "Rp.",
    dsPrefix: f.ds || "D.S.",
    rxDosing: f.dawkowanie_recepty || f.dawkowanie || "",
    info: infoLines,
    links,
    calc,
  }
}

export function prescriptionText(d: Drug): string {
  if (d.isRx) {
    const lines = [`${d.rpPrefix} ${d.name}`]
    if (d.rxDosing) lines.push(`${d.dsPrefix} ${d.rxDosing}`)
    return lines.join("\n")
  }
  return d.dosing ? `${d.name}\n${d.dosing}` : d.name
}

/* ───────────── obliczenia (czysta funkcja – testowana) ───────────── */

export type CalcInput = {
  weight: number | null
  dose: number | null
  freq: number | null
  mode: Mode
  concMg: number | null
  concMl: number | null
  age: number | null
}

export type CalcResult = {
  errors: string[] // błędy danych wejściowych – brak wyniku
  blocks: string[] // przekroczone limity / ograniczenia – wynik jest, kopiowanie zablokowane
  infos: string[]
  singleMg: number | null
  dailyMg: number | null
  singleMl: number | null // objętość pokazywana (po ewentualnym zaokrągleniu)
  exactMl: number | null // objętość przed zaokrągleniem
  rounded: boolean
  readyText: string | null
  rxText: string | null
  formula: string
  blocked: boolean
}

export function timesText(n: number): string {
  return n === 1 ? "raz dziennie" : `${fmt(n)} razy dziennie`
}

export function calculate(def: CalcDef, inp: CalcInput, drug: Drug): CalcResult {
  const r: CalcResult = {
    errors: [],
    blocks: [],
    infos: [],
    singleMg: null,
    dailyMg: null,
    singleMl: null,
    exactMl: null,
    rounded: false,
    readyText: null,
    rxText: null,
    formula: "",
    blocked: false,
  }
  const ok = (v: number | null): v is number => v !== null && Number.isFinite(v) && v > 0

  if (!ok(inp.weight)) r.errors.push("Podaj masę ciała większą od 0 kg.")
  if (!ok(inp.dose)) r.errors.push("Podaj dawkę większą od 0 mg/kg.")
  if (!ok(inp.freq) || !Number.isInteger(inp.freq) || inp.freq > 24) {
    r.errors.push("Liczba podań na dobę musi być liczbą całkowitą od 1 do 24.")
  }
  const hasConc = inp.concMg !== null || inp.concMl !== null
  if (hasConc && !(ok(inp.concMg) && ok(inp.concMl))) {
    r.errors.push("Stężenie: podaj obie wartości większe od 0 (mg i ml) albo wyczyść oba pola.")
  }
  if (r.errors.length) {
    r.blocked = true
    return r
  }
  const weight = inp.weight as number
  const dose = inp.dose as number
  const freq = inp.freq as number

  let singleMg: number
  let dailyMg: number
  if (inp.mode === "dose") {
    singleMg = weight * dose
    dailyMg = singleMg * freq
  } else {
    dailyMg = weight * dose
    singleMg = dailyMg / freq
  }

  let singleMl: number | null = null
  if (hasConc) {
    const mg = inp.concMg as number
    const ml = inp.concMl as number
    const exact = (singleMg * ml) / mg
    r.exactMl = exact
    singleMl = exact
    if (def.roundMl && def.roundMl > 0) {
      const step = def.roundMl
      const rounded = Math.round(exact / step) * step
      if (rounded > 0 && Math.abs(rounded - exact) > 1e-9) {
        singleMl = Number(rounded.toFixed(6))
        r.rounded = true
        // dawka faktycznie podana po zaokrągleniu objętości
        singleMg = (singleMl * mg) / ml
        dailyMg = singleMg * freq
        r.infos.push(
          `Objętość zaokrąglono do kroku ${fmt(step)} ml (dokładnie ${fmt(exact)} ml). ` +
            `Faktyczna dawka: ${fmt(singleMg)} mg (${fmt(singleMg / weight)} mg/kg).`,
        )
      }
    }
  }
  r.singleMg = singleMg
  r.dailyMg = dailyMg
  r.singleMl = singleMl

  r.formula =
    inp.mode === "dose"
      ? `${fmt(weight)} kg × ${fmt(dose)} mg/kg/dawkę = ${fmt(singleMg)} mg na dawkę; × ${fmt(freq)} = ${fmt(dailyMg)} mg na dobę`
      : `${fmt(weight)} kg × ${fmt(dose)} mg/kg/dobę = ${fmt(dailyMg)} mg na dobę; ÷ ${fmt(freq)} = ${fmt(singleMg)} mg na dawkę`

  // limity i ograniczenia
  const EPS = 1e-9
  const hasAnyLimit = def.maxSingleMg !== null || def.maxDailyMg !== null
  if (!hasAnyLimit) {
    r.infos.push(
      "Nie zdefiniowano maksymalnych dawek dla tego leku – nie można zweryfikować bezpieczeństwa dawkowania.",
    )
  } else {
    if (def.maxSingleMg === null) {
      r.infos.push("Brak zdefiniowanej maksymalnej dawki jednorazowej – nie sprawdzono.")
    } else if (singleMg > def.maxSingleMg + EPS) {
      r.blocks.push(
        `Przekroczono maksymalną dawkę jednorazową: ${fmt(singleMg)} mg > ${fmt(def.maxSingleMg)} mg.`,
      )
    }
    if (def.maxDailyMg === null) {
      r.infos.push("Brak zdefiniowanej maksymalnej dawki dobowej – nie sprawdzono.")
    } else if (dailyMg > def.maxDailyMg + EPS) {
      r.blocks.push(
        `Przekroczono maksymalną dawkę dobową: ${fmt(dailyMg)} mg > ${fmt(def.maxDailyMg)} mg.`,
      )
    }
  }
  if (def.weightMin !== null && weight < def.weightMin - EPS) {
    r.blocks.push(`Masa ciała poniżej zdefiniowanego minimum (${fmt(def.weightMin)} kg).`)
  }
  if (def.weightMax !== null && weight > def.weightMax + EPS) {
    r.blocks.push(`Masa ciała powyżej zdefiniowanego maksimum (${fmt(def.weightMax)} kg).`)
  }
  if (def.ageMin !== null || def.ageMax !== null) {
    if (inp.age === null || !Number.isFinite(inp.age)) {
      r.blocks.push("Dla tego leku zdefiniowano ograniczenia wieku – podaj wiek, aby je zweryfikować.")
    } else {
      if (def.ageMin !== null && inp.age < def.ageMin - EPS) {
        r.blocks.push(`Wiek poniżej zdefiniowanego minimum (${fmt(def.ageMin)} mies.).`)
      }
      if (def.ageMax !== null && inp.age > def.ageMax + EPS) {
        r.blocks.push(`Wiek powyżej zdefiniowanego maksimum (${fmt(def.ageMax)} mies.).`)
      }
    }
  }
  r.blocked = r.blocks.length > 0

  const volPart = singleMl !== null ? ` (${fmt(singleMl)} ml)` : ""
  r.readyText = `${fmt(singleMg)} mg${volPart} × ${timesText(freq)}`
  const route = def.route ? `${def.route}, ` : ""
  r.rxText = drug.isRx
    ? `${drug.rpPrefix} ${drug.name}\n${drug.dsPrefix} ${route}${r.readyText}`
    : `${drug.name}\n${route}${r.readyText}`
  return r
}

/* ───────────── budowa karty leku ───────────── */

// **pogrubienie** i [tekst](https://adres) bez innerHTML (ochrona przed XSS)
function appendInfoRich(parent: HTMLElement, text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g)
  for (const p of parts) {
    if (!p) continue
    const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
    if (link) {
      const url = safeUrl(link[2])
      if (url) {
        const a = el("a", "mr-drug-info-link", link[1])
        a.href = url
        a.target = "_blank"
        a.rel = "noopener noreferrer"
        a.setAttribute("data-router-ignore", "")
        parent.appendChild(a)
        continue
      }
    }
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) {
      parent.appendChild(el("strong", undefined, p.slice(2, -2)))
    } else {
      parent.appendChild(document.createTextNode(p))
    }
  }
}

function appendInfo(parent: HTMLElement, lines: string[]) {
  let ul: HTMLUListElement | null = null
  for (const l of lines) {
    const b = l.match(/^[-*•]\s+(.*)$/)
    if (b) {
      if (!ul) {
        ul = el("ul", "mr-drug-info-list")
        parent.appendChild(ul)
      }
      const li = el("li")
      appendInfoRich(li, b[1])
      ul.appendChild(li)
    } else {
      ul = null
      const p = el("p", "mr-drug-info-text")
      appendInfoRich(p, l)
      parent.appendChild(p)
    }
  }
}

export function buildDrug(d: Drug): HTMLElement {
  const id = `mr-drug-${++uid}`
  const root = el("article", "mr-drug")

  // nagłówek: [Rp.] nazwa + substancja  |  Kopiuj (cała recepta)
  const head = el("div", "mr-drug-head")
  const titleBox = el("div", "mr-drug-title")
  if (d.isRx) titleBox.appendChild(el("span", "mr-drug-badge", d.rpPrefix))
  const titles = el("div", "mr-drug-titles")
  const nameRow = el("div", "mr-drug-namerow")
  nameRow.appendChild(el("h4", "mr-drug-name", d.name))
  nameRow.appendChild(
    makeCopyButton("Kopiuj", () => prescriptionText(d), "mr-drug-copy-main", "copy", true),
  )
  titles.appendChild(nameRow)
  if (d.substance) titles.appendChild(el("p", "mr-drug-substance", d.substance))
  titleBox.appendChild(titles)
  head.appendChild(titleBox)
  root.appendChild(head)

  // wiersz dawkowania: tekst | [Kalkulator]
  const row = el("div", "mr-drug-dosing-row")
  const dosing = el("p", "mr-drug-dosing")
  appendRich(dosing, d.dosing || "—")
  if (d.route) {
    const rt = el("span", "mr-drug-route")
    rt.appendChild(el("strong", undefined, "Droga: "))
    rt.appendChild(document.createTextNode(d.route))
    dosing.appendChild(rt)
  }
  row.appendChild(dosing)
  const toggles = el("div", "mr-drug-toggles")

  let calcBtn: HTMLButtonElement | null = null
  let calcPanel: HTMLElement | null = null
  if (d.calc) {
    calcBtn = el("button", "mr-drug-btn mr-drug-btn--toggle")
    calcBtn.type = "button"
    setLabel(calcBtn, "Kalkulator", "chevron-down")
    calcBtn.setAttribute("aria-expanded", "false")
    calcBtn.setAttribute("aria-controls", `${id}-calc`)
    toggles.appendChild(calcBtn)
  }
  row.appendChild(toggles)
  root.appendChild(row)

  // panel kalkulatora (rozwijany)
  if (d.calc && calcBtn) {
    calcPanel = buildCalculator(d, d.calc, id)
    calcPanel.id = `${id}-calc`
    calcPanel.hidden = true
    root.appendChild(calcPanel)
    calcBtn.addEventListener("click", () => {
      const open = calcPanel!.hidden === true
      calcPanel!.hidden = !open
      calcBtn!.setAttribute("aria-expanded", String(open))
      calcBtn!.classList.toggle("is-open", open)
      setLabel(calcBtn!, "Kalkulator", open ? "chevron-up" : "chevron-down")
    })
  }

  // zawsze widoczne: szybkie przyciski + informacje o leku / ChPL
  const more = el("div", "mr-drug-more")
  more.id = `${id}-more`

  const pills = el("div", "mr-drug-actions")
  pills.appendChild(makeCopyButton("Nazwa", () => d.name, "mr-drug-btn mr-drug-pill", "copy"))
  pills.appendChild(
    makeCopyButton("Dawkowanie", () => d.dosing, "mr-drug-btn mr-drug-pill", "copy"),
  )
  for (const k of LINK_KEYS) {
    if (k === "chpl") continue
    pills.appendChild(makeLink(LINK_LABELS[k], d.links[k]))
  }
  more.appendChild(pills)

  const infoId = `${id}-info`
  const infoToggle = el("button", "mr-drug-info-toggle")
  infoToggle.type = "button"
  infoToggle.setAttribute("aria-expanded", "false")
  infoToggle.setAttribute("aria-controls", infoId)
  setInfoLabel(infoToggle, false)
  more.appendChild(infoToggle)
  const infoBody = el("div", "mr-drug-info")
  infoBody.id = infoId
  infoBody.hidden = true
  appendInfo(infoBody, d.info)
  infoBody.appendChild(makeLink("Otwórz ChPL w rejestrze", d.links.chpl))
  more.appendChild(infoBody)
  infoToggle.addEventListener("click", () => {
    const open = infoBody.hidden === true
    infoBody.hidden = !open
    infoToggle.setAttribute("aria-expanded", String(open))
    setInfoLabel(infoToggle, open)
  })
  root.appendChild(more)

  return root
}

function setInfoLabel(b: HTMLElement, open: boolean) {
  b.textContent = ""
  b.appendChild(el("span", "mr-btn-label", "Informacje o leku / ChPL"))
  b.appendChild(el("span", "mr-drug-info-hint", open ? "Zwiń" : "Przeczytaj więcej"))
  b.appendChild(icon(open ? "chevron-up" : "chevron-down"))
}

function makeLink(label: string, href: string): HTMLAnchorElement {
  const a = el("a", "mr-drug-btn mr-drug-pill mr-drug-link")
  a.href = href
  a.target = "_blank"
  a.rel = "noopener noreferrer"
  a.setAttribute("data-router-ignore", "")
  a.appendChild(el("span", "mr-btn-label", label))
  a.appendChild(icon("external"))
  return a
}

/* ───────────── kalkulator dawek ───────────── */

function buildCalculator(d: Drug, def: CalcDef, id: string): HTMLElement {
  const panel = el("div", "mr-calc")

  if (def.errors.length || !def.mode) {
    const err = el("p", "mr-calc-fatal")
    err.setAttribute("role", "alert")
    err.textContent = "Kalkulator wyłączony: " + def.errors.join(" ")
    panel.appendChild(err)
    return panel
  }

  const defaults = {
    mode: def.mode as Mode,
    weight: "",
    dose: def.defaultDose !== null ? fmt(def.defaultDose, 4) : "",
    freq: def.defaultFreq !== null ? fmt(def.defaultFreq, 4) : "",
    concMg: def.concMg !== null ? fmt(def.concMg, 4) : "",
    concMl: def.concMl !== null ? fmt(def.concMl, 4) : "",
    age: "",
  }
  const state = { ...defaults }
  const hasConcDef = def.concMg !== null && def.concMl !== null
  const needsAge = def.ageMin !== null || def.ageMax !== null

  // pomocnik: pole z podpisem
  const mkField = (
    key: "weight" | "dose" | "freq" | "concMg" | "concMl" | "age",
    label: string,
    unit: string,
    cls = "",
  ) => {
    const wrap = el("label", `mr-calc-field ${cls}`.trim())
    const input = el("input", "mr-calc-input")
    input.type = "text"
    input.inputMode = "decimal"
    input.autocomplete = "off"
    input.value = state[key]
    input.id = `${id}-${key}`
    const sr = el("span", "mr-calc-sr", label)
    const u = el("span", "mr-calc-unit", unit)
    wrap.appendChild(sr)
    wrap.appendChild(input)
    wrap.appendChild(u)
    input.addEventListener("input", () => {
      state[key] = input.value
      update()
    })
    return { wrap, input, unit: u, sr }
  }

  // tryb dawkowania – zawsze widoczny
  const modeBox = el("fieldset", "mr-calc-mode")
  modeBox.appendChild(el("legend", "mr-calc-legend", "Tryb dawkowania"))
  const modeInputs: HTMLInputElement[] = []
  const modes: { v: Mode; label: string }[] = [
    { v: "dose", label: "mg/kg mc./dawkę" },
    { v: "day", label: "mg/kg mc./dobę" },
  ]
  for (const m of modes) {
    const lab = el("label", "mr-calc-mode-opt")
    const r = el("input")
    r.type = "radio"
    r.name = `${id}-mode`
    r.value = m.v
    r.checked = m.v === state.mode
    r.addEventListener("change", () => {
      if (r.checked) {
        state.mode = m.v
        modeChanged = m.v !== defaults.mode
        update()
      }
    })
    modeInputs.push(r)
    lab.appendChild(r)
    lab.appendChild(el("span", undefined, m.label))
    modeBox.appendChild(lab)
  }
  let modeChanged = false
  panel.appendChild(modeBox)

  const modeWarn = el("p", "mr-calc-warn")
  modeWarn.setAttribute("role", "status")
  panel.appendChild(modeWarn)

  // wiersz 1: masa × dawka × podania
  const row1 = el("div", "mr-calc-row")
  const fWeight = mkField("weight", "Masa ciała (kg)", "kg")
  const fDose = mkField("dose", "Dawka", "mg/kg/dawkę")
  const fFreq = mkField("freq", "Liczba podań na dobę", "/dobę")
  row1.appendChild(fWeight.wrap)
  row1.appendChild(el("span", "mr-calc-op", "×"))
  row1.appendChild(fDose.wrap)
  row1.appendChild(el("span", "mr-calc-op", "×"))
  row1.appendChild(fFreq.wrap)
  panel.appendChild(row1)

  // wiek (tylko gdy autor zdefiniował ograniczenia wieku)
  let fAge: ReturnType<typeof mkField> | null = null
  if (needsAge) {
    const rowAge = el("div", "mr-calc-row")
    fAge = mkField("age", "Wiek dziecka (miesiące)", "mies.")
    rowAge.appendChild(fAge.wrap)
    panel.appendChild(rowAge)
  }

  // wiersz 2: stężenie
  const row2 = el("div", "mr-calc-row mr-calc-row--conc")
  row2.appendChild(el("span", "mr-calc-rowlabel", "Stężenie preparatu:"))
  const fMg = mkField("concMg", "Ilość substancji (mg)", "mg")
  const fMl = mkField("concMl", "Objętość referencyjna (ml)", "ml")
  row2.appendChild(fMg.wrap)
  row2.appendChild(el("span", "mr-calc-op", "w"))
  row2.appendChild(fMl.wrap)
  panel.appendChild(row2)
  const concHint = el("p", "mr-calc-hint", "Np. „100 mg w 5 ml” – ilość substancji zawarta w podanej objętości. Puste = tylko mg.")
  panel.appendChild(concHint)

  // wyniki
  const results = el("table", "mr-calc-results")
  const thead = el("thead")
  const hr = el("tr")
  for (const h of ["Na dawkę", "Objętość na dawkę", "Na dobę"]) hr.appendChild(el("th", undefined, h))
  thead.appendChild(hr)
  const tbody = el("tbody")
  const vr = el("tr")
  const cSingle = el("td")
  const cVol = el("td")
  const cDaily = el("td")
  vr.appendChild(cSingle)
  vr.appendChild(cVol)
  vr.appendChild(cDaily)
  tbody.appendChild(vr)
  results.appendChild(thead)
  results.appendChild(tbody)
  panel.appendChild(results)

  const scheme = el("p", "mr-calc-scheme")
  panel.appendChild(scheme)
  const formula = el("p", "mr-calc-formula")
  panel.appendChild(formula)

  const msgs = el("div", "mr-calc-msgs")
  msgs.setAttribute("role", "alert")
  msgs.setAttribute("aria-live", "polite")
  panel.appendChild(msgs)

  // gotowy tekst + kopiowanie
  const ready = el("div", "mr-calc-ready")
  const readyText = el("p", "mr-calc-ready-text")
  ready.appendChild(readyText)
  const readyActions = el("div", "mr-drug-actions")
  let current: CalcResult | null = null
  const copyReady = makeCopyButton("Kopiuj", () =>
    current && !current.blocked && current.readyText ? current.readyText : null,
  )
  const copyRx = makeCopyButton("Kopiuj receptę z przeliczoną dawką", () =>
    current && !current.blocked && current.rxText ? current.rxText : null,
  )
  readyActions.appendChild(copyReady)
  readyActions.appendChild(copyRx)
  ready.appendChild(readyActions)
  panel.appendChild(ready)

  // stopka: zmodyfikowano + reset
  const foot = el("div", "mr-calc-foot")
  const modBadge = el("span", "mr-calc-badge", "Zmodyfikowano")
  modBadge.hidden = true
  const resetBtn = el("button", "mr-drug-btn", "Przywróć domyślne")
  resetBtn.type = "button"
  foot.appendChild(modBadge)
  foot.appendChild(resetBtn)
  panel.appendChild(foot)

  panel.appendChild(
    el(
      "p",
      "mr-calc-disclaimer",
      "Narzędzie pomocnicze dla osób wykonujących zawód medyczny. Nie weryfikuje klinicznej poprawności dawki – sprawdź dawkowanie w ChPL. Dane nie są zapisywane.",
    ),
  )

  const inputs: Record<string, HTMLInputElement> = {
    weight: fWeight.input,
    dose: fDose.input,
    freq: fFreq.input,
    concMg: fMg.input,
    concMl: fMl.input,
  }
  if (fAge) inputs.age = fAge.input

  resetBtn.addEventListener("click", () => {
    // masa i wiek należą do pacjenta – reset przywraca tylko ustawienia leku
    const keep = { weight: state.weight, age: state.age }
    Object.assign(state, defaults, keep)
    modeChanged = false
    for (const [k, inp] of Object.entries(inputs)) inp.value = state[k as keyof typeof state] as string
    modeInputs.forEach((r) => (r.checked = r.value === state.mode))
    update()
  })

  function setInvalid(input: HTMLInputElement, bad: boolean) {
    input.setAttribute("aria-invalid", bad ? "true" : "false")
    input.classList.toggle("is-invalid", bad)
  }

  function update() {
    const w = parseNum(state.weight)
    const dz = parseNum(state.dose)
    const fr = parseNum(state.freq)
    const cmg = parseNum(state.concMg)
    const cml = parseNum(state.concMl)
    const ag = needsAge ? parseNum(state.age) : null

    const isBad = (v: number | null) => v !== null && Number.isNaN(v)
    setInvalid(fWeight.input, w === null || isBad(w) || (w as number) <= 0)
    setInvalid(fDose.input, dz === null || isBad(dz) || (dz as number) <= 0)
    setInvalid(fFreq.input, fr === null || isBad(fr))
    setInvalid(fMg.input, isBad(cmg))
    setInvalid(fMl.input, isBad(cml))
    if (fAge) setInvalid(fAge.input, isBad(ag))

    // etykiety zależne od trybu
    const unit = state.mode === "dose" ? "mg/kg/dawkę" : "mg/kg/dobę"
    fDose.unit.textContent = unit
    fDose.sr.textContent = `Dawka (${unit})`
    fDose.input.setAttribute("aria-label", `Dawka ${unit}`)

    modeWarn.textContent = modeChanged
      ? `Zmieniono tryb dawkowania: wartość „${state.dose || "—"}” jest teraz interpretowana jako ${unit}. Sprawdź dawkę.`
      : ""
    modeWarn.hidden = !modeChanged

    const hasNaN = [w, dz, fr, cmg, cml, ag].some((v) => v !== null && Number.isNaN(v))
    const modified =
      modeChanged ||
      (Object.keys(defaults) as (keyof typeof defaults)[]).some(
        (k) => k !== "mode" && k !== "weight" && k !== "age" && state[k].trim() !== defaults[k].trim(),
      )
    modBadge.hidden = !modified

    const res = hasNaN
      ? null
      : calculate(
          def,
          {
            weight: w,
            dose: dz,
            freq: fr,
            mode: state.mode,
            concMg: cmg,
            concMl: cml,
            age: ag,
          },
          d,
        )
    current = res
    msgs.replaceChildren()

    const showEmpty = () => {
      cSingle.textContent = "—"
      cVol.textContent = "—"
      cDaily.textContent = "—"
      scheme.textContent = ""
      formula.textContent = ""
      readyText.textContent = "—"
    }

    if (!res || res.errors.length) {
      showEmpty()
      const list = res ? res.errors : ["Wpisz poprawne liczby (np. 12,5). Znak dziesiętny: przecinek lub kropka."]
      for (const e of list) msgs.appendChild(el("p", "mr-calc-msg mr-calc-msg--error", e))
      copyReady.disabled = true
      copyRx.disabled = true
      return
    }

    cSingle.textContent = `${fmt(res.singleMg as number)} mg`
    cVol.textContent = res.singleMl !== null ? `${fmt(res.singleMl)} ml` : "—"
    cDaily.textContent = `${fmt(res.dailyMg as number)} mg`
    scheme.textContent =
      `Schemat: ${fmt(dz as number)} ${unit} × ${fmt(fr as number)} ${fr === 1 ? "podanie" : "podań"}/dobę, masa ${fmt(w as number)} kg.`
    formula.textContent = `Wzór: ${res.formula}`
    readyText.textContent = res.readyText || "—"

    for (const b of res.blocks) msgs.appendChild(el("p", "mr-calc-msg mr-calc-msg--block", b))
    if (res.blocked) {
      msgs.appendChild(
        el("p", "mr-calc-msg mr-calc-msg--block", "Kopiowanie przeliczonej dawki zablokowane. Dawka nie została zmieniona ani obcięta."),
      )
    }
    for (const i of res.infos) msgs.appendChild(el("p", "mr-calc-msg mr-calc-msg--info", i))
    copyReady.disabled = res.blocked
    copyRx.disabled = res.blocked
    readyText.classList.toggle("is-blocked", res.blocked)
  }

  void hasConcDef
  update()
  return panel
}

/* ───────────── karta zaleceń ───────────── */

export function parseRecommendations(src: string): Recommendations | null {
  const lines = src.replace(/\r\n/g, "\n").split("\n")
  let title = ""
  const body: string[] = []
  let started = false
  for (const line of lines) {
    if (!started) {
      const m = line.match(/^\s*tytu[lł]\s*:\s*(.*)$/i)
      if (m) {
        title = m[1].trim()
        continue
      }
      if (line.trim() === "") continue
      started = true
    }
    body.push(line.replace(/\s+$/, ""))
  }
  while (body.length && body[body.length - 1] === "") body.pop()
  if (body.length === 0) return null
  return { title: title || "Zalecenia", body: body.join("\n") }
}

const LONG_LINES = 8
const LONG_CHARS = 600

export function buildRecommendations(r: Recommendations): HTMLElement {
  const id = `mr-rec-${++uid}`
  const root = el("article", "mr-rec")
  const head = el("div", "mr-rec-head")
  head.appendChild(el("h4", "mr-rec-title", r.title))
  const actions = el("div", "mr-rec-actions")
  // kopiuje cały tekst (nie tylko widoczny podgląd), z numeracją i nowymi liniami, bez znaczników ** (pogrubienie widać tylko w karcie)
  actions.appendChild(makeCopyButton("Kopiuj", () => r.body.replace(/\*\*([^*]+)\*\*/g, "$1")))

  const lines = r.body.split("\n")
  const isLong = lines.filter((l) => l.trim()).length > LONG_LINES || r.body.length > LONG_CHARS

  const body = el("div", "mr-rec-body")
  body.id = `${id}-body`
  for (const line of lines) {
    if (line.trim() === "") {
      body.appendChild(el("div", "mr-rec-gap"))
      continue
    }
    const p = el("p", "mr-rec-line")
    const m = line.match(/^(\s*)(\d+[.)])\s+(.*)$/)
    if (m) {
      p.classList.add("mr-rec-line--num")
      p.appendChild(el("span", "mr-rec-num", m[2]))
      const t = el("span", "mr-rec-text")
      appendRich(t, m[3])
      p.appendChild(t)
    } else {
      appendRich(p, line.trim())
    }
    body.appendChild(p)
  }

  if (isLong) {
    body.classList.add("is-collapsed")
    const tgl = el("button", "mr-drug-btn mr-drug-btn--toggle", "Rozwiń ˅")
    tgl.type = "button"
    tgl.setAttribute("aria-expanded", "false")
    tgl.setAttribute("aria-controls", body.id)
    tgl.addEventListener("click", () => {
      const collapsed = body.classList.toggle("is-collapsed")
      tgl.setAttribute("aria-expanded", String(!collapsed))
      tgl.textContent = collapsed ? "Rozwiń ˅" : "Zwiń ˄"
    })
    actions.appendChild(tgl)
  }
  head.appendChild(actions)
  root.appendChild(head)
  root.appendChild(body)
  return root
}
