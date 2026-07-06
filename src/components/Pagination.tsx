import Link from 'next/link'

// Idev Affiliation design: light glass pagination with emerald→teal active page.
export default function Pagination({ basePath, current, last }: { basePath: string; current: number; last: number }) {
  if (last <= 1) return null

  const pages = Array.from({ length: last }, (_, i) => i + 1)
  const link = (p: number) => `${basePath}&page=${p}`
  const base = 'inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors'

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
