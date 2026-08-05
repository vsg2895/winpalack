import Link from 'next/link'
import type { Category } from '@shared/types/category'

/**
 * Idev Affiliation category selector — elegant glass pills with an emerald→teal
 * active state. Works on the home page (basePath="/") and the casinos listing.
 */
export default function CategoryNav({
  categories,
  selected,
  basePath = '/casinos',
}: {
  categories: Category[]
  selected: string
  basePath?: string
}) {
  return (
    <nav aria-label="Casino categories" className="flex flex-wrap gap-2.5">
      {categories.map((c) => {
        const active = c.slug === selected
        return (
          <Link
            key={c.id}
            // On the home page the nav is an in-page filter (basePath="/"), so it
            // keeps the query form. Anywhere else it links straight at the
            // canonical category route — never through the 301.
            href={basePath === '/' ? `/?category=${c.slug}` : `/categories/${c.slug}`}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              active
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                : 'border border-slate-200 bg-white/70 text-slate-600 backdrop-blur hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            {c.name}
            {typeof c.casinos_count === 'number' && (
              <span className={`ml-1.5 text-xs ${active ? 'text-teal-100' : 'text-slate-400'}`}>{c.casinos_count}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
