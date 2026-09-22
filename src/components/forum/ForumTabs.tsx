'use client'

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

/**
 * The Categories / Latest Posts / Hot Threads tab widget.
 *
 * ── Every panel is SERVER-RENDERED and already in the HTML ──────────────────
 *
 * This component receives finished markup as children and only decides which
 * panel is visible. Nothing is fetched here. That is the whole point: the
 * competitor's equivalent loads its tabs client-side, which means a crawler
 * sees one of three panels. All three of ours are in the document on first
 * paint, and the hidden ones are hidden with `hidden`, which keeps them in the
 * accessibility tree's document order and in the HTML a crawler reads.
 *
 * ── Keyboard behaviour follows the ARIA Authoring Practices tab pattern ─────
 *
 * Arrow keys move between tabs and activate; Home/End jump to the ends; only the
 * SELECTED tab is in the page tab order (roving tabindex), so Tab moves out of
 * the tablist into the panel rather than through three tabs.
 */
export interface ForumTab {
  id: string
  label: string
  count?: number
  panel: ReactNode
}

export default function ForumTabs({ tabs }: { tabs: ForumTab[] }) {
  const [active, setActive] = useState(0)
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1
    let next: number | null = null

    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last

    if (next === null) return

    e.preventDefault()
    setActive(next)
    // Focus follows selection, which is the automatic-activation variant of the
    // pattern — correct here because switching panels costs nothing.
    refs.current[next]?.focus()
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Forum views"
        className="flex flex-wrap gap-1 border-b border-slate-200"
      >
        {tabs.map((tab, i) => {
          const selected = i === active
          return (
            <button
              key={tab.id}
              ref={(el) => { refs.current[i] = el }}
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`-mb-px inline-flex min-h-11 items-center gap-2 rounded-t-lg border-b-2 px-4 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className={selected ? 'text-emerald-500' : 'text-slate-400'}>{tab.count}</span>
              )}
            </button>
          )
        })}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          // `hidden` rather than conditional rendering: all three panels stay in
          // the HTML for crawlers and for the accessibility tree.
          hidden={i !== active}
          tabIndex={0}
          className="pt-6 focus:outline-none"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  )
}
