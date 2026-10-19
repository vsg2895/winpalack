import Link from 'next/link'
import { pageHref } from '@/lib/seo/canonical'

// Idev Affiliation design: light glass pagination with emerald→teal active page.
export default function Pagination({ basePath, current, last }: { basePath: string; current: number; last: number }) {
  if (last <= 1) return null

  const pages = Array.from({ length: last }, (_, i) => i + 1)
  /*
   * `pageHref` and not a local template string.
   *
   * It is the same helper the canonical tags are built from, so page 1 links to
   * the bare `basePath` instead of `?page=1`. Those two URLs are one document,
   * and linking both is what put every paginated listing on this site into
   * Search Console as an "Alternate page with proper canonical tag".
   *
   * It also owns the separator question `basePath` raises — the base may or may
   * not already carry a query string (/categories/slots vs /?category=slots) —
   * and strips any `page` the caller already put there, so one cannot be
   * appended twice.
   */
  const link = (p: number) => pageHref(basePath, p)
  const base = 'inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors'

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
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
