// Skrypt strony: zamienia bloki ```skala na interaktywne kalkulatory.
// Logika (parser + formularz) jest we wspólnym pliku skala-core.ts, który
// używa też plugin do Obsidiana (obsidian-plugin/mr-skala).
import { parseScale, build } from "./skala-core"

function isScaleBlock(pre: HTMLElement, code: HTMLElement): boolean {
  const lang = (
    pre.getAttribute("data-language") ||
    code.getAttribute("data-language") ||
    ""
  ).toLowerCase()
  if (lang === "skala") return true
  // zapasowo: dowolny blok, którego pierwsza niepusta linia to "skala: ..."
  const first = (code.textContent || "").split(/\r?\n/).find((l) => l.trim().length > 0)
  return !!first && /^skala\s*:/i.test(first.trim())
}

function scan() {
  document.querySelectorAll<HTMLElement>("pre").forEach((pre) => {
    const code = pre.querySelector("code") as HTMLElement | null
    if (!code || !isScaleBlock(pre, code)) return
    const scale = parseScale(code.textContent || "")
    if (!scale) return
    // rehype-pretty-code opakowuje <pre> w <figure data-rehype-pretty-code-figure>
    const target =
      pre.parentElement?.hasAttribute("data-rehype-pretty-code-figure") ? pre.parentElement : pre
    target.replaceWith(build(scale))
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
const skalaObserver = new MutationObserver(scheduleScan)
skalaObserver.observe(document.body, { childList: true, subtree: true })
document.addEventListener("nav", scheduleScan)
document.addEventListener("render", scheduleScan)
scan()

export {}
