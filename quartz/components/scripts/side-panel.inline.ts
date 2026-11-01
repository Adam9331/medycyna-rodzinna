// Panel boczny w stylu Hypocampus: klik w link wewnętrzny otwiera notatkę po prawej,
// przewija do nagłówka (#kotwica), trzyma okruszki odwiedzonych notatek.
// Rejestracja: quartz/plugins/emitters/componentResources.ts (afterDOMLoaded),
// tak samo jak premium-unlock.inline.ts i paywall-ui.inline.ts.

type Entry = { url: string; title: string }

const MIN_WIDTH = 1000 // poniżej: zwykła nawigacja (mobile/tablet)
const SKIP_PREFIXES = ["/static/", "/tags/"]

const w = window as any
if (!w.__sidePanelInit) {
  w.__sidePanelInit = true

  let stack: Entry[] = []
  let panel: HTMLElement | null = null
  let body: HTMLElement | null = null
  let crumbs: HTMLElement | null = null
  let openFull: HTMLAnchorElement | null = null
  const cache = new Map<string, Document>()

  const ensurePanel = () => {
    if (panel && document.body.contains(panel)) return
    panel = document.createElement("aside")
    panel.id = "side-panel"
    panel.setAttribute("aria-hidden", "true")
    panel.innerHTML = `
      <div class="sp-header">
        <nav class="sp-crumbs" aria-label="Ścieżka notatek"></nav>
        <div class="sp-actions">
          <a class="sp-open" title="Otwórz w pełnym widoku" data-router-ignore>↗</a>
          <button class="sp-close" type="button" title="Zamknij (Esc)" aria-label="Zamknij panel">✕</button>
        </div>
      </div>
      <div class="sp-body"></div>`
    document.body.appendChild(panel)
    body = panel.querySelector(".sp-body")
    crumbs = panel.querySelector(".sp-crumbs")
    openFull = panel.querySelector(".sp-open")
    panel.querySelector(".sp-close")!.addEventListener("click", close)
  }

  const close = () => {
    stack = []
    panel?.classList.remove("open")
    panel?.setAttribute("aria-hidden", "true")
    document.body.classList.remove("side-panel-open")
  }

  const fetchDoc = async (u: string): Promise<Document> => {
    const res = await fetch(u)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return new DOMParser().parseFromString(await res.text(), "text/html")
  }

  const loadDoc = async (pageUrl: string): Promise<Document> => {
    const hit = cache.get(pageUrl)
    if (hit) return hit
    let doc = await fetchDoc(pageUrl)
    // Quartz zostawia strony-przekierowania (np. /Urologia/Ból-moszny -> /urologia/ból-moszny)
    if (!doc.querySelector("article")) {
      const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href")
      if (canonical) {
        const target = new URL(canonical, pageUrl)
        doc = await fetchDoc(target.origin + target.pathname)
        doc.documentElement.dataset.spBase = target.origin + target.pathname
      }
    }
    cache.set(pageUrl, doc)
    return doc
  }

  // Quartz używa linków względnych (../notatka) — po przeniesieniu treści
  // do innej strony trzeba je przepiąć na absolutne względem źródła.
  const rebase = (root: Element, base: string) => {
    root.querySelectorAll<HTMLElement>("[href]").forEach((el) => {
      const v = el.getAttribute("href")
      if (v && !v.startsWith("#")) el.setAttribute("href", new URL(v, base).href)
    })
    root.querySelectorAll<HTMLElement>("[src]").forEach((el) => {
      const v = el.getAttribute("src")
      if (v) el.setAttribute("src", new URL(v, base).href)
    })
  }

  const renderCrumbs = () => {
    if (!crumbs) return
    crumbs.innerHTML = ""
    stack.forEach((e, i) => {
      if (i > 0) crumbs!.append(Object.assign(document.createElement("span"), { className: "sp-sep", textContent: "›" }))
      const b = document.createElement("button")
      b.type = "button"
      b.className = "sp-crumb" + (i === stack.length - 1 ? " current" : "")
      b.textContent = e.title
      b.title = e.title
      b.addEventListener("click", () => {
        stack = stack.slice(0, i + 1)
        show(stack[i].url, false)
      })
      crumbs!.append(b)
    })
  }

  const scrollToHash = (hash: string) => {
    if (!body) return
    if (!hash) {
      body.scrollTop = 0
      return
    }
    const id = decodeURIComponent(hash.slice(1))
    const target = body.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`)
    if (!target) {
      body.scrollTop = 0
      return
    }
    // offsetTop liczy się od panelu (z nagłówkiem), więc liczymy względem .sp-body
    body.scrollTop += target.getBoundingClientRect().top - body.getBoundingClientRect().top - 12
    target.classList.add("sp-flash")
    setTimeout(() => target.classList.remove("sp-flash"), 1600)
  }

  const show = async (href: string, push: boolean) => {
    ensurePanel()
    const url = new URL(href)
    const pageUrl = url.origin + url.pathname
    panel!.classList.add("open", "loading")
    panel!.setAttribute("aria-hidden", "false")
    document.body.classList.add("side-panel-open")
    try {
      const doc = await loadDoc(pageUrl)
      const article = doc.querySelector("article")
      const title =
        doc.querySelector(".article-title")?.textContent?.trim() ||
        doc.title.split("|")[0].trim() ||
        url.pathname
      const content = document.createElement("div")
      content.className = "sp-content"
      const h = document.createElement("h1")
      h.className = "sp-title"
      h.textContent = title
      content.append(h)
      if (article) {
        const clone = article.cloneNode(true) as Element
        rebase(clone, doc.documentElement.dataset.spBase || pageUrl)
        content.append(clone)
      } else {
        content.append("Nie udało się wczytać treści notatki.")
      }
      body!.replaceChildren(content)
      openFull!.href = url.href
      if (push) {
        stack.push({ url: url.href, title })
      } else if (stack.length) {
        stack[stack.length - 1].url = url.href
      }
      renderCrumbs()
      requestAnimationFrame(() => scrollToHash(url.hash))
      // odszyfrowanie premium (encrypted-pages), UI paywalla, kalkulatory ```skala, popovery
      document.dispatchEvent(new CustomEvent("render"))
    } catch {
      body!.replaceChildren(
        Object.assign(document.createElement("p"), { textContent: "Nie udało się wczytać notatki. Spróbuj ponownie." }),
      )
    } finally {
      panel!.classList.remove("loading")
    }
  }

  const shouldHandle = (e: MouseEvent, a: HTMLAnchorElement): boolean => {
    if (window.innerWidth < MIN_WIDTH) return false
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false
    if (a.hasAttribute("data-router-ignore") || a.target === "_blank") return false
    const inPanel = !!a.closest("#side-panel .sp-body")
    const inArticle = !!a.closest("article")
    if (!inPanel && !inArticle) return false // menu, eksplorator, stopka itd. działają normalnie
    let url: URL
    try {
      url = new URL(a.href)
    } catch {
      return false
    }
    if (url.origin !== location.origin) return false
    if (SKIP_PREFIXES.some((p) => url.pathname.startsWith(p))) return false
    // kotwica na tej samej stronie (np. spis treści) — zwykłe przewinięcie
    if (!inPanel && url.pathname === location.pathname) return false
    return true
  }

  // Jeden nasłuch w fazie capture — wyprzedza router SPA Quartza
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a") as HTMLAnchorElement | null
      if (!a || !a.href) return
      if (a.closest("#side-panel .sp-header")) return
      // kotwica wewnątrz panelu (np. ikonka linku przy nagłówku) — przewiń panel
      const raw = a.getAttribute("href") || ""
      if (raw.startsWith("#") && a.closest("#side-panel .sp-body")) {
        e.preventDefault()
        e.stopPropagation()
        scrollToHash(raw)
        return
      }
      if (!shouldHandle(e, a)) return
      e.preventDefault()
      e.stopPropagation()
      const fromPanel = !!a.closest("#side-panel")
      if (!fromPanel) stack = [] // klik z głównej treści = nowa ścieżka
      show(a.href, true)
    },
    { capture: true },
  )

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel?.classList.contains("open")) close()
  })

  // zmiana strony przez router Quartza: zamknij panel
  document.addEventListener("nav", () => {
    close()
    cache.clear()
  })
}
