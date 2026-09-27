// Nakłada na domyślny (angielski, gołe pole na hasło) ekran blokady
// @quartz-community/encrypted-pages własną nakładkę w stylu mp.pl: rozmyty
// "podgląd" tekstu, który się urywa, i kartę z CTA "Zaloguj się" prowadzącą
// do /static/app/. Prawdziwe pole na hasło zostaje w DOM (potrzebuje go
// skrypt encrypted-pages), ale jest schowane pod mały link "Mam kod
// dostępu" — normalny użytkownik nigdy go nie używa, bo premium-unlock.
// inline.ts wpisuje hasło automatycznie po zalogowaniu i potwierdzeniu
// aktywnej subskrypcji.

const ENHANCED_ATTR = "data-mr-paywall"
const SKELETON_WIDTHS = [96, 100, 88, 97, 74, 91, 60]

function buildSkeleton(): string {
  const lines = SKELETON_WIDTHS.map(
    (w) => `<div class="mr-paywall-line" style="width:${w}%"></div>`,
  ).join("")
  return `<div class="mr-paywall-skeleton" aria-hidden="true">${lines}</div>`
}

function buildCard(): string {
  return `
    <div class="mr-paywall-card">
      <p class="mr-paywall-eyebrow">Treść premium</p>
      <h3 class="mr-paywall-title">Zobacz pełną zawartość</h3>
      <p class="mr-paywall-text">Ten materiał jest dostępny wyłącznie dla zalogowanych subskrybentów Medycyny Rodzinnej.</p>
      <a class="mr-paywall-cta" href="/static/app/" data-router-ignore>Zaloguj się</a>
      <p class="mr-paywall-sub">Nie masz konta? <a href="/static/app/" data-router-ignore>Wykup subskrypcję</a></p>
      <button type="button" class="mr-paywall-manual-toggle">Mam kod dostępu</button>
    </div>
  `
}

function enhance(container: Element) {
  if (container.hasAttribute(ENHANCED_ATTR)) return
  const form = container.querySelector(".encrypted-page-form")
  if (!form) return
  container.setAttribute(ENHANCED_ATTR, "true")

  const icon = form.querySelector(".encrypted-page-icon") as HTMLElement | null
  const label = form.querySelector(".encrypted-page-label") as HTMLElement | null
  const inputRow = form.querySelector(".encrypted-page-input-row") as HTMLElement | null

  // chowamy oryginalny (angielski) prompt, ale zostawiamy go w DOM
  if (icon) icon.style.display = "none"
  if (label) {
    label.textContent = "Wpisz kod dostępu, aby zobaczyć treść."
    label.style.display = "none"
  }
  if (inputRow) inputRow.style.display = "none"

  const wrapper = document.createElement("div")
  wrapper.className = "mr-paywall-wrapper"
  wrapper.innerHTML = buildSkeleton() + buildCard()
  form.prepend(wrapper)

  const toggle = wrapper.querySelector(".mr-paywall-manual-toggle")
  toggle?.addEventListener("click", () => {
    wrapper.querySelector(".mr-paywall-card")?.classList.add("mr-paywall-card--hidden")
    wrapper.querySelector(".mr-paywall-skeleton")?.classList.add("mr-paywall-card--hidden")
    if (label) label.style.display = ""
    if (inputRow) inputRow.style.display = ""
    const input = inputRow?.querySelector(".encrypted-page-input") as HTMLElement | null
    input?.focus()
  })
}

// Link "Zaloguj się" w stopce (z pluginu @quartz-community/footer) trafia w
// zwykły SPA-router Quartza, który próbuje go pobrać i "wmorfować" w
// bieżącą stronę — a to osobna, statyczna strona logowania Clerk, więc
// morph się wiesza i widać pusty biały ekran. data-router-ignore każe
// routerowi zostawić link w spokoju (normalne, pełne przeładowanie).
function patchLoginLinks() {
  document.querySelectorAll<HTMLAnchorElement>('a[href="/static/app/"]').forEach((a) => {
    if (!a.hasAttribute("data-router-ignore")) a.setAttribute("data-router-ignore", "")
  })
}

function scanAndEnhance() {
  patchLoginLinks()
  document.querySelectorAll(".encrypted-page").forEach((el) => enhance(el))
}

// niezależnie od kolejności rejestracji nasłuchów, MutationObserver złapie
// formularz w chwili, gdy skrypt encrypted-pages go doda do DOM
const paywallObserver = new MutationObserver(() => scanAndEnhance())
paywallObserver.observe(document.body, { childList: true, subtree: true })

document.addEventListener("nav", scanAndEnhance)
document.addEventListener("render", scanAndEnhance)
scanAndEnhance()

export {}
