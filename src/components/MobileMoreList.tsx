'use client'

import { useState, type ReactNode } from 'react'

/**
 * An `<ol>` that shows only its first few items on a phone, with a control to
 * reveal the rest. Above the `sm` breakpoint it is an ordinary list and the
 * control is not rendered at all.
 *
 * WHY THIS EXISTS RATHER THAN A SMALLER PAGE SIZE ON MOBILE. The home page's
 * casino list is PAGINATED, and a page is a server-side slice: cutting mobile to
 * ten per page while the paginator still steps in twenties would make items
 * 11–20 unreachable on a phone — page 2 starts at 21. Rendering the full page
 * and collapsing the tail keeps every item reachable and keeps all twenty in the
 * HTML, which is what the ItemList schema and the crawler read.
 *
 * The collapse is CSS, not a slice of the array: `collapsedClassName` carries an
 * nth-child rule scoped to the `max-sm` breakpoint, so the hidden items are present in the
 * markup, the server renders exactly one list, and expanding is a class change
 * rather than a re-render of the cards.
 *
 * Children are server-rendered and passed through untouched — this component
 * never needs to know what a casino is.
 */
export default function MobileMoreList({
  className = '',
  collapsedClassName,
  hiddenCount,
  moreLabel,
  lessLabel,
  children,
}: {
  /** Classes that always apply to the list. */
  className?: string
  /**
   * Classes applied only while collapsed — the caller's own nth-child rule,
   * written out in full at the call site so Tailwind's scanner sees a literal.
   * A string built here from a number would never be generated.
   */
  collapsedClassName: string
  /** How many items the collapsed state hides. Zero renders no control. */
  hiddenCount: number
  moreLabel: string
  lessLabel: string
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <ol className={`${className} ${expanded ? '' : collapsedClassName}`.trim()}>{children}</ol>

      {hiddenCount > 0 && (
        // `sm:hidden` because above that breakpoint nothing is hidden, so a
        // control offering to show more would be a lie.
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700 sm:hidden"
        >
          {expanded ? lessLabel : `${moreLabel} (${hiddenCount})`}
        </button>
      )}
    </>
  )
}
