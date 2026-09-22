'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { Continent } from '@shared/types/country'

/**
 * The country filter that the category chips sit inside.
 *
 * A DROPDOWN, not a row of chips. With 79 countries the chip list ran to eight
 * rows and pushed the casinos below the fold — the filter was bigger than the
 * thing it filtered. Collapsed, it is one control; opened, the countries are
 * grouped under their continent, which is the only ordering that makes a list
 * this long scannable.
 *
 * A CLIENT component, and only because of the panel: a native <select> cannot
 * render a flag beside an option, and the flags are what make a country
 * recognisable at a glance. The options are still real <Link>s, so navigation,
 * middle-click and "open in new tab" work exactly as they did with the chips —
 * the interactivity is the open/close, nothing more.
 *
 * The panel is SEARCHABLE and its list scrolls. Seventy-nine options is past
 * the point where scanning works, and past the point where a panel tall enough
 * to hold them all fits on a laptop screen: the search box is pinned outside
 * the scroll area so it cannot scroll away from the list it filters.
 *
 * The two filters are NESTED, not parallel. Country is the outer one: with none
 * chosen the categories count and list every casino on the site; once one is
 * chosen the categories re-count within it.
 *
 * Renders NOTHING when no country has a casino. A filter whose every option
 * returns the same list is noise.
 */
export default function CountryNav({
  continents,
  selected,
  label = 'Country',
  basePath = '/',
}: {
  /** Continents with their countries. Countries with no casinos are ignored. */
  continents: Continent[]
  /** The selected country slug, or undefined for "all countries". */
  selected?: string
  label?: string
  /** The listing the filter belongs to — "/" on the home page, "/casinos" on the listing. */
  basePath?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapper = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)

  // Only countries this site actually publishes casinos in, and only continents
  // left with something to show.
  const groups = continents
    .map((continent) => ({
      ...continent,
      countries: (continent.countries ?? []).filter((c) => (c.casinos_count ?? 0) > 0),
    }))
    .filter((continent) => continent.countries.length > 0)

  const all = groups.flatMap((g) => g.countries)
  const current = all.find((c) => c.slug === selected)

  // Matching on the country name only. A continent whose own name matches but
  // holds no matching country is dropped rather than expanded — typing "asia"
  // to be shown every Asian country would be a different feature, and a
  // surprising one when the box sits under a list of countries.
  const term = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      term === ''
        ? groups
        : groups
            .map((continent) => ({
              ...continent,
              countries: continent.countries.filter((c) =>
                c.name.toLowerCase().includes(term),
              ),
            }))
            .filter((continent) => continent.countries.length > 0),
    // `groups` is rebuilt every render from props, so depending on it directly
    // would defeat the memo; the props it derives from are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [continents, term],
  )

  const matches = visible.reduce((n, g) => n + g.countries.length, 0)

  // Reopening starts from a clean list rather than resuming someone's abandoned
  // search, and the caret lands in the box so the filter is typeable at once.
  useEffect(() => {
    if (open) {
      search.current?.focus()
    } else {
      setQuery('')
    }
  }, [open])

  // Close on outside click and on Escape. Both listeners are bound only while
  // the panel is open, so a closed filter costs nothing.
  useEffect(() => {
    if (!open) return

    const onClick = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (all.length === 0) return null

  // Selecting a country resets the category: one chosen under "all countries"
  // may hold nothing in the new one, and landing on an empty list reads as a
  // broken filter rather than an honest zero.
  const href = (slug?: string) => (slug ? `${basePath}?country=${encodeURIComponent(slug)}` : basePath)

  const Flag = ({ src, name }: { src: string | null; name: string }) => {
    const url = resolveImageUrl(src)
    if (!url) {
      return <span className="h-5 w-5 shrink-0 rounded-full bg-slate-100" aria-hidden />
    }
    // A plain <img>: these are SVGs, which next/image will not optimise without
    // `dangerouslyAllowSVG`, and a flag gains nothing from resizing. alt=""
    // because the country name sits right beside it.
    return <img src={url} alt="" width={20} height={20} className="h-5 w-5 shrink-0 rounded-full" aria-hidden />
  }

  // The "all countries" counterpart to a flag.
  //
  // Drawn inline rather than uploaded: unlike a country flag or a category icon
  // this stands for the ABSENCE of a filter, so there is no record in the admin
  // for it to hang off and nothing for an editor to change.
  //
  // Shaped like the category icons below it — a rounded tile carrying its own
  // background — so the two filter rows read as one family. Sized 20px to match
  // the FLAGS rather than the 18px category tiles, because it swaps places with
  // a flag inside this control and the trigger must not resize when it does.
  const GlobeMark = () => (
    <span
      className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-gradient-to-br from-emerald-600 to-teal-500"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3.2 9h17.6M3.2 15h17.6" />
      </svg>
    </span>
  )

  return (
    <div ref={wrapper} className="relative inline-block text-left">
      {/* No visible "COUNTRY" caption: the trigger already reads "All Countries"
          or the chosen country's name, so the word was labelling something that
          said its own name. `label` lives on now only as the accessible name. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Filter casinos by ${label.toLowerCase()}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700"
      >
        {current ? (
          <>
            <Flag src={current.image_path} name={current.name} />
            {current.name}
            <span className="text-xs font-medium text-slate-400">{current.casinos_count}</span>
          </>
        ) : (
          <>
            <GlobeMark />
            All Countries
          </>
        )}
        <svg viewBox="0 0 24 24" className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Filter casinos by ${label.toLowerCase()}`}
          // max-h + overflow so 79 options scroll inside the panel instead of
          // The PANEL does not scroll — the list inside it does, so the search
          // box stays put while results move under it. No padding here either:
          // the search row and the list own their own insets, so the divider
          // between them can run the full width. z-30 clears the sticky header.
          className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          {/* `relative` sits on the INPUT'S OWN wrapper, not on a padded box —
              positioning the icon against a wrapper with bottom padding is what
              pushed it above the text it belongs to. */}
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={search}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries"
                aria-label="Search countries"
                // `appearance-none` + the webkit reset: Safari and Chrome give
                // type="search" a decoration box and their own cancel button,
                // which is what made this input taller than every other control
                // and left the text sitting off its own baseline.
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm leading-none text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
            </div>
          </div>

          {/* The scroll region. `max-h` in rem rather than a row count so it
              cannot drift when a row's padding changes.
              The scrollbar is styled to be ALWAYS VISIBLE: macOS hides overlay
              scrollbars until you actually scroll, so a bounded list is
              indistinguishable from one running off the bottom of the screen —
              which is exactly how this looked. Styled through the -webkit-
              pseudo-elements ONLY: setting the standard `scrollbar-width` makes
              Chrome ignore them and fall back to the overlay bar, which is the
              very thing being fixed. `overscroll-contain` stops a flick at the
              end of the list from scrolling the page behind it. */}
          <div className="max-h-64 overflow-y-auto overscroll-contain p-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
          {/* Not a search result, so it is out of the way while searching. */}
          {term === '' && (
            <Link
              href={href()}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                selected ? 'text-slate-700 hover:bg-slate-50' : 'bg-slate-900 text-white'
              }`}
            >
              {/* Same mark as the trigger, which also lines this row's text up
                  with the flagged rows underneath it. */}
              <span className="flex items-center gap-2.5">
                <GlobeMark />
                All Countries
              </span>
            </Link>
          )}

          {matches === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              No country matches &ldquo;{query.trim()}&rdquo;.
            </p>
          )}

          {visible.map((continent) => (
            <div key={continent.id} className="mt-1">
              {/* The continent is a LABEL, not an option — it is not selectable,
                  so it must not look like the rows beneath it. */}
              <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                {continent.name}
              </p>

              {continent.countries.map((country) => {
                const active = country.slug === selected

                return (
                  <Link
                    key={country.id}
                    href={href(country.slug)}
                    role="menuitem"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                      active ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Flag src={country.image_path} name={country.name} />
                    <span className="min-w-0 flex-1 truncate">{country.name}</span>
                    <span className={`text-xs ${active ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {country.casinos_count}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}
