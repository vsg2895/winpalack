'use client'

import { useState } from 'react'
import { COPY } from '@/constants/copy'
import { useToast } from '@/components/ToastProvider'
import { isValidEmail } from '@/lib/email'

export default function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!isValidEmail(email)) {
      toast('Please enter a valid email address.', 'error')
      return
    }
    setLoading(true)
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
        toast(data.errors?.email?.[0] ?? data.message ?? COPY.newsletter.error, 'error')
        return
      }
      // Keep the form in place; confirm via a top-corner toast.
      toast(COPY.newsletter.success, 'success')
      setEmail('')
    } catch {
      toast(COPY.newsletter.error, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="font-display text-base font-semibold text-slate-900">{COPY.newsletter.title}</p>
        <p className="mt-0.5 text-sm text-slate-500">{COPY.newsletter.subtitle}</p>
      </div>

      <div className="w-full sm:w-auto">
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
            disabled={loading}
            className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.03] disabled:opacity-60"
          >
            {COPY.newsletter.button}
          </button>
        </form>
      </div>
    </div>
  )
}
