// Duży przycisk "Zaloguj się" pod wyszukiwarką w lewym panelu.
// Prowadzi do strony logowania/płatności (/static/app/), która pokazuje też
// status subskrypcji zalogowanego użytkownika, więc działa jako "Moje konto".

const LOGIN_URL = "/static/app/"

function ensureButton() {
  const search = document.querySelector<HTMLElement>(".left .search, .sidebar.left .search, .search")
  if (!search || !search.parentElement) return
  if (document.querySelector(".mr-login-btn")) return
  const a = document.createElement("a")
  a.className = "mr-login-btn"
  a.href = LOGIN_URL
  a.textContent = "Zaloguj się"
  a.setAttribute("aria-label", "Zaloguj się lub zarządzaj kontem")
  search.insertAdjacentElement("afterend", a)
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

document.addEventListener("nav", schedule)
document.addEventListener("render", schedule)
new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
ensureButton()

export {}
