'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { COPY } from '@/constants/copy'

/**
 * Sign in / create account.
 *
 * One component with two modes rather than two pages: the fields overlap almost
 * entirely and a visitor who guessed wrong should switch without losing what
 * they typed.
 *
 * The token never reaches this component. `/api/forum/auth/login` puts it
 * straight into an httpOnly cookie and returns only the member — so there is
 * nothing here for a stored-XSS bug to steal.
 */
type Mode = 'signin' | 'register'

export default function AccountForm({ next, initialMode = 'signin' }: { next?: string; initialMode?: Mode }) {
  const router = useRouter()
  // The header's "Create an account" entry links to ?mode=register, so the form
  // opens on the tab the visitor actually asked for.
  const [mode, setMode] = useState<Mode>(initialMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setFieldErrors({})
    setBusy(true)

    const form = new FormData(e.currentTarget)

    try {
      if (mode === 'signin') {
        const res = await fetch('/api/forum/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
        })

        const json = (await res.json().catch(() => ({}))) as { message?: string }

        if (!res.ok) {
          setError(json.message ?? 'Could not sign in.')
          return
        }

        // A full refresh, not a client-side state flip: the article page decides
        // between the reply form and the sign-in prompt on the SERVER, from the
        // cookie. Only a refresh re-runs that decision.
        router.replace(next || '/forum')
        router.refresh()
        return
      }

      const res = await fetch('/api/forum/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.get('display_name'),
          email: form.get('email'),
          password: form.get('password'),
          password_confirmation: form.get('password_confirmation'),
          website: form.get('website') ?? '',
        }),
      })

      const json = (await res.json().catch(() => ({}))) as {
        data?: { message?: string }
        message?: string
        errors?: Record<string, string[]>
      }

      if (!res.ok) {
        setFieldErrors(json.errors ?? {})
        setError(json.message ?? 'Could not create that account.')
        return
      }

      setNotice(json.data?.message ?? 'Check your email to confirm your address.')
    } catch {
      setError('Something went wrong. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30'

  function errorFor(name: string) {
    return fieldErrors[name]?.[0]
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {/* Radio-style mode switch, keyboard operable as ordinary buttons. */}
      <div className="mb-5 flex gap-1 rounded-full bg-slate-100 p-1" role="group" aria-label="Account">
        {(['signin', 'register'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => { setMode(m); setError(null); setNotice(null); setFieldErrors({}) }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === 'register' && (
          <div>
            <label htmlFor="display_name" className="mb-1 block text-xs font-semibold text-slate-700">
              Display name
            </label>
            <input id="display_name" name="display_name" required minLength={2} maxLength={60} className={field} />
            {errorFor('display_name') && <p className="mt-1 text-xs text-red-600">{errorFor('display_name')}</p>}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
          <input
            id="email" name="email" type="email" required autoComplete="email"
            aria-invalid={errorFor('email') ? true : undefined} className={field}
          />
          {errorFor('email') && <p className="mt-1 text-xs text-red-600">{errorFor('email')}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-semibold text-slate-700">Password</label>
          <input
            id="password" name="password" type="password" required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            aria-invalid={errorFor('password') ? true : undefined} className={field}
          />
          {errorFor('password') && <p className="mt-1 text-xs text-red-600">{errorFor('password')}</p>}
          {mode === 'register' && !errorFor('password') && (
            <p className="mt-1 text-xs text-slate-400">
              At least 12 characters, with upper and lower case, a number and a symbol.
            </p>
          )}
        </div>

        {mode === 'register' && (
          <>
            <div>
              <label htmlFor="password_confirmation" className="mb-1 block text-xs font-semibold text-slate-700">
                Confirm password
              </label>
              <input
                id="password_confirmation" name="password_confirmation" type="password"
                required autoComplete="new-password" className={field}
              />
            </div>

            {/* Honeypot — inline styles, never a utility class: a Tailwind class
                that fails to generate turns this into a visible input that
                rejects real people as bots. That has happened on this project
                before, on the subscribe form. */}
            <div aria-hidden style={{ position: 'absolute', left: '-9999px', width: 0, height: 0, overflow: 'hidden' }}>
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
          </>
        )}

        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
