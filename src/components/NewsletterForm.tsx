'use client'

import { useState } from 'react'
import { COPY } from '@/constants/copy'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        // Surface backend validation (e.g. 422 "You are already subscribed.").
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
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="font-display text-base font-semibold text-slate-900">{COPY.newsletter.title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{COPY.newsletter.subtitle}</p>
      </div>

      <div className="w-full sm:w-auto">
        {status === 'success' ? (
          <p className="text-sm font-medium text-emerald-600">{COPY.newsletter.success}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={COPY.newsletter.placeholder}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:w-72"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.03] disabled:opacity-60"
            >
              {COPY.newsletter.button}
            </button>
          </form>
        )}
        {status === 'error' && <p className="mt-2 text-xs text-red-600">{errorMsg || COPY.newsletter.error}</p>}
      </div>
    </div>
  )
}
