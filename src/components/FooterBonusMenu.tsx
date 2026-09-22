'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface FooterBonusMenuItem {
  slug: string
  name: string
}

/**
 * The Bonus group in the footer — an inline disclosure, not a floating panel.
 *
 * ── Why this is NOT the header's dropdown ───────────────────────────────────
 *
 * The header's BonusMenu is absolutely positioned: it floats over the page
 * because a sticky bar has no room to grow and pushing the page down on every
 * hover would be intolerable.
 *
 * A footer has the opposite constraint. It is the end of the document, there is
 * nothing below it to obscure, and a panel floating over the links above it
 * covers the very list the reader is using. So this one expands IN FLOW: the
 * categories appear directly beneath "Bonus" and the remaining links — Categories,
 * Countries, Forum, News, Guides — move down to make room, exactly as a reader
 * expects an accordion to behave.
 *
 * That also removes the whole class of positioning bugs the header version
 * needed comments about: no containing block, no backdrop-filter interaction, no
 * viewport-edge clamping.
 */
export default function FooterBonusMenu({
  label,
  href,
  allLabel,
  items,
}: {
  label: string
  /** The parent's own destination — the full offers listing. */
  href: string
  allLabel: string
  items: FooterBonusMenuItem[]
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  // useId is stable across server and client render; a Math.random() id was
  // a guaranteed hydration mismatch on aria-controls.
  const panelId = `footer-bonus-${useId()}`

  // Collapse on navigation: an expanded group left open across a page change
  // pushes the footer's other links down for no reason the reader remembers.
  useEffect(() => setOpen(false), [pathname])

  // A parent with no children is a dead control — render the plain link so the
  // destination never disappears from the footer.
  if (items.length === 0) {
    return (
      <li>
        <Link
          href={href}
          className="inline-block -mx-1 px-1 py-3 -my-3 text-sm font-semibold text-slate-600 transition-colors hover:text-emerald-700 lg:text-base"
        >
          {label}
        </Link>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 py-3 -my-3 text-sm font-semibold transition-colors lg:text-base ${
          open ? 'text-emerald-700' : 'text-slate-600 hover:text-emerald-700'
        }`}
      >
        {label}
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2.25"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/*
        In flow, so the links below shift down rather than being covered.

        Rendered only while open rather than hidden with CSS: a collapsed group
        should not put its children in the tab order or the accessibility tree,
        and there is no height animation here that would need the element to
        exist first.

        The left border and indent are what say "these belong to Bonus" now that
        the panel no longer floats — without them the categories read as six more
        top-level footer links.
      */}
      {open && (
        <ul
          id={panelId}
          role="list"
          className="mt-2 flex flex-col gap-1.5 border-l-2 border-emerald-100 pl-3"
        >
          <li>
            {/* The parent's own page stays reachable — a disclosure that
                swallows its parent link loses the "all of them" page. */}
            <Link
              href={href}
              className="inline-block -mx-1 px-1 py-3 -my-3 text-sm font-bold text-slate-800 transition-colors hover:text-emerald-700"
            >
              {allLabel}
            </Link>
          </li>

          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/#bonus-${item.slug}`}
                className="inline-flex items-center gap-2 py-3 -my-3 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700 lg:text-base"
              >
                {/* bg-current so the dot follows the label's colour on hover
                    without a second class that has to exist. */}
                <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
