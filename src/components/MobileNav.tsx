'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
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
  bonusAllLabel = 'All Offers',
}: {
  links: MobileNavLink[]
  /** Categories under Bonus, already filtered server-side to those holding at
   *  least one visible offer. Empty means the whole entry is dropped. */
  bonusSections?: { slug: string; name: string }[]
  /** Whether this site publishes the Bonus area at all. With it off the menu
   *  keeps whatever link the editor authored instead. */
  bonusEnabled?: boolean
  bonusLabel?: string
  /** The parent's own destination, shown as the first row inside the group. */
  bonusAllLabel?: string
}) {
  const [open, setOpen] = useState(false)
  // The Bonus group, collapsed until asked for — the same disclosure the footer
  // uses, so the two menus behave identically on a phone. It used to render
  // expanded, which pushed Categories, Countries, Forum, News and Guides below
  // the fold the moment the menu opened.
  const [bonusOpen, setBonusOpen] = useState(false)
  // Stable across server and client render; Math.random() here would be a
  // guaranteed hydration mismatch on aria-controls.
  const bonusPanelId = `mobile-bonus-${useId()}`
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

  // Reopening the menu starts from the top: a group left expanded from last
  // time hides the links below it before the reader has asked for anything.
  useEffect(() => {
    if (!open) setBonusOpen(false)
  }, [open])

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
                      /* Bonus and its categories — a disclosure, exactly like the
                         footer's. Collapsed by default: this panel is the whole
                         menu on a phone, and six category rows opening
                         unbidden pushed every remaining link off the screen. */
                      href === '/special-offers' && bonusEnabled ? (
                        bonusSections.length === 0 ? null : (
                        <li key={href}>
                          <button
                            type="button"
                            aria-expanded={bonusOpen}
                            aria-controls={bonusPanelId}
                            onClick={() => setBonusOpen((v) => !v)}
                            className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-4 text-[17px] font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                              bonusOpen ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            {bonusLabel}
                            <svg
                              viewBox="0 0 20 20"
                              aria-hidden
                              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${bonusOpen ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" strokeWidth="2.25"
                            >
                              <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>

                          {/* Rendered only while open, so a collapsed group keeps
                              its links out of the tab order and the
                              accessibility tree. The rule down the left is what
                              says "these belong to Bonuses" — the same device the
                              footer uses. */}
                          {bonusOpen && (
                            <ul id={bonusPanelId} role="list" className="my-1 ml-4 flex flex-col border-l-2 border-emerald-100 pl-2">
                              <li>
                                {/* The parent's own page. A disclosure that
                                    swallows its parent link loses the "all of
                                    them" listing entirely — which is what this
                                    menu was doing. */}
                                <Link href={href} onClick={close} className="flex min-h-11 items-center rounded-xl px-4 text-[15px] font-bold tracking-tight text-slate-800 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                                  {bonusAllLabel}
                                </Link>
                              </li>
                              {bonusSections.map((section) => (
                                <li key={section.slug}>
                                  <Link href={`/#bonus-${section.slug}`} onClick={close} className="flex min-h-11 items-center gap-2.5 rounded-xl px-4 text-[15px] font-semibold tracking-tight text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">
                                    {/* Takes its colour from the text, so it follows the hover
                                        state without a group variant — those have repeatedly
                                        failed to generate on this project. */}
                                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                                    {section.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
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
