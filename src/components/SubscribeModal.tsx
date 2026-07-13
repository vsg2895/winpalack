'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { COPY } from '@/constants/copy'

// Browser-level throttling (no login, so we persist in cookies):
//  - After the modal is shown, we snooze it for 2 hours so a reload / new tab
//    doesn't re-open it — but it does come back on the next visit past 2h.
//  - If the visitor ticks "I already subscribed", we set a long-lived opt-out
//    cookie so the modal never opens again in this browser.
const SNOOZE_COOKIE = 'winpalack_sub_snooze'
const OPTOUT_COOKIE = 'winpalack_sub_optout'
const SNOOZE_SECONDS = 2 * 60 * 60 // 2 hours
const OPTOUT_SECONDS = 400 * 24 * 60 * 60 // ~400 days (browser max cookie lifetime)

// Routes where a "please subscribe" prompt makes no sense — the visitor is
// already acting on their subscription (confirming or opting out).
const EXCLUDED_PREFIXES = ['/verify', '/unsubscribe']

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`
}

function deleteCookie(name: string): void {
  setCookie(name, '', 0)
}

/**
 * Compact welcome modal that opens shortly after a page loads, inviting the
 * visitor to subscribe. Winpalack uses double opt-in, so it makes the verify
 * step explicit and reminds visitors to check their spam folder. Submits through
 * the same server route as the footer form (keeps API_SITE_KEY server-side).
 *
 * Open cadence is browser-based (see cookie constants above): once, then not for
 * 2 hours, and never again if the visitor says they already subscribed.
 */
export default function SubscribeModal() {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Don't prompt to subscribe on the verify / unsubscribe confirmation pages.
    if (EXCLUDED_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) return
    if (getCookie(OPTOUT_COOKIE)) return // visitor opted out — never show again
    if (getCookie(SNOOZE_COOKIE)) return // shown within the last 2 hours

    const timer = window.setTimeout(() => {
      setOpen(true)
      // Start the 2-hour snooze the moment it's shown, so a reload won't re-open it.
      setCookie(SNOOZE_COOKIE, '1', SNOOZE_SECONDS)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [pathname])

  function close(): void {
    setOpen(false)
    // Defensive: ensure the snooze is set even if closed before the timer wrote it.
    setCookie(SNOOZE_COOKIE, '1', SNOOZE_SECONDS)
  }

  function onAlreadySubscribed(checked: boolean): void {
    setAlreadySubscribed(checked)
    if (checked) {
      setCookie(OPTOUT_COOKIE, '1', OPTOUT_SECONDS) // never show again in this browser
    } else {
      deleteCookie(OPTOUT_COOKIE)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string
          errors?: { email?: string[] }
        }
        setErrorMsg(data.errors?.email?.[0] ?? data.message ?? COPY.newsletter.error)
        setStatus('error')
        return
      }
      setStatus('success')
      setEmail('')
      setFullName('')
      // They just subscribed here — don't prompt them again in this browser.
      setCookie(OPTOUT_COOKIE, '1', OPTOUT_SECONDS)
    } catch {
      setStatus('error')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribe-modal-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-500 px-6 py-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
            {COPY.newsletter.subtitle}
          </p>
          <h2 id="subscribe-modal-title" className="mt-1 font-display text-xl font-bold">
            {COPY.newsletter.title}
          </h2>
        </div>

        <div className="px-6 py-6">
          {status === 'success' ? (
            <div className="text-center">
              <p className="text-base font-semibold text-emerald-600">Almost there!</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We’ve sent a verification link to your inbox. Click it to confirm your email and start
                receiving our special offers.
              </p>
              <p className="mt-3 text-xs text-slate-400">
                Can’t find it? Please check your spam or promotions folder.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30"
              >
                Got it
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                Subscribe and <span className="font-semibold text-slate-900">verify your email</span> to
                receive our latest special offers and exclusive bonuses.
              </p>
              <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2.5">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your name (optional)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={COPY.newsletter.placeholder}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {COPY.newsletter.button}
                </button>
              </form>
              {status === 'error' && (
                <p className="mt-2 text-xs text-red-600">{errorMsg || COPY.newsletter.error}</p>
              )}
              <p className="mt-3 text-xs text-slate-400">
                📩 After subscribing, check your inbox (and spam folder) for the verification link.
              </p>

              <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={alreadySubscribed}
                  onChange={(e) => onAlreadySubscribed(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
                />
                I already subscribed — don’t show this again
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
