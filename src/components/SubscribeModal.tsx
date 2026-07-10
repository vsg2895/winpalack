'use client'

import { useEffect, useState } from 'react'
import { COPY } from '@/constants/copy'

// Shown once per browser session so returning visitors aren't nagged.
const SEEN_KEY = 'winpalack_subscribe_modal_seen'

/**
 * Compact welcome modal that opens shortly after a page loads, inviting the
 * visitor to subscribe. Winpalack uses double opt-in, so it makes the verify
 * step explicit and reminds visitors to check their spam folder. Submits through
 * the same server route as the footer form (keeps API_SITE_KEY server-side).
 */
export default function SubscribeModal() {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SEEN_KEY)) return
    const timer = window.setTimeout(() => setOpen(true), 900)
    return () => window.clearTimeout(timer)
  }, [])

  function close() {
    setOpen(false)
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* private mode — best effort */
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
