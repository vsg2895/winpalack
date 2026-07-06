'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'

// Persisted consent record. Bump CONSENT_VERSION to re-prompt everyone after a
// material change to the Cookie Policy.
const STORAGE_KEY = 'cookie-consent'
const CONSENT_VERSION = 1

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

// true ⇒ show the banner (first visit, consent version changed, or reopened).
function shouldShow(): boolean {
  if (forced) return true
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return true
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
    document.cookie = `cookie_consent=${choice}; path=/; max-age=31536000; SameSite=Lax`
  } catch {
    /* storage unavailable — still dismiss for this session */
  }
  forced = false
  listeners.forEach((notify) => notify())
}

/** Reopen the consent banner — used by the footer "Cookie settings" link. */
export function openCookieSettings(): void {
  forced = true
  listeners.forEach((notify) => notify())
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
          <p id="cookie-consent-desc" className="mt-1 text-sm leading-relaxed text-zinc-600">
            We use cookies for essential site functions and, with your consent, for analytics and affiliate
            attribution. Read our{' '}
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
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={() => recordConsent('all')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
