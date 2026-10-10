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

type Question = { text: string; options: string[]; points: number[] }
type Band = { min: number; max: number; label: string; desc: string; color: string }
type Scale = {
  title: string
  desc: string
  note: string
  source: string
  questions: Question[]
  bands: Band[]
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
  }
  let defaultOptions: string[] = ["Tak", "Nie"]

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
    } else if ((m = line.match(/^opcje\s*:\s*(.+)$/i))) {
      const opts = splitPipes(m[1])
      if (opts.length >= 2) defaultOptions = opts
    } else if ((m = line.match(/^wynik\s+(\d+)\s*(?:-|–|—)\s*(\d+)\s*:\s*(.+)$/i))) {
      pushBand(scale, Number(m[1]), Number(m[2]), m[3])
    } else if ((m = line.match(/^wynik\s+(\d+)\s*\+\s*:\s*(.+)$/i))) {
      pushBand(scale, Number(m[1]), Infinity, m[2])
    } else if ((m = line.match(/^wynik\s+(\d+)\s*:\s*(.+)$/i))) {
      pushBand(scale, Number(m[1]), Number(m[1]), m[2])
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

  if (scale.questions.length === 0) return null
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

export function build(scale: Scale): HTMLElement {
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
