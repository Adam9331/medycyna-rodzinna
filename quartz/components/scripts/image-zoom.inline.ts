// Powiększanie obrazków w treści notatek: kliknięcie otwiera podgląd,
// ale tylko dla obrazków, które są faktycznie pomniejszone na stronie
// (naturalna szerokość większa niż wyświetlana). Małe obrazki zostają bez zmian.
// Obsługa przez delegację zdarzeń, więc działa po nawigacji SPA i po odszyfrowaniu treści premium.

const SELECTOR = "article img"
const IGNORE = ".mr-skala, .mr-lightbox, nav, header, footer, .sidebar, .popover"

function isZoomable(img: HTMLImageElement): boolean {
  if (!img.complete || !img.naturalWidth) return false
  if (img.closest(IGNORE)) return false
  if (img.closest("a[href]")) return false
  const shown = img.clientWidth || img.width
  return img.naturalWidth > shown * 1.1
}

function closeLightbox() {
  document.querySelector(".mr-lightbox")?.remove()
  document.documentElement.classList.remove("mr-lightbox-open")
}

function openLightbox(src: string, alt: string) {
  closeLightbox()
  const overlay = document.createElement("div")
  overlay.className = "mr-lightbox"
  overlay.setAttribute("role", "dialog")
  overlay.setAttribute("aria-label", alt || "Powiększony obraz")
  const big = document.createElement("img")
  big.src = src
  big.alt = alt
  big.className = "mr-lightbox-img"
  // kliknięcie w obraz: przełącza dopasowanie do ekranu / rozmiar naturalny
  big.addEventListener("click", (e) => {
    e.stopPropagation()
    overlay.classList.toggle("mr-lightbox--full")
  })
  const close = document.createElement("button")
  close.type = "button"
  close.className = "mr-lightbox-close"
  close.setAttribute("aria-label", "Zamknij")
  close.textContent = "×"
  close.addEventListener("click", closeLightbox)
  overlay.addEventListener("click", closeLightbox)
  overlay.appendChild(big)
  overlay.appendChild(close)
  document.body.appendChild(overlay)
  document.documentElement.classList.add("mr-lightbox-open")
}

// kursor "zoom-in" tylko przy obrazkach, które da się powiększyć
document.addEventListener("mouseover", (e) => {
  const t = e.target as Element | null
  if (!t || !(t instanceof HTMLImageElement) || !t.matches(SELECTOR)) return
  t.dataset.zoomable = isZoomable(t) ? "1" : "0"
})

document.addEventListener("click", (e) => {
  const t = e.target as Element | null
  if (!t || !(t instanceof HTMLImageElement) || !t.matches(SELECTOR)) return
  if (!isZoomable(t)) return
  e.preventDefault()
  openLightbox(t.currentSrc || t.src, t.alt)
})

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox()
})
document.addEventListener("nav", closeLightbox)

export {}
