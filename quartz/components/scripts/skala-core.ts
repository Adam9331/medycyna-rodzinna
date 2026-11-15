// Interaktywne kalkulatory / skale kliniczne pisane w Obsidianie jako zwykły
// blok kodu ```skala. Skrypt (globalny, ładowany na każdej stronie) szuka takich
// bloków i zamienia je na klikany formularz z automatycznym wynikiem i
// interpretacją. Działa też na stronach premium: zaszyfrowana treść pojawia się
// w DOM dopiero po odszyfrowaniu, więc skanujemy przy każdej zmianie DOM.
//
// Format bloku (jedna rzecz w linii):
//
//   skala: GDS-15 – Geriatryczna Skala Depresji
//   opis: Odpowiedz na pytania dotyczące ostatniego tygodnia.
//   opcje: Tak | Nie
//   - Czy jest Pan/Pani zadowolony z życia? => 0 | 1
//   - Czy porzucił Pan/Pani wiele zajęć? => 1 | 0
//   wynik 0-5: Norma | Brak podejrzenia depresji. | zielony
//   wynik 6-10: Lekka depresja | Wskazana pogłębiona ocena. | zolty
//   wynik 11-15: Ciężka depresja | Pilna diagnostyka. | czerwony
//   zrodlo: Yesavage 1983
//   uwaga: Własny tekst zamiast domyślnego zastrzeżenia.
//
// - "opcje" = etykiety odpowiedzi (wspólne dla wszystkich pytań)
// - "=> a | b" po pytaniu = punkty za kolejne opcje; bez tego: 0, 1, 2, ...
// - pytanie może mieć własne opcje: "- Pytanie [Nigdy | Czasem | Często] => 0 | 1 | 2"
// - wynik: "a-b" lub "a+" ; "etykieta | opis | kolor" (opis i kolor opcjonalne)
//   kolory: zielony, zolty, pomaranczowy, czerwony (domyślnie dobierane automatycznie)
//
// TRYB KRYTERIÓW (np. kryteria diagnostyczne ICHD-3, DSM) – zamiast punktów:
// kalkulator na żywo pokazuje, które kryteria są spełnione i czy rozpoznanie pasuje.
//
//   skala: Migrena u dzieci – kryteria ICHD-3
//   rozpoznanie: Migrena bez aury
//   kryterium: A. Liczba napadów | wszystkie
//   - ≥5 napadów spełniających kryteria B–D
//   kryterium: C. Cechy bólu | min 2
//   - Jednostronna lokalizacja
//   - Pulsujący charakter
//   wskazowki: Ważne u dzieci
//   wskazowka: Ból często obustronny.
//   spelnione: (opcjonalnie) własny tekst, gdy wszystkie kryteria spełnione
//   niespelnione: (opcjonalnie) własny tekst, gdy kryteria nie mogą być spełnione
//
// - każda pozycja "- ..." pod kryterium = odpowiedź Tak/Nie ("Tak" = cecha obecna)
// - "wszystkie" = trzeba spełnić każdą pozycję; "min N" = co najmniej N pozycji
// - rozpoznanie jest spełnione, gdy spełnione są wszystkie jego kryteria
// - można podać kilka rozpoznań (każde zaczyna się od "rozpoznanie: ...")

type Question = { text: string; options: string[]; points: number[] }
type Band = { min: number; max: number; label: string; desc: string; color: string }
type Criterion = { label: string; min: number | null; items: string[] }
type Diagnosis = {
  name: string
  criteria: Criterion[]
  hintsTitle: string
  hints: string[]
  metText: string
  unmetText: string
}
type Scale = {
  title: string
  desc: string
  note: string
  source: string
  questions: Question[]
  bands: Band[]
  diagnoses: Diagnosis[]
}

const DEFAULT_NOTE =
  "Narzędzie ma charakter pomocniczy i nie zastępuje oceny klinicznej ani decyzji lekarza."
const COLORS = ["zielony", "zolty", "pomaranczowy", "czerwony"]
let uid = 0

function splitPipes(s: string): string[] {
  return s
    .split("|")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
}

export function parseScale(src: string): Scale | null {
  const scale: Scale = {
    title: "",
    desc: "",
    note: DEFAULT_NOTE,
    source: "",
    questions: [],
    bands: [],
    diagnoses: [],
  }
  let defaultOptions: string[] = ["Tak", "Nie"]
  let curDx: Diagnosis | null = null
  let curCrit: Criterion | null = null

  const ensureDx = (): Diagnosis => {
    if (!curDx) {
      curDx = {
        name: scale.title || "Rozpoznanie",
        criteria: [],
        hintsTitle: "",
        hints: [],
        metText: "",
        unmetText: "",
      }
      scale.diagnoses.push(curDx)
    }
    return curDx
  }

  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#") || line.startsWith("//")) continue

    let m: RegExpMatchArray | null
    if ((m = line.match(/^skala\s*:\s*(.+)$/i))) {
      scale.title = m[1].trim()
    } else if ((m = line.match(/^opis\s*:\s*(.+)$/i))) {
      scale.desc = m[1].trim()
    } else if ((m = line.match(/^uwaga\s*:\s*(.+)$/i))) {
      scale.note = m[1].trim()
    } else if ((m = line.match(/^(?:zrodlo|źródło)\s*:\s*(.+)$/i))) {
      scale.source = m[1].trim()
    } else if ((m = line.match(/^rozpoznanie\s*:\s*(.+)$/i))) {
      curDx = null
      curCrit = null
      ensureDx().name = m[1].trim()
    } else if ((m = line.match(/^kryterium\s*:\s*(.+)$/i))) {
      const parts = m[1].split("|").map((x) => x.trim())
      const spec = parts.slice(1).join(" ")
      let min: number | null = null
      const mm = spec.match(/(?:min\.?|≥|>=)\s*(\d+)/i)
      if (mm && !/wszystk/i.test(spec)) min = Number(mm[1])
      curCrit = { label: parts[0], min, items: [] }
      ensureDx().criteria.push(curCrit)
    } else if ((m = line.match(/^wskaz(?:o|ó)wki\s*:\s*(.+)$/i))) {
      ensureDx().hintsTitle = m[1].trim()
    } else if ((m = line.match(/^wskaz(?:o|ó)wka\s*:\s*(.+)$/i))) {
      ensureDx().hints.push(m[1].trim())
    } else if ((m = line.match(/^(?:spelnione|spełnione)\s*:\s*(.+)$/i))) {
      ensureDx().metText = m[1].trim()
    } else if ((m = line.match(/^(?:niespelnione|niespełnione)\s*:\s*(.+)$/i))) {
      ensureDx().unmetText = m[1].trim()
    } else if ((m = line.match(/^opcje\s*:\s*(.+)$/i))) {
      const opts = splitPipes(m[1])
      if (opts.length >= 2) defaultOptions = opts
    } else if ((m = line.match(/^wynik\s+(\d+)\s*(?:-|–|—)\s*(\d+)\s*:\s*(.+)$/i))) {
      pushBand(scale, Number(m[1]), Number(m[2]), m[3])
    } else if ((m = line.match(/^wynik\s+(\d+)\s*\+\s*:\s*(.+)$/i))) {
      pushBand(scale, Number(m[1]), Infinity, m[2])
    } else if ((m = line.match(/^wynik\s+(\d+)\s*:\s*(.+)$/i))) {
      pushBand(scale, Number(m[1]), Number(m[1]), m[2])
    } else if (curCrit && (m = line.match(/^[-*]\s+(.+)$/))) {
      curCrit.items.push(m[1].trim())
    } else if ((m = line.match(/^[-*]\s+(.+)$/))) {
      let body = m[1]
      let points: number[] | null = null
      const arrow = body.lastIndexOf("=>")
      if (arrow !== -1) {
        const parsed = splitPipes(body.slice(arrow + 2)).map(Number)
        if (parsed.length > 0 && parsed.every((n) => !Number.isNaN(n))) {
          points = parsed
          body = body.slice(0, arrow).trim()
        }
      }
      let options = defaultOptions
      const own = body.match(/^(.*)\[([^\]]+)\]\s*$/)
      if (own) {
        const parsedOpts = splitPipes(own[2])
        if (parsedOpts.length >= 2) {
          options = parsedOpts
          body = own[1].trim()
        }
      }
      const finalPoints = options.map((_, i) => (points && points[i] !== undefined ? points[i] : i))
      scale.questions.push({ text: body, options, points: finalPoints })
    }
  }

  scale.diagnoses = scale.diagnoses.filter((d) => d.criteria.some((c) => c.items.length > 0))
  if (scale.questions.length === 0 && scale.diagnoses.length === 0) return null
  scale.bands.sort((a, b) => a.min - b.min)
  assignColors(scale.bands)
  return scale
}

function pushBand(scale: Scale, min: number, max: number, rest: string) {
  const parts = rest.split("|").map((x) => x.trim())
  let color = ""
  if (parts.length >= 3 && COLORS.includes(parts[parts.length - 1].toLowerCase())) {
    color = parts.pop()!.toLowerCase()
  }
  scale.bands.push({ min, max, label: parts[0] ?? "", desc: parts.slice(1).join(" | "), color })
}

function assignColors(bands: Band[]) {
  const n = bands.length
  bands.forEach((b, i) => {
    if (b.color) return
    const idx = n <= 1 ? 0 : Math.round((i * (COLORS.length - 1)) / (n - 1))
    b.color = COLORS[idx]
  })
}

// minimalne formatowanie: **pogrubienie** (bez innerHTML, więc bezpieczne)
function appendRich(parent: HTMLElement, text: string) {
  text.split(/(\*\*[^*]+\*\*)/g).forEach((chunk) => {
    if (!chunk) return
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      const strong = document.createElement("strong")
      strong.textContent = chunk.slice(2, -2)
      parent.appendChild(strong)
    } else {
      parent.appendChild(document.createTextNode(chunk))
    }
  })
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function maxScore(scale: Scale): number {
  return scale.questions.reduce((sum, q) => sum + Math.max(...q.points), 0)
}

// Drukowanie przez ukryty iframe z kopią kalkulatora: drukuje się tylko ten
// formularz (bez reszty strony). blank=true -> pusta ankieta do wypełnienia długopisem.
function printScale(root: HTMLElement, title: string, blank: boolean) {
  const clone = root.cloneNode(true) as HTMLElement
  const src = root.querySelectorAll<HTMLInputElement>("input[type=radio]")
  const dst = clone.querySelectorAll<HTMLInputElement>("input[type=radio]")
  dst.forEach((d, i) => {
    if (!blank && src[i]?.checked) d.setAttribute("checked", "")
    else d.removeAttribute("checked")
  })
  if (blank) clone.classList.add("mr-skala--blank")

  const iframe = document.createElement("iframe")
  iframe.setAttribute("aria-hidden", "true")
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  const win = iframe.contentWindow
  if (!doc || !win) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write("<!doctype html><html><head><meta charset='utf-8'></head><body></body></html>")
  doc.close()
  doc.title = title || "Skala"
  document
    .querySelectorAll('style, link[rel="stylesheet"]')
    .forEach((n) => doc.head.appendChild(n.cloneNode(true)))
  doc.body.appendChild(clone)

  const cleanup = () => iframe.remove()
  win.addEventListener("afterprint", cleanup)
  setTimeout(() => {
    win.focus()
    win.print()
    setTimeout(cleanup, 60000)
  }, 500)
}

function buildScoring(scale: Scale): HTMLElement {
  const id = `mr-skala-${++uid}`
  const root = el("div", "mr-skala")
  const answers: (number | null)[] = scale.questions.map(() => null)
  const max = maxScore(scale)

  if (scale.title) root.appendChild(el("h3", "mr-skala-title", scale.title))
  if (scale.desc) root.appendChild(el("p", "mr-skala-desc", scale.desc))

  // widoczne tylko na wydruku: miejsce na dane pacjenta i datę
  const meta = el("div", "mr-skala-print-meta")
  meta.appendChild(el("span", undefined, "Pacjent: ______________________________"))
  meta.appendChild(el("span", undefined, "Data: ______________"))
  root.appendChild(meta)

  const progress = el("div", "mr-skala-progress")
  const bar = el("div", "mr-skala-progress-bar")
  progress.appendChild(bar)
  root.appendChild(progress)

  const form = el("div", "mr-skala-questions")
  const result = el("div", "mr-skala-result")
  result.setAttribute("role", "status")
  result.setAttribute("aria-live", "polite")
  result.hidden = true

  const status = el("p", "mr-skala-status")

  function update() {
    const done = answers.filter((a) => a !== null).length
    const total = answers.length
    bar.style.width = `${(done / total) * 100}%`
    if (done < total) {
      status.textContent = `Odpowiedziano na ${done} z ${total} pytań`
      result.hidden = true
      return
    }
    status.textContent = `Odpowiedziano na wszystkie pytania (${total})`
    const score = answers.reduce<number>((s, a) => s + (a ?? 0), 0)
    const band = scale.bands.find((b) => score >= b.min && score <= b.max)

    result.replaceChildren()
    result.hidden = false
    result.dataset.color = band?.color ?? "zolty"
    result.appendChild(el("div", "mr-skala-score", `Wynik: ${score} / ${max} pkt`))
    if (band) {
      const label = el("div", "mr-skala-band")
      appendRich(label, band.label)
      result.appendChild(label)
      if (band.desc) {
        const d = el("p", "mr-skala-band-desc")
        appendRich(d, band.desc)
        result.appendChild(d)
      }
    } else if (scale.bands.length > 0) {
      result.appendChild(el("p", "mr-skala-band-desc", "Brak zdefiniowanej interpretacji dla tego wyniku."))
    }
    const reset = el("button", "mr-skala-reset", "Wyczyść odpowiedzi")
    reset.type = "button"
    reset.addEventListener("click", () => {
      answers.fill(null)
      form.querySelectorAll<HTMLInputElement>("input[type=radio]").forEach((r) => (r.checked = false))
      update()
      root.scrollIntoView({ behavior: "smooth", block: "start" })
    })
    result.appendChild(reset)
  }

  scale.questions.forEach((q, qi) => {
    const fs = el("fieldset", "mr-skala-q")
    const legend = el("legend", "mr-skala-q-text")
    legend.appendChild(el("span", "mr-skala-q-num", `${qi + 1}.`))
    appendRich(legend, ` ${q.text}`)
    fs.appendChild(legend)

    const opts = el("div", "mr-skala-options")
    q.options.forEach((label, oi) => {
      const wrap = el("label", "mr-skala-option")
      const input = el("input")
      input.type = "radio"
      input.name = `${id}-q${qi}`
      input.value = String(oi)
      input.addEventListener("change", () => {
        answers[qi] = q.points[oi]
        update()
      })
      wrap.appendChild(input)
      wrap.appendChild(el("span", "mr-skala-option-label", label))
      opts.appendChild(wrap)
    })
    fs.appendChild(opts)
    form.appendChild(fs)
  })

  root.appendChild(form)
  root.appendChild(status)
  root.appendChild(result)

  const actions = el("div", "mr-skala-actions")
  const printBtn = el("button", "mr-skala-action", "Drukuj")
  printBtn.type = "button"
  printBtn.addEventListener("click", () => printScale(root, scale.title, false))
  const blankBtn = el("button", "mr-skala-action", "Drukuj pustą ankietę")
  blankBtn.type = "button"
  blankBtn.addEventListener("click", () => printScale(root, scale.title, true))
  actions.appendChild(printBtn)
  actions.appendChild(blankBtn)
  root.appendChild(actions)

  const foot = el("p", "mr-skala-note")
  foot.textContent = scale.note + (scale.source ? ` Źródło: ${scale.source}.` : "")
  root.appendChild(foot)

  update()
  return root
}

export function build(scale: Scale): HTMLElement {
  return scale.diagnoses.length > 0 ? buildCriteria(scale) : buildScoring(scale)
}

type CritState = "met" | "unmet" | "pending"

function buildCriteria(scale: Scale): HTMLElement {
  const id = `mr-skala-${++uid}`
  const root = el("div", "mr-skala mr-skala--criteria")

  if (scale.title) root.appendChild(el("h3", "mr-skala-title", scale.title))
  if (scale.desc) root.appendChild(el("p", "mr-skala-desc", scale.desc))

  const meta = el("div", "mr-skala-print-meta")
  meta.appendChild(el("span", undefined, "Pacjent: ______________________________"))
  meta.appendChild(el("span", undefined, "Data: ______________"))
  root.appendChild(meta)

  const progress = el("div", "mr-skala-progress")
  const bar = el("div", "mr-skala-progress-bar")
  progress.appendChild(bar)
  root.appendChild(progress)

  // odpowiedzi: true = Tak, false = Nie, null = bez odpowiedzi
  const answers: (boolean | null)[][][] = scale.diagnoses.map((d) =>
    d.criteria.map((c) => c.items.map(() => null)),
  )
  const critStatusEls: HTMLElement[][] = []
  const dxResultEls: HTMLElement[] = []
  const status = el("p", "mr-skala-status")

  const body = el("div", "mr-skala-dxs")

  scale.diagnoses.forEach((dx, di) => {
    const section = el("section", "mr-skala-dx")
    section.appendChild(el("h4", "mr-skala-dx-title", dx.name))
    critStatusEls[di] = []

    dx.criteria.forEach((crit, ci) => {
      const box = el("div", "mr-skala-crit")
      const head = el("div", "mr-skala-crit-head")
      head.appendChild(el("span", "mr-skala-crit-title", crit.label))
      const n = crit.items.length
      if (crit.min !== null) {
        head.appendChild(el("span", "mr-skala-crit-req", `wymagane: ≥${crit.min} z ${n}`))
      } else if (n > 1) {
        head.appendChild(el("span", "mr-skala-crit-req", "wymagane: wszystkie"))
      }
      const st = el("span", "mr-skala-crit-status")
      head.appendChild(st)
      critStatusEls[di][ci] = st
      box.appendChild(head)

      crit.items.forEach((text, ii) => {
        const fs = el("fieldset", "mr-skala-q mr-skala-q--item")
        const legend = el("legend", "mr-skala-q-text")
        appendRich(legend, text)
        fs.appendChild(legend)
        const opts = el("div", "mr-skala-options")
        ;["Tak", "Nie"].forEach((label, oi) => {
          const wrap = el("label", "mr-skala-option")
          const input = el("input")
          input.type = "radio"
          input.name = `${id}-d${di}-c${ci}-i${ii}`
          input.value = String(oi)
          input.addEventListener("change", () => {
            answers[di][ci][ii] = oi === 0
            update()
          })
          wrap.appendChild(input)
          wrap.appendChild(el("span", "mr-skala-option-label", label))
          opts.appendChild(wrap)
        })
        fs.appendChild(opts)
        box.appendChild(fs)
      })
      section.appendChild(box)
    })

    const res = el("div", "mr-skala-dx-result")
    res.setAttribute("role", "status")
    res.setAttribute("aria-live", "polite")
    dxResultEls[di] = res
    section.appendChild(res)

    if (dx.hints.length > 0) {
      const hints = el("div", "mr-skala-hints")
      if (dx.hintsTitle) hints.appendChild(el("div", "mr-skala-hints-title", dx.hintsTitle))
      const ul = el("ul", "mr-skala-hints-list")
      dx.hints.forEach((h) => {
        const li = el("li")
        appendRich(li, h)
        ul.appendChild(li)
      })
      hints.appendChild(ul)
      section.appendChild(hints)
    }
    body.appendChild(section)
  })

  function critState(crit: Criterion, a: (boolean | null)[]): { state: CritState; yes: number } {
    const yes = a.filter((x) => x === true).length
    const unknown = a.filter((x) => x === null).length
    const need = crit.min ?? crit.items.length
    if (yes >= need) return { state: "met", yes }
    if (yes + unknown < need) return { state: "unmet", yes }
    return { state: "pending", yes }
  }

  function update() {
    let done = 0
    let total = 0
    answers.forEach((dxA) => dxA.forEach((cA) => cA.forEach((x) => (total++, x !== null && done++))))
    bar.style.width = `${total ? (done / total) * 100 : 0}%`
    status.textContent = `Odpowiedziano na ${done} z ${total} pytań`

    scale.diagnoses.forEach((dx, di) => {
      let metCount = 0
      let anyUnmet = false
      dx.criteria.forEach((crit, ci) => {
        const { state, yes } = critState(crit, answers[di][ci])
        const n = crit.items.length
        const stEl = critStatusEls[di][ci]
        stEl.dataset.state = state
        const label =
          state === "met" ? "✔ spełnione" : state === "unmet" ? "✘ niespełnione" : "… w trakcie"
        stEl.textContent = `${label} (Tak: ${yes}/${n})`
        if (state === "met") metCount++
        if (state === "unmet") anyUnmet = true
      })
      const res = dxResultEls[di]
      res.replaceChildren()
      let dState: CritState = "pending"
      if (anyUnmet) dState = "unmet"
      else if (metCount === dx.criteria.length) dState = "met"
      res.dataset.state = dState
      let text: string
      if (dState === "met") {
        text = dx.metText || `Spełnione kryteria rozpoznania: ${dx.name}.`
      } else if (dState === "unmet") {
        text = dx.unmetText || `Kryteria rozpoznania „${dx.name}” nie są spełnione.`
      } else {
        text = `${dx.name}: spełnione kryteria ${metCount} z ${dx.criteria.length} (ocena w toku).`
      }
      res.appendChild(el("div", "mr-skala-dx-verdict", text))
    })
  }

  root.appendChild(body)
  root.appendChild(status)

  const actions = el("div", "mr-skala-actions")
  const resetBtn = el("button", "mr-skala-action", "Wyczyść odpowiedzi")
  resetBtn.type = "button"
  resetBtn.addEventListener("click", () => {
    answers.forEach((dxA) => dxA.forEach((cA) => cA.fill(null)))
    body.querySelectorAll<HTMLInputElement>("input[type=radio]").forEach((r) => (r.checked = false))
    update()
  })
  const printBtn = el("button", "mr-skala-action", "Drukuj")
  printBtn.type = "button"
  printBtn.addEventListener("click", () => printScale(root, scale.title, false))
  const blankBtn = el("button", "mr-skala-action", "Drukuj pustą ankietę")
  blankBtn.type = "button"
  blankBtn.addEventListener("click", () => printScale(root, scale.title, true))
  actions.appendChild(resetBtn)
  actions.appendChild(printBtn)
  actions.appendChild(blankBtn)
  root.appendChild(actions)

  const foot = el("p", "mr-skala-note")
  foot.textContent = scale.note + (scale.source ? ` Źródło: ${scale.source}.` : "")
  root.appendChild(foot)

  update()
  return root
}
