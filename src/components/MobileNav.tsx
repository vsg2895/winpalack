'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'

/**
 * The header menu on small screens.
 *
 * Replaces a horizontally scrolling nav bar. That bar fitted about two and a
 * half items on a phone and gave no indication the rest existed — "Countries"
 * and "Forum" were simply invisible unless the visitor happened to swipe a strip
 * of text sideways, which nobody does.
 *
 * PORTALLED to <body>, and not optionally: the header carries `backdrop-blur-xl`,
 * and an element with a backdrop-filter becomes the containing block for its
 * `position: fixed` descendants — so a panel rendered in place would resolve
 * `inset-0` against the 64px header and collapse. The search overlay hit exactly
 * this.
 *
 * Only rendered below `sm`; the inline nav takes over above it, so the two never
 * show at once.
 */

export type MobileNavLink = { href: string; label: string; external?: boolean }

export default function MobileNav({
  links,
  bonusSections = [],
  bonusEnabled = false,
  bonusLabel = 'Bonuses',
}: {
  links: MobileNavLink[]
  /** Categories under Bonus, already filtered server-side to those holding at
   *  least one visible offer. Empty means the whole entry is dropped. */
  bonusSections?: { slug: string; name: string }[]
  /** Whether this site publishes the Bonus area at all. With it off the menu
   *  keeps whatever link the editor authored instead. */
  bonusEnabled?: boolean
  bonusLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => setMounted(true), [])

  const close = useCallback(() => {
    setOpen(false)
    // Focus returns to the button that opened it, or a keyboard user is left at
    // the top of the document with no idea where they were.
    triggerRef.current?.focus()
  }, [])

  // Navigating closes the menu. Without this, tapping a link leaves the panel
  // covering the page it just loaded.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Escape, outside click, and a body scroll lock — all bound only while open,
  // so a closed menu costs nothing.
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !triggerRef.current?.contains(t)) close()
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)

    // Focus the PANEL, not the first link. Focusing a link paints a default
    // focus ring on it the moment the menu opens, which on a touch device reads
    // as "already selected". The panel is focusable only programmatically
    // (tabIndex -1), so the first link is still one Tab away and Escape/arrow
    // handling stays with the dialog.
    panelRef.current?.focus()

    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open, close])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {!open || !mounted
        ? null
        : createPortal(
            <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden />

              {/* Below the header, not over it: the close button stays where the
                  burger was, so the control does not move under the thumb. */}
              <div
                ref={panelRef}
                id="mobile-nav"
                role="dialog"
                aria-modal="true"
                aria-label="Site menu"
                tabIndex={-1}
                className="absolute inset-x-0 top-16 outline-none max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-slate-200 bg-white shadow-xl"
              >
                <nav aria-label="Main navigation">
                  <ul className="flex flex-col p-2" role="list">
                    {links.map(({ href, label, external }) =>
                      /* Bonus and its categories, matching the desktop dropdown and the
                         footer. Expanded inline rather than behind another tap: this panel
                         already scrolls, and burying two links behind an accordion inside a
                         menu the reader has just opened is a tap for nothing. */
                      href === '/special-offers' && bonusEnabled ? (
                        bonusSections.length === 0 ? null : (
                        <li key={href}>
                          <Link href={href} onClick={close} className="flex min-h-12 items-center rounded-xl px-4 text-[17px] font-semibold tracking-tight text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                            {bonusLabel}
                          </Link>
                          <ul role="list">
                            {bonusSections.map((section) => (
                              <li key={section.slug}>
                                <Link href={`/#bonus-${section.slug}`} onClick={close} className="flex min-h-11 items-center gap-2.5 rounded-xl py-2 pl-8 pr-4 text-[15px] font-semibold tracking-tight text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                                  {/* Takes its colour from the text, so it follows the hover
                                      state without a group variant — those have repeatedly
                                      failed to generate on this project. */}
                                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                                  {section.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        )
                      ) : (
                        <li key={href}>
                          {external || href.startsWith('http') ? (
                            <a
                              href={href}
                              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                              onClick={close}
                              className="flex min-h-12 items-center rounded-xl px-4 text-[17px] font-semibold tracking-tight text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                            >
                              {label}
                            </a>
                          ) : (
                            <Link href={href} onClick={close} className="flex min-h-12 items-center rounded-xl px-4 text-[17px] font-semibold tracking-tight text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                              {label}
                            </Link>
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                </nav>
              </div>
            </div>,
            document.body,
          )}
    </>
  )
}
