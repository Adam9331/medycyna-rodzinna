// Zwijanie nagłówków w trybie czytania Obsidiana – oparte na NATYWNYM zwijaniu
// nagłówków Obsidiana (strzałka przy nagłówku), które radzi sobie z leniwym
// renderowaniem długich notatek. Nie przenosimy ani nie ukrywamy żadnych bloków sami.
//
// Wtyczka tylko:
//  1) włącza w Obsidianie opcję „Zwijaj nagłówki”,
//  2) domyślnie zwija nagłówki (także te doczytywane później) – dopóki nie klikniesz
//     „Rozwiń wszystko”,
//  3) dodaje przyciski „Rozwiń wszystko / Zwiń wszystko” w nagłówku notatki.
//
// Na stronie (medycynarodzinna.info) działa osobny skrypt sekcje.inline.ts – bez zmian.

import { Plugin } from "obsidian"

const MIN_HEADINGS = 2
const SIZER = ".markdown-preview-view .markdown-preview-sizer"
const SKIP_CONTAINER = ".markdown-embed, .hover-popover, .popover, .canvas-node"
const INDICATOR = ".heading-collapse-indicator"

type State = { mode: "collapse" | "open"; handled: Set<string> }
const states = new WeakMap<HTMLElement, State>()

function stateOf(s: HTMLElement): State {
  let st = states.get(s)
  if (!st) {
    st = { mode: "collapse", handled: new Set() }
    states.set(s, st)
  }
  return st
}

function indicators(sizer: HTMLElement): HTMLElement[] {
  return Array.from(sizer.querySelectorAll<HTMLElement>(INDICATOR))
}

function isCollapsed(ind: HTMLElement): boolean {
  return (
    ind.classList.contains("is-collapsed") ||
    !!ind.parentElement?.classList.contains("is-collapsed")
  )
}

function keyOf(ind: HTMLElement): string {
  const h = ind.closest("[data-heading]")
  const text = ((h && h.getAttribute("data-heading")) || ind.parentElement?.textContent || "").trim()
  const tag = ind.closest("h1,h2,h3,h4,h5,h6")?.tagName || ""
  return `${tag}:${text}`
}

function applyDefault(sizer: HTMLElement) {
  const st = stateOf(sizer)
  const inds = indicators(sizer)
  if (st.mode === "collapse") {
    for (const ind of inds) {
      const k = keyOf(ind)
      if (st.handled.has(k)) continue
      st.handled.add(k)
      if (!isCollapsed(ind)) ind.click()
    }
  }
  ensureBar(sizer, inds.length)
}

function ensureBar(sizer: HTMLElement, count: number) {
  const existing = sizer.querySelector(".mr-sec-bar")
  if (count < MIN_HEADINGS) {
    existing?.remove()
    return
  }
  if (existing) return
  const bar = document.createElement("div")
  bar.className = "mr-sec-bar"
  const mk = (label: string, open: boolean) => {
    const b = document.createElement("button")
    b.type = "button"
    b.className = "mr-sec-bar-btn"
    b.textContent = label
    b.addEventListener("click", () => {
      const st = stateOf(sizer)
      st.mode = open ? "open" : "collapse"
      st.handled.clear()
      // rozwijanie: od góry (rodzic odsłania dzieci); zwijanie: też od góry
      for (const ind of indicators(sizer)) {
        st.handled.add(keyOf(ind))
        if (isCollapsed(ind) === open) ind.click()
      }
    })
    return b
  }
  bar.appendChild(mk("Rozwiń wszystko", true))
  bar.appendChild(mk("Zwiń wszystko", false))
  const header = sizer.querySelector(":scope > .mod-header")
  if (header) header.appendChild(bar)
  else sizer.insertBefore(bar, sizer.querySelector(":scope > div:not(.markdown-preview-pusher)"))
}

function removeAll(sizer: HTMLElement) {
  sizer.querySelectorAll(".mr-sec-bar").forEach((b) => b.remove())
  states.delete(sizer)
}

export function startSections(plugin: Plugin, isEnabled: () => boolean) {
  const app = plugin.app as any
  let scheduled = false

  const enableNativeFolding = () => {
    try {
      if (app.vault?.getConfig?.("foldHeading") !== true) {
        app.vault?.setConfig?.("foldHeading", true)
        // przerysuj widoki czytania, żeby pojawiły się strzałki przy nagłówkach
        app.workspace?.getLeavesOfType?.("markdown")?.forEach((l: any) => {
          l.view?.previewMode?.rerender?.(true)
        })
      }
    } catch (e) {
      console.error("mr-skala: nie udało się włączyć zwijania nagłówków", e)
    }
  }

  const run = () => {
    scheduled = false
    try {
      if (!isEnabled()) return
      document.querySelectorAll<HTMLElement>(SIZER).forEach((s) => {
        if (s.closest(SKIP_CONTAINER)) return
        applyDefault(s)
      })
    } catch (e) {
      console.error("mr-skala: zwijanie nagłówków", e)
    }
  }
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    window.requestAnimationFrame(run)
  }

  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      const t = m.target as HTMLElement
      if (t.closest && t.closest(".mr-sec-bar")) continue
      schedule()
      return
    }
  })
  obs.observe(document.body, { childList: true, subtree: true })
  plugin.register(() => obs.disconnect())
  plugin.registerEvent(plugin.app.workspace.on("layout-change", schedule))
  plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", schedule))

  if (isEnabled()) enableNativeFolding()
  schedule()

  return {
    refresh: () => {
      if (isEnabled()) {
        enableNativeFolding()
        schedule()
      } else {
        document.querySelectorAll<HTMLElement>(SIZER).forEach((s) => removeAll(s))
      }
    },
  }
}
