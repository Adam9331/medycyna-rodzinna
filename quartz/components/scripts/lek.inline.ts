// Skrypt strony: zamienia bloki ```lek i ```zalecenia na karty leków / zaleceń dla pacjenta.
// Logika (parser, kalkulator, budowa DOM) jest we wspólnym pliku lek-core.ts,
// używanym też przez plugin do Obsidiana (obsidian-plugin/mr-skala).
import { parseDrug, buildDrug, parseRecommendations, buildRecommendations } from "./lek-core"

function blockLanguage(pre: HTMLElement, code: HTMLElement): string {
  const attr = pre.getAttribute("data-language") || code.getAttribute("data-language") || ""
  if (attr) return attr.toLowerCase()
  const cls = (code.className || "").match(/language-([\w-]+)/)
  return cls ? cls[1].toLowerCase() : ""
}

function scan() {
  document.querySelectorAll<HTMLElement>("pre").forEach((pre) => {
    const code = pre.querySelector("code") as HTMLElement | null
    if (!code) return
    const lang = blockLanguage(pre, code)
    if (lang !== "lek" && lang !== "zalecenia") return
    const src = code.textContent || ""
    let built: HTMLElement | null = null
    if (lang === "lek") {
      const drug = parseDrug(src)
      built = drug ? buildDrug(drug) : null
    } else {
      const rec = parseRecommendations(src)
      built = rec ? buildRecommendations(rec) : null
    }
    if (!built) return // niepoprawny blok zostaje zwykłym blokiem kodu
    // rehype-pretty-code opakowuje <pre> w <figure data-rehype-pretty-code-figure>
    const target =
      pre.parentElement?.hasAttribute("data-rehype-pretty-code-figure") ? pre.parentElement : pre
    target.replaceWith(built)
  })
}

let scheduled = false
function scheduleScan() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    scan()
  })
}

// MutationObserver łapie też treść premium wstawianą po odszyfrowaniu
const lekObserver = new MutationObserver(scheduleScan)
lekObserver.observe(document.body, { childList: true, subtree: true })
document.addEventListener("nav", scheduleScan)
document.addEventListener("render", scheduleScan)
scan()

export {}
