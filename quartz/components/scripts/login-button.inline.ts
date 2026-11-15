// Mały przycisk "Zaloguj się" / "Moje konto" nad tytułem strony w lewym panelu.
// Prowadzi do strony logowania/płatności (/static/app/), która pokazuje też
// status subskrypcji zalogowanego użytkownika, więc działa jako "Moje konto".

const LOGIN_URL = "/static/app/"
let signedIn = false

function applyLabel() {
  const btn = document.querySelector<HTMLElement>(".mr-login-btn")
  if (!btn) return
  const label = btn.querySelector(".mr-login-label")
  if (label) label.textContent = signedIn ? "Moje konto" : "Zaloguj się"
  btn.classList.toggle("mr-login-btn--account", signedIn)
}

const ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>'

function ensureButton() {
  const anchor = document.querySelector<HTMLElement>(
    ".left .page-title, .sidebar.left .page-title, .page-title, .search",
  )
  if (!anchor || !anchor.parentElement) return
  if (document.querySelector(".mr-login-btn")) return
  const a = document.createElement("a")
  a.className = "mr-login-btn"
  a.href = LOGIN_URL
  a.setAttribute("aria-label", "Zaloguj się lub zarządzaj kontem")
  a.innerHTML = `${ICON}<span class="mr-login-label"></span>`
  anchor.insertAdjacentElement("beforebegin", a)
  applyLabel()
}

let scheduled = false
function schedule() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    ensureButton()
  })
}

// stan sesji ustawia premium-unlock.inline.ts po załadowaniu Clerka
document.addEventListener("mr-auth", (e) => {
  signedIn = !!(e as CustomEvent<{ signedIn: boolean }>).detail?.signedIn
  applyLabel()
})
document.addEventListener("nav", schedule)
document.addEventListener("render", schedule)
new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
ensureButton()

export {}
