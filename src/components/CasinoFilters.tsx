'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import type { Facet } from '@shared/types/facet'

/**
 * The casino listing's filter controls.
 *
 * `"use client"` ONLY because this manipulates the URL and reacts to a change
 * event — the results themselves stay server-rendered, so the casinos a visitor
 * (and a crawler) sees are in the initial HTML either way. Making the list
 * client-side would take it out of the HTML, which on this project is the same
 * as deleting it.
 *
 * Selections live in the query string rather than component state, so a filtered
 * view is linkable, shareable and survives a refresh — and so the server can
 * render it directly.
 *
 * Native <select> rather than a custom dropdown: it is keyboard-accessible and
 * usable on mobile for free, and a filter is not where a bespoke widget earns
 * its cost.
 */
export default function CasinoFilters({ facets }: { facets: Facet[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  if (facets.length === 0) return null

  const active = facets.filter((f) => params.get(f.facet))

  function apply(facet: string, value: string): void {
    const next = new URLSearchParams(params.toString())

    if (value === '') {
      next.delete(facet)
    } else {
      next.set(facet, value)
    }

    // The transition keeps the current results on screen while the server
    // renders the new ones, instead of flashing an empty list.
    startTransition(() => {
      const qs = next.toString()
      router.push(qs === '' ? pathname : `${pathname}?${qs}`)
    })
  }

  function clearAll(): void {
    startTransition(() => router.push(pathname))
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4" aria-busy={pending}>
      <div className="flex flex-wrap items-end gap-4">
        {facets.map((facet) => (
          <div key={facet.facet} className="min-w-[10rem] flex-1">
            <label
              htmlFor={`facet-${facet.facet}`}
              className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500"
            >
              {facet.label}
            </label>
            <select
              id={`facet-${facet.facet}`}
              value={params.get(facet.facet) ?? ''}
              onChange={(e) => apply(facet.facet, e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Any</option>
              {facet.values.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label} ({v.count})
                </option>
              ))}
            </select>
          </div>
        ))}

        {active.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
