'use client'

import { useId, useState, type ReactNode } from 'react'

/**
 * Phone-only hide / show for a block of filter chips.
 *
 * Below `sm` a one-column chip list is a whole screen of buttons before the
 * content it filters, so the visitor may fold it away. It starts OPEN — the
 * chips are the way in, and hiding them by default would hide the choice.
 *
 * Folding is CSS only (`hidden sm:block`): the links stay in the server HTML
 * either way, so nothing a crawler reads depends on this state, and from `sm`
 * up the toggle is not rendered visibly and the content is always shown.
 */
export default function MobileCollapse({
  label,
  count,
  variant = 'pill',
  children,
}: {
  /** What the block holds, e.g. "Casino categories". */
  label: string
  /** How many items are inside, shown beside the label. */
  count?: number
  /**
   * Which chips the toggle sits above, so it reads as one of them: `pill`
   * matches the bordered casino-category chips, `card` the taller white
   * bonus-type chips with their soft shadow.
   */
  variant?: 'pill' | 'card'
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const id = useId()

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2.5 rounded-full px-5 text-sm font-bold text-slate-700 transition-colors hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:hidden ${
          variant === 'card'
            ? 'min-h-12 bg-white py-2.5 shadow-[0_6px_20px_-12px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/80 hover:ring-emerald-300'
            : 'min-h-11 border border-slate-200 bg-white/80 backdrop-blur hover:border-emerald-300'
        } ${open ? 'mb-3' : ''}`}
      >
        <span>{label}</span>
        {typeof count === 'number' && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-500">{count}</span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-emerald-700">
          {open ? 'Hide' : 'Show'}
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 7.5l5 5 5-5" />
          </svg>
        </span>
      </button>
      <div id={id} className={open ? undefined : 'hidden sm:block'}>
        {children}
      </div>
    </>
  )
}
