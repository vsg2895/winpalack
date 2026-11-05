'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { CONSENT_STORAGE_KEY as STORAGE_KEY, CONSENT_VERSION } from '@/lib/consent'
import { updateAnalyticsConsent } from '@/lib/ga'

// Persisted consent record: key and version live in lib/consent.ts, because
// ConsentModeScript reads the same record before gtag.js loads.

type Choice = 'all' | 'necessary'

// A tiny external store lets the banner reflect persisted consent without
// running setState inside an effect (and without a hydration mismatch).
const listeners = new Set<() => void>()

// When true the banner is shown even if consent already exists — set by the
// footer "Cookie settings" link so visitors can review or withdraw consent.
let forced = false

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

// Global Privacy Control: the browser-level "do not sell or share" signal. The
// Privacy Policy says it is honoured as an opt-out, and nothing read it — so a
// visitor who had already said no was still asked, with Accept All on offer.
// It stands in for a "necessary only" answer until the visitor gives one
// themselves; reopening the banner from the footer still lets them choose.
function gpcOptOut(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}

// true ⇒ show the banner (first visit, consent version changed, or reopened).
function shouldShow(): boolean {
  if (forced) return true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return !gpcOptOut()
    const parsed = JSON.parse(raw) as { v?: number }
    return parsed?.v !== CONSENT_VERSION
  } catch {
    return true
  }
}

// On the server the banner never renders — it's a client-only, first-visit UI.
function shouldShowServer(): boolean {
  return false
}

function recordConsent(choice: Choice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, v: CONSENT_VERSION, ts: Date.now() }))
    // Mirror the choice into a first-party cookie so the server/analytics can read it.
    // `Secure` on https — every live domain — so the record of a visitor's
    // choice never travels over plain http; omitted on a plain-http dev server,
    // where some browsers refuse to set a Secure cookie at all.
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `cookie_consent=${choice}; path=/; max-age=31536000; SameSite=Lax${secure}`
  } catch {
    /* storage unavailable — still dismiss for this session */
  }
  // Outside the try: a choice made with storage blocked still applies to this page.
  updateAnalyticsConsent(choice === 'all')
  forced = false
  listeners.forEach((notify) => notify())
}

/** Reopen the consent banner — used by the footer "Cookie settings" link. */
export function openCookieSettings(): void {
  forced = true
  listeners.forEach((notify) => notify())
}

/**
 * What the visitor chose, or null if they have not chosen yet (or chose under an
 * older CONSENT_VERSION, which counts as "not chosen" — the banner re-prompts
 * them, so nothing may be granted on the strength of the stale record).
 *
 * Read by the analytics bridge. Deliberately a separate export from the banner's
 * own `shouldShow` snapshot: "show the banner" and "what did they consent to"
 * are different questions, and conflating them is how a reopened banner would
 * look like a withdrawal of consent.
 */
export function getConsentChoice(): Choice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { choice?: Choice; v?: number }
    if (parsed?.v !== CONSENT_VERSION) return null

    return parsed.choice === 'all' || parsed.choice === 'necessary' ? parsed.choice : null
  } catch {
    // Storage blocked (private mode, cookies disabled). No record means no
    // consent — the safe direction.
    return null
  }
}

/**
 * Subscribe to consent changes, reusing the banner's existing listener set so a
 * click on "Accept All" reaches analytics in the same tick it reaches the UI.
 * That is what makes mid-session consent work without a page reload.
 */
export function subscribeToConsent(onChange: () => void): () => void {
  return subscribe(onChange)
}

export default function CookieConsent() {
  const visible = useSyncExternalStore(subscribe, shouldShow, shouldShowServer)

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-100 bg-white p-5 shadow-2xl sm:flex sm:items-center sm:gap-6">
        <div className="min-w-0">
          <p id="cookie-consent-title" className="text-sm font-bold text-zinc-900">We value your privacy</p>
          {/* Says what this site really sets: Google Analytics cookies only after
              "Accept All" (Consent Mode — see ConsentModeScript). If GA ever loads
              with storage granted before a choice again, this text must change too. */}
          <p id="cookie-consent-desc" className="mt-1 text-sm leading-relaxed text-zinc-600">
            We use essential cookies. With your consent, Google Analytics also sets cookies to measure how the
            site is used. We set no advertising cookies. Read our{' '}
            <Link href="/cookie-policy" className="font-semibold text-emerald-600 underline hover:text-emerald-700">
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
          <button
            type="button"
            onClick={() => recordConsent('necessary')}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Reject Non-Essential
          </button>
          <button
            type="button"
            onClick={() => recordConsent('all')}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}
