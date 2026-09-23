'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface BonusMenuItem {
  slug: string
  name: string
}

/**
 * The Bonus parent in the header, with its categories as children.
 *
 * A CLIENT component, and only for the open/close. The children are real
 * <Link>s, so navigation, middle-click and "open in new tab" behave exactly as
 * they would on a flat menu item — the interactivity is the panel, nothing more.
 *
 * Positioned ABSOLUTE inside a relative <li>, deliberately not fixed. The header
 * carries `backdrop-blur-xl`, and a backdrop-filter makes an element a
 * containing block for fixed descendants — a fixed panel would be positioned
 * against the header rather than the viewport and collapse. Absolute inside the
 * item is unaffected by that, and is what a menu wants anyway.
 *
 * Renders NOTHING when no category qualifies. The children are filtered
 * server-side — BonusController drops any category with no visible offer on
 * this site — so an empty list means the site has no bonus content at all right
 * now, and the whole entry comes out of the menu rather than degrading to a
 * link. Hiding the last visible offer therefore removes its category on the
 * next revalidate, and hiding the last offer anywhere removes Bonuses itself.
 */
export default function BonusMenu({
  label,
  href,
  allLabel,
  items,
}: {
  label: string
  /** Where the parent itself goes — the full offers listing. */
  href: string
  /** Wording for that first entry. Passed in rather than derived from `label`,
   *  which produced "All bonus" — grammatical only by accident. */
  allLabel: string
  items: BonusMenuItem[]
}) {
  const [open, setOpen] = useState(false)
  // Separate from `open` so the panel can animate IN: it mounts at rest, then a
  // frame later flips to its visible state. Without the extra frame the browser
  // has nothing to transition FROM and the panel simply appears.
  const [shown, setShown] = useState(false)
  const wrapper = useRef<HTMLLIElement>(null)
  const pathname = usePathname()

  // Close on route change: the panel would otherwise survive navigation and
  // hang over the new page.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }

    const frame = requestAnimationFrame(() => setShown(true))

    function onPointerDown(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (items.length === 0) return null

  return (
    <li ref={wrapper} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`group relative flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-[15px] font-semibold tracking-tight transition-colors duration-200 xl:px-4 xl:text-base ${
          open ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
        }`}
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          /*
           * w-max, so the panel is as wide as its longest label and NEVER wraps.
           * A fixed min-width was the bug in the first version: "Special Offers"
           * broke onto two lines and the menu read as damaged. min-w keeps a
           * short list from looking pinched; max-w stops an absurd label from
           * running off the screen.
           *
           * The transition is INLINE rather than a utility class — this panel
           * only exists while open, so a class that failed to generate would
           * leave it stuck invisible with no way to notice.
           */
          className="absolute left-0 top-full z-50 mt-2 w-max min-w-[13rem] max-w-[20rem] overflow-hidden rounded-2xl bg-white p-1.5 ring-1 ring-slate-900/[0.07]"
          style={{
            opacity: shown ? 1 : 0,
            transform: shown ? 'translateY(0)' : 'translateY(-6px)',
            transition: 'opacity 150ms ease-out, transform 150ms ease-out',
            boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.22), 0 4px 12px -4px rgba(15, 23, 42, 0.08)',
          }}
        >
          <ul role="list">
            <li>
              {/* The parent's own destination stays reachable — a dropdown that
                  swallows its parent link loses the "all of them" page. Given
                  more weight than its children because it is the broader one. */}
              <Link
                href={href}
                className="flex items-center justify-between gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 transition-colors duration-150 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {allLabel}
                <span aria-hidden className="text-emerald-500">→</span>
              </Link>
            </li>

            <li aria-hidden className="mx-2 my-1.5 border-t border-slate-100" />

            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/#bonus-${item.slug}`}
                  className="flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {/* A quiet marker that takes its colour from the TEXT via
                      bg-current, so it turns emerald with the label on hover
                      without any variant at all.

                      It was `group-hover/item:bg-emerald-500`, and that named
                      group variant generated no CSS rule — verified by walking
                      the stylesheet and finding zero matching selectors, so the
                      dot never changed. Inheriting currentColor cannot fail the
                      same way: there is no second class that has to exist. */}
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}
