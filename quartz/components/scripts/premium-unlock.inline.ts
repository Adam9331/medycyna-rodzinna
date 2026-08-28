// Globalny skrypt uruchamiany na każdej stronie (dodany do afterDOMLoaded przez
// componentResources.ts). Jeśli odwiedzający jest zalogowany przez Clerk i przeszedł
// weryfikację 2FA (sessionStorage.emailVerified === "true"), pyta checkSubscription
// o status subskrypcji. Jeśli aktywna — wrzuca zwrócone hasło premium do sessionStorage
// w formacie, którego oczekuje @quartz-community/encrypted-pages, i każe mu spróbować
// odszyfrować stronę ponownie. Użytkownik nigdy nie widzi/wpisuje hasła ręcznie.

declare global {
  interface Window {
    Clerk?: {
      load: (options?: unknown) => Promise<void>
      session?: {
        getToken: () => Promise<string | null>
      } | null
    }
  }
}

const CLERK_FRONTEND_API = "tough-walrus-9689.clerk.accounts.dev"
const CLERK_PUBLISHABLE_KEY = "pk_test_dG91Z2gtd2FscnVzLTk2ODkuY2xlcmsuYWNjb3VudHMuZGV2JA"
const CHECK_SUBSCRIPTION_URL = "https://checksubscription-zxtlz2nofa-uc.a.run.app"
const ENCRYPTED_PAGES_PASSWORD_KEY = "encrypted-pages-passwords"
const EMAIL_VERIFIED_KEY = "emailVerified"

function loadClerkScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Clerk) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-clerk-publishable-key]",
    )
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Nie udało się załadować Clerk")))
      return
    }
    const script = document.createElement("script")
    script.async = true
    script.crossOrigin = "anonymous"
    script.setAttribute("data-clerk-publishable-key", CLERK_PUBLISHABLE_KEY)
    script.src = `https://${CLERK_FRONTEND_API}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`
    script.addEventListener("load", () => resolve())
    script.addEventListener("error", () => reject(new Error("Nie udało się załadować Clerk")))
    document.head.appendChild(script)
  })
}

function cachePremiumPassword(password: string) {
  try {
    const raw = sessionStorage.getItem(ENCRYPTED_PAGES_PASSWORD_KEY)
    let list: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) list = []
    const passwords = list as string[]
    if (!passwords.includes(password)) {
      passwords.push(password)
      sessionStorage.setItem(ENCRYPTED_PAGES_PASSWORD_KEY, JSON.stringify(passwords))
    }
  } catch {
    // sessionStorage niedostępny (np. tryb prywatny) — pomijamy po cichu
  }
}

async function unlockPremiumContent() {
  try {
    await loadClerkScript()
    await window.Clerk!.load()

    const session = window.Clerk!.session
    if (!session) return // niezalogowany przez Clerk
    if (sessionStorage.getItem(EMAIL_VERIFIED_KEY) !== "true") return // 2FA jeszcze niepotwierdzone

    const token = await session.getToken()
    if (!token) return

    const response = await fetch(CHECK_SUBSCRIPTION_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return

    const data = await response.json()
    if (data.subscriptionActive && data.password) {
      cachePremiumPassword(data.password)
      // każe encrypted-pages spróbować ponownie odszyfrować bieżącą stronę
      document.dispatchEvent(new CustomEvent("render"))
    }
  } catch (err) {
    console.error("Premium unlock: nie udało się sprawdzić subskrypcji", err)
  }
}

unlockPremiumContent()

export {}
