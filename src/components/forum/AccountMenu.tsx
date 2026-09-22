'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * The account control in the header: an icon that opens a small menu.
 *
 * A CLIENT component, and only for the open/close — the entries are real
 * <Link>s, so middle-click and "open in new tab" behave normally. Which entries
 * it shows is decided on the SERVER by HeaderAccount, which reads the session
 * cookie; this component never learns who is signed in beyond the props it is
 * handed.
 *
 * Positioned ABSOLUTE inside a relative wrapper, not fixed: the header carries
 * `backdrop-blur-xl`, and a backdrop-filter makes an element a containing block
 * for fixed descendants — a fixed panel would position against the header
 * rather than the viewport. Same reason as BonusMenu.
 */
export interface AccountMenuEntry {
  href: string
  label: string
  /** Rendered heavier, for the primary action in the group. */
  primary?: boolean
}

export default function AccountMenu({
  entries,
  label,
  initial,
  badge,
  signOut = false,
}: {
  entries: AccountMenuEntry[]
  /** Screen-reader name for the trigger, and the signed-in display name. */
  label: string
  /** First letter of a signed-in member's name; absent for a guest. */
  initial?: string
  badge?: string | null
  signOut?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }

    // A frame's delay so the panel has something to transition FROM.
    const frame = requestAnimationFrame(() => setShown(true))

    function onPointerDown(e: MouseEvent) {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleSignOut() {
    await fetch('/api/forum/auth/logout', { method: 'POST', credentials: 'same-origin' })
    // A full reload, not router.refresh(): the header's signed-in state is
    // decided on the server from the cookie, and the cookie has just changed.
    window.location.reload()
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={initial ? `Account: ${label}` : 'Sign in or create an account'}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold transition-colors ${
          open ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
        }`}
      >
        {initial ? (
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-display text-xs font-bold text-emerald-700"
          >
            {initial}
          </span>
        ) : (
          // The signed-out mark: a person on the brand's emerald→teal disc,
          // the same gradient the primary buttons use, so the control reads
          // as "join us" rather than as a generic settings glyph. Inline SVG,
          // no image request. Decorative — aria-label on the button names it.
          <svg viewBox="0 0 32 32" aria-hidden className="h-8 w-8 shrink-0 drop-shadow-[0_2px_4px_rgba(16,185,129,0.35)]">
            <defs>
              <linearGradient id="acct-disc" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#10b981" />
                <stop offset="1" stopColor="#14b8a6" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="15" fill="url(#acct-disc)" />
            <circle cx="16" cy="12.5" r="4.6" fill="#ffffff" />
            <path d="M7.5 25.5a8.5 8.5 0 0 1 17 0" fill="#ffffff" />
            {/* A small "+" badge: the control's job is to sign up as much as to sign in. */}
            <circle cx="24.5" cy="24" r="5.2" fill="#ffffff" />
            <circle cx="24.5" cy="24" r="4.2" fill="#059669" />
            <path d="M24.5 21.6v4.8M22.1 24h4.8" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}

        {initial && <span className="hidden max-w-24 truncate sm:inline">{label}</span>}

        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2.25"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          /* Right-anchored: this is the last control in the header, so a
             left-anchored panel would run off the edge on a narrow viewport.
             The transition is INLINE rather than a utility class — the panel
             exists only while open, so a class that failed to generate would
             leave it stuck invisible with nothing to notice it by. */
          className="absolute right-0 top-full z-50 mt-2 w-max min-w-[13rem] overflow-hidden rounded-2xl bg-white p-1.5 ring-1 ring-slate-900/[0.07]"
          style={{
            opacity: shown ? 1 : 0,
            transform: shown ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 150ms ease-out, transform 150ms ease-out',
            boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.22), 0 4px 12px -4px rgba(15, 23, 42, 0.08)',
          }}
        >
          {initial && (
            <div className="border-b border-slate-100 px-3.5 pb-2 pt-1.5">
              <p className="truncate text-sm font-bold text-slate-900">{label}</p>
              {badge && <p className="mt-0.5 text-xs font-semibold text-amber-700">{badge}</p>}
            </div>
          )}

          <ul role="none" className="pt-1">
            {entries.map((entry) => (
              <li key={entry.href} role="none">
                <Link
                  role="menuitem"
                  href={entry.href}
                  className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm transition-colors duration-150 hover:bg-emerald-50 hover:text-emerald-700 ${
                    entry.primary ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'
                  }`}
                >
                  {entry.label}
                  {entry.primary && <span aria-hidden className="text-emerald-500">→</span>}
                </Link>
              </li>
            ))}

            {signOut && (
              <li role="none">
                <button
                  role="menuitem"
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold text-slate-600 transition-colors duration-150 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  Sign out
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
