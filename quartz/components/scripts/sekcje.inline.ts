// Skrypt strony: zamienia nagłówki (h2–h4) w zwijane ramki.
// Tytuł ramki = nagłówek, zawartość = wszystko do następnego nagłówka tego samego
// lub wyższego poziomu. Sekcje są domyślnie zwinięte; nad pierwszą jest pasek
// „Rozwiń wszystko / Zwiń wszystko”. Działa też na treści premium wstawianej po
// odszyfrowaniu (MutationObserver) i po nawigacji SPA.
//
// Nie zmienia treści notatek ani logiki logowania/premium – tylko opakowuje elementy
// w <details>. Linki do sekcji (spis treści, #kotwice) automatycznie rozwijają ramkę.

const MIN_SECTIONS = 2
const LEVELS = [4, 3, 2] // od najgłębszego, żeby zagnieżdżenie wyszło poprawnie

function mainArticle(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".center article") ||
    document.querySelector<HTMLElement>("article")
  )
}

function headingLevel(n: Node): number {
  if (!(n instanceof HTMLElement)) return 99
  const m = n.tagName.match(/^H([1-6])$/)
  if (m) return Number(m[1])
  if (n.matches("details.mr-sec")) return Number(n.dataset.level || 99)
  return 99
}

function skipHeading(h: HTMLElement): boolean {
  return !!h.closest(
    "summary, blockquote, .callout, table, .mr-drug, .mr-rec, .mr-skala, section[data-footnotes], .mr-sec-bar",
  )
}

function openAncestors(el: Element | null) {
  if (!el) return
  let d = el.closest<HTMLDetailsElement>("details.mr-sec")
  while (d) {
    d.open = true
    d = d.parentElement ? d.parentElement.closest<HTMLDetailsElement>("details.mr-sec") : null
  }
}

function targetFromHash(hash: string): HTMLElement | null {
  if (!hash || hash.length < 2) return null
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)))
  } catch {
    return null
  }
}

function build(art: HTMLElement) {
  for (const L of LEVELS) {
    const heads = Array.from(art.querySelectorAll<HTMLElement>(`h${L}`)).filter(
      (h) => !skipHeading(h),
    )
    for (const h of heads) {
      const parent = h.parentNode
      if (!parent) continue
      const det = document.createElement("details")
      det.className = "mr-sec"
      det.dataset.level = String(L)
      const sum = document.createElement("summary")
      sum.className = "mr-sec-title"
      const body = document.createElement("div")
      body.className = "mr-sec-body"
      parent.insertBefore(det, h)
      sum.appendChild(h)
      det.appendChild(sum)
      det.appendChild(body)
      let n = det.nextSibling
      while (n) {
        if (headingLevel(n) <= L) break
        const next = n.nextSibling
        body.appendChild(n)
        n = next
      }
    }
  }
}

function ensureBar(art: HTMLElement) {
  const sections = art.querySelectorAll<HTMLDetailsElement>("details.mr-sec")
  const existing = art.querySelector(".mr-sec-bar")
  if (sections.length < MIN_SECTIONS) {
    existing?.remove()
    return
  }
  if (existing) return
  const first = art.querySelector<HTMLElement>("details.mr-sec")
  if (!first || !first.parentNode) return
  const bar = document.createElement("div")
  bar.className = "mr-sec-bar"
  const mk = (label: string, open: boolean) => {
    const b = document.createElement("button")
    b.type = "button"
    b.className = "mr-sec-bar-btn"
    b.textContent = label
    b.addEventListener("click", () => {
      art.querySelectorAll<HTMLDetailsElement>("details.mr-sec").forEach((d) => (d.open = open))
    })
    return b
  }
  bar.appendChild(mk("Rozwiń wszystko", true))
  bar.appendChild(mk("Zwiń wszystko", false))
  first.parentNode.insertBefore(bar, first)
}

function run() {
  const slug = document.body?.getAttribute("data-slug") || ""
  if (slug === "index") return
  const art = mainArticle()
  if (!art) return
  build(art)
  ensureBar(art)
}

let firstHashHandled = ""
function handleHash() {
  const hash = location.hash
  if (!hash || hash === firstHashHandled) return
  const t = targetFromHash(hash)
  if (t && t.closest("details.mr-sec")) {
    firstHashHandled = hash
    openAncestors(t)
    t.scrollIntoView()
  }
}

let scheduled = false
function schedule() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    run()
    handleHash()
  })
}

// kliknięcie linku #kotwica (spis treści, odnośniki) rozwija ramkę z celem
document.addEventListener(
  "click",
  (e) => {
    const a = (e.target as HTMLElement | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null
    if (!a) return
    if (a.closest("summary")) return // kotwica w tytule ramki: zwykłe przełączenie
    const t = targetFromHash(a.getAttribute("href") || "")
    if (t) openAncestors(t)
  },
  true,
)
window.addEventListener("hashchange", () => {
  firstHashHandled = ""
  handleHash()
})

// druk: wszystko rozwinięte
window.addEventListener("beforeprint", () => {
  document.querySelectorAll<HTMLDetailsElement>("details.mr-sec").forEach((d) => (d.open = true))
})

const sekObserver = new MutationObserver(schedule)
sekObserver.observe(document.body, { childList: true, subtree: true })
document.addEventListener("nav", () => {
  firstHashHandled = ""
  schedule()
})
document.addEventListener("render", schedule)
run()
handleHash()

export {}
