import Link from 'next/link'

/**
 * Light glass pagination with an emerald→teal active page.
 *
 * `hrefFor` exists for one case: the home page's casino list paginates in
 * twenties for the server and in tens for a phone, so the phone's paginator has
 * to map its page number onto a server page plus which half of it to show. That
 * mapping belongs to the page that knows the page sizes, not here — every other
 * caller passes nothing and gets `?page=n` as before.
 *
 * `className` is appended to the nav, which is how the home page renders the two
 * paginators side by side and shows one per breakpoint.
 */
export default function Pagination({
  basePath,
  current,
  last,
  hrefFor,
  className = '',
}: {
  basePath: string
  current: number
  last: number
  hrefFor?: (page: number) => string
  className?: string
}) {
  if (last <= 1) return null

  const pages = Array.from({ length: last }, (_, i) => i + 1)
  // basePath may or may not already carry a query string (/categories/slots vs
  // /casinos?category=slots), so pick the right separator instead of assuming one.
  const link = hrefFor ?? ((p: number) => `${basePath}${basePath.includes('?') ? '&' : '?'}page=${p}`)
  const base = 'inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors'

  return (
    <nav className={`mt-10 flex items-center justify-center gap-1.5 ${className}`.trim()} aria-label="Pagination">
      {current > 1 && (
        <Link href={link(current - 1)} className={`${base} border border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 hover:text-emerald-700`} rel="prev">‹ Prev</Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={link(p)}
          aria-current={p === current ? 'page' : undefined}
          className={`${base} ${p === current ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/30' : 'border border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'}`}
        >
          {p}
        </Link>
      ))}
      {current < last && (
        <Link href={link(current + 1)} className={`${base} border border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 hover:text-emerald-700`} rel="next">Next ›</Link>
      )}
    </nav>
  )
}
