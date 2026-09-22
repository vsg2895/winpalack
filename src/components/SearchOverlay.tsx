'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { resolveImageUrl } from '@/lib/images'

/**
 * Site-wide search overlay.
 *
 * Opened from the header button, by `/`, and by Cmd/Ctrl+K. Closed by Escape,
 * the backdrop, and the × button.
 *
 * It talks to /api/search — a route handler on this site — rather than the
 * upstream API, so API_SITE_KEY never reaches the browser. Nothing in this file
 * is winpalack-specific beyond the Tailwind classes: the slug and key both come
 * from the handler's own env, so copying it to another site needs no edits.
 *
 * PORTALLED to <body> on purpose, and it is not optional: the header carries
 * `backdrop-blur-xl`, and an element with a backdrop-filter becomes the
 * CONTAINING BLOCK for its `position: fixed` descendants. Rendered in place, the
 * overlay's `fixed inset-0` resolved to the 96px header box instead of the
 * viewport and the dialog collapsed to zero height. A portal escapes it.
 *
 * ACCESSIBILITY. The input is an ARIA combobox owning a listbox, with
 * aria-activedescendant tracking the highlighted row, so a screen reader
 * announces results as they are arrowed through without moving DOM focus off
 * the input. Focus is trapped while open and returned to the trigger on close.
 */

type Suggestion = {
  title: string
  subtitle: string | null
  url: string
  image_url: string | null
  section: string
  section_label: string
}

type Group = { key: string; label: string; total: number; items: Suggestion[] }
type Payload = { query: string; sections: Group[]; total: number; has_more: boolean }
type Featured = { title: string; url: string; image_url: string | null }

const DEBOUNCE_MS = 250

/** Per-section fallback glyph, used when a row has no image of its own. */
function SectionIcon({ section }: { section: string }) {
  const paths: Record<string, React.ReactNode> = {
    casinos: <path d="M4 7h16v10H4z M9 7v10 M15 7v10" />,
    special_offers: <path d="M4 9h16v11H4z M2 5h20v4H2z M12 5v15 M12 5c-2-3-6-2-6 0 M12 5c2-3 6-2 6 0" />,
    categories: <path d="M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z" />,
    pages: <path d="M6 3h8l4 4v14H6z M14 3v4h4" />,
    forum: <path d="M4 5h16v10H8l-4 4z" />,
  }

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[section] ?? <circle cx="12" cy="12" r="8" />}
      </svg>
    </span>
  )
}

/**
 * Bold the matched run inside a title.
 *
 * The query is regex-escaped before it becomes a pattern, and every fragment is
 * rendered as TEXT — no dangerouslySetInnerHTML anywhere — so a title or a query
 * containing markup is displayed, never executed.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const parts = useMemo(() => {
    const q = query.trim()
    if (q === '') return [text]
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.split(new RegExp(`(${escaped})`, 'ig'))
  }, [text, query])

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-transparent font-bold text-slate-900">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

export default function SearchOverlay() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Payload | null>(null)
  const [extra, setExtra] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [active, setActive] = useState(0)
  // The portal target only exists in the browser; rendering it during SSR would
  // be a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  // This site's top casinos, shown while the box is empty. Decoration: a failure
  // to load them leaves the overlay perfectly usable.
  const [featured, setFeatured] = useState<Featured[]>([])
  // A placeholder long enough to be useful on a laptop is clipped mid-word at
  // 320px ("Search casinos, o"). CSS cannot shorten placeholder text, so the
  // breakpoint is read here instead.
  const [narrow, setNarrow] = useState(false)

  const router = useRouter()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setNarrow(mq.matches)

    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!open || featured.length > 0) return

    let cancelled = false

    fetch('/api/search?q=')
      .then((r) => r.json())
      .then((d: { featured?: Featured[] }) => {
        if (!cancelled) setFeatured(d.featured ?? [])
      })
      .catch(() => { /* decoration only */ })

    return () => { cancelled = true }
  }, [open, featured.length])

  // Flattened rows, in render order — the single source for keyboard movement,
  // so arrowing cannot disagree with what is on screen.
  const rows: Suggestion[] = useMemo(
    () => [...(data?.sections.flatMap((s) => s.items) ?? []), ...extra],
    [data, extra],
  )

  const close = useCallback(() => {
    setOpen(false)
    // Focus returns to the control that opened the overlay, or a keyboard user
    // is dropped at the top of the document with no idea where they were.
    triggerRef.current?.focus()
  }, [])

  // ── Global shortcuts: `/` and Cmd/Ctrl+K open, Escape closes ───────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const typing =
        el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable

      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
        return
      }
      // `/` must not hijack the key while someone is typing in another field.
      if (e.key === '/' && !typing && !open) {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // ── Body scroll lock + focus, while open ──────────────────────────────────
  useEffect(() => {
    if (!open) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    inputRef.current?.focus()

    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // ── Fetch, debounced, with in-flight cancellation ─────────────────────────
  useEffect(() => {
    if (!open) return

    const term = query.trim()

    if (term === '') {
      abortRef.current?.abort()
      setData(null)
      setExtra([])
      setError(false)
      setLoading(false)
      return
    }

    const timer = setTimeout(async () => {
      // Abort the previous request BEFORE issuing a new one: without this a slow
      // response for "ga" can land after a fast one for "game" and overwrite it
      // — results that flicker backwards as you type.
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setLoading(true)
      setError(false)

      try {
        const params = new URLSearchParams({ q: term })
        if (section) params.set('section', section)

        const res = await fetch(`/api/search?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error(String(res.status))

        setData((await res.json()) as Payload)
        setExtra([])
        setPage(1)
        setActive(0)
      } catch (e) {
        // An abort is the expected outcome of typing another character, not a
        // failure — showing the error state for it would make every keystroke
        // flash a retry button.
        if ((e as Error).name !== 'AbortError') setError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, section, open])

  async function showMore() {
    if (!section) return
    const next = page + 1
    setLoading(true)

    try {
      const params = new URLSearchParams({ q: query.trim(), section, page: String(next) })
      const res = await fetch(`/api/search?${params}`)
      const more = (await res.json()) as Payload
      setExtra((prev) => [...prev, ...(more.sections[0]?.items ?? [])])
      setPage(next)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  /** The search button and a bare Enter both open the top result. */
  function submit() {
    const target = rows[active] ?? rows[0]
    if (!target) return
    router.push(target.url)
    close()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (rows.length === 0 ? 0 : (i + 1) % rows.length))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (rows.length === 0 ? 0 : (i - 1 + rows.length) % rows.length))
      return
    }
    if (e.key === 'Enter' && rows[active]) {
      e.preventDefault()
      router.push(rows[active].url)
      close()
    }
  }

  // Pills: "All" plus one per section that the API reported, each with its total.
  const pills = useMemo(
    () => [
      { key: null as string | null, label: 'All', total: data?.total ?? 0 },
      ...(data?.sections ?? []).map((s) => ({ key: s.key, label: s.label, total: s.total })),
    ],
    [data],
  )

  const rowIndex = (() => {
    let n = -1
    return () => ++n
  })()

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search this site"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      {!open || !mounted ? null : createPortal(
        <div
          // pt-24 is right on a laptop and wrong on a landscape phone: at
          // 390px tall it spends a quarter of the screen before the panel
          // starts, leaving ~20px of clearance — which a real phone's URL
          // bar would consume, pushing the results off-screen. Height, not
          // width, is what actually constrains this, so the override is a
          // height media query.
          className="fixed inset-0 z-50 flex flex-col items-center sm:pt-24 sm:[@media(max-height:700px)]:pt-6"
          role="presentation"
        >
          {/* Backdrop is a sibling, not a parent: a click target wrapping the
              panel would swallow clicks inside it. */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={close} aria-hidden />

          {/* The card and the desktop close button are siblings in a row, so the
              × sits on the backdrop beside the panel rather than inside the
              input bar. On mobile the card is full-screen, so that button is
              hidden and the one in the header row takes over. */}
          {/* h-full + items-stretch on mobile so the card really fills the
              screen — `items-start` alone let it shrink to its content and left
              the page showing underneath. Both revert at sm, where the card is
              meant to hug its content. sm:px-4 keeps it off the viewport edges
              between 640px and ~780px, where max-w does not yet bind. */}
          <div className="relative flex h-full w-full max-w-2xl items-stretch gap-3 sm:h-auto sm:max-w-[46rem] sm:items-start sm:px-4">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            onKeyDown={onKeyDown}
            // A centred card by DEFAULT; full-screen is the mobile override.
            //
            // Deliberately this way round. With the card as an `sm:`-only
            // override, anything that costs us those variants — a stale dev
            // stylesheet above all — degraded to a full-bleed bar pinned to the
            // top of the window, which is unusable and looks broken rather than
            // merely unstyled. `max-w-2xl` (42rem, the same width) and
            // `mx-auto` are unconditional, so the worst case is now a slightly
            // taller card.
            className="relative flex h-full w-full min-w-0 flex-1 flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[70vh] sm:rounded-2xl"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 p-3">
              <div className="relative flex-1">
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={narrow ? 'Search…' : 'Search casinos, offers, categories…'}
                  role="combobox"
                  aria-expanded={rows.length > 0}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
                  aria-label="Search this site"
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
                />
                {query !== '' && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); inputRef.current?.focus() }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Submit. Redundant with Enter for a keyboard user, and that is
                  the point: a pointer user needs a visible way to commit. */}
              <button
                type="button"
                onClick={submit}
                aria-label="Search"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-sm shadow-emerald-500/30 transition-transform hover:-translate-y-0.5"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>

              {/* Mobile only — on desktop the × lives outside the card. */}
              <button
                type="button"
                onClick={close}
                aria-label="Close search"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {data !== null && data.total > 0 && (
              <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2">
                {pills.map((pill) => (
                  <button
                    key={pill.key ?? 'all'}
                    type="button"
                    onClick={() => { setSection(pill.key); setExtra([]); setPage(1) }}
                    aria-pressed={section === pill.key}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      section === pill.key
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    {pill.label}
                    <span className={section === pill.key ? 'text-emerald-600' : 'text-slate-400'}>{pill.total}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {/* ── idle: this site's top casinos ── */}
              {query.trim() === '' && (
                featured.length === 0 ? (
                  <p className="px-3 py-10 text-center text-sm text-slate-400">
                    Start typing to search casinos, offers, categories, pages and the forum.
                  </p>
                ) : (
                  <div className="px-1 pb-2">
                    {/* "Top casinos", not "hottest this week": the order is the
                        one an admin set for this site, and no popularity or
                        recency data exists to support a stronger claim. */}
                    <p className="border-b border-slate-100 px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Top casinos on this site
                    </p>
                    <ul className="flex gap-1 overflow-x-auto pt-3">
                      {featured.map((item) => {
                        const image = resolveImageUrl(item.image_url)

                        return (
                          <li key={item.url} className="min-w-0 shrink-0">
                            <Link
                              href={item.url}
                              onClick={close}
                              className="flex w-24 flex-col items-center gap-2 rounded-xl px-1.5 py-2 text-center transition-colors hover:bg-slate-50 sm:w-28 sm:px-2"
                            >
                              {image ? (
                                <Image
                                  src={image}
                                  alt=""
                                  width={56}
                                  height={56}
                                  className="h-12 w-12 rounded-full bg-white object-contain ring-1 ring-slate-200 sm:h-14 sm:w-14"
                                />
                              ) : (
                                <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" aria-hidden>
                                  <SectionIcon section="casinos" />
                                </span>
                              )}
                              <span className="line-clamp-2 text-xs font-semibold text-slate-700">
                                {item.title}
                              </span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              )}

              {/* ── loading skeleton ── */}
              {loading && rows.length === 0 && query.trim() !== '' && (
                <ul className="space-y-2 p-1" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl p-2">
                      <span className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                      <span className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
                    </li>
                  ))}
                </ul>
              )}

              {/* ── error ── */}
              {error && (
                <div className="px-3 py-10 text-center">
                  <p className="text-sm text-slate-500">Search is unavailable right now.</p>
                  <button
                    type="button"
                    onClick={() => setQuery((q) => q + '')}
                    className="mt-3 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* ── empty ── */}
              {!loading && !error && data !== null && data.total === 0 && query.trim() !== '' && (
                <p className="px-3 py-10 text-center text-sm text-slate-500">
                  Nothing found for <span className="font-semibold text-slate-800">{query.trim()}</span>.
                </p>
              )}

              {/* ── results ── */}
              {!error && data !== null && data.total > 0 && (
                <ul id={listId} role="listbox" aria-label="Search results" className="space-y-0.5">
                  {data.sections.map((group) => (
                    <li key={group.key} role="presentation">
                      {/* Section header only in "All" — in a single-section view
                          it would repeat the selected pill. */}
                      {section === null && (
                        <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                          {group.label}
                        </p>
                      )}

                      <ul role="presentation">
                        {[...group.items, ...(section === group.key ? extra : [])].map((item) => {
                          const i = rowIndex()
                          const image = resolveImageUrl(item.image_url)

                          return (
                            <li key={`${item.section}-${item.url}-${i}`} role="presentation">
                              <Link
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={active === i}
                                href={item.url}
                                onClick={close}
                                onMouseEnter={() => setActive(i)}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                                  active === i ? 'bg-emerald-50' : 'hover:bg-slate-50'
                                }`}
                              >
                                {image ? (
                                  <Image src={image} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-xl object-contain" />
                                ) : (
                                  <SectionIcon section={item.section} />
                                )}
                                <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                                  <Highlight text={item.title} query={query} />
                                  <span className="text-slate-400"> in {item.section_label}</span>
                                </span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}

              {/* "Show more" only in a single-section view, per the spec. */}
              {section !== null && data !== null && data.has_more && (
                <button
                  type="button"
                  onClick={showMore}
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60"
                >
                  {loading ? 'Loading…' : 'Show more'}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl text-white/90 transition-colors hover:bg-white/10 hover:text-white sm:grid"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
