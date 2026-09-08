import Link from 'next/link'
import type { FacetValue } from '@shared/types/facet'

/**
 * The country filter that the category chips sit inside.
 *
 * The two are NESTED, not parallel. Country is the outer filter: with none
 * chosen the categories count and list every casino on the site; once one is
 * chosen the categories re-count within it, so a chip reading "Best Bonuses 3"
 * means three in the selected country and clicking it shows exactly those three.
 *
 * "All countries" is a real option rather than an implied default, so a visitor
 * who narrowed can always widen again without hunting for a reset.
 *
 * Renders NOTHING when there are no countries with casinos. A filter whose every
 * option returns the same list is noise, and one whose options return nothing is
 * worse — this is the same rule the casino facets follow.
 */
export default function CountryNav({
  countries,
  selected,
  label = 'Country',
}: {
  countries: FacetValue[]
  /** The selected country slug, or undefined for "all countries". */
  selected?: string
  label?: string
}) {
  if (countries.length === 0) return null

  // Selecting a country resets the category: a category chosen under "all
  // countries" may hold nothing in the new one, and landing on an empty list
  // reads as a broken filter rather than an honest zero.
  const href = (slug?: string) => (slug ? `/?country=${encodeURIComponent(slug)}` : '/')

  return (
    <nav aria-label={`Filter casinos by ${label.toLowerCase()}`} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
        {label}
      </span>

      <Link
        href={href()}
        aria-current={selected ? undefined : 'page'}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          selected
            ? 'border border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
            : 'bg-slate-900 text-white'
        }`}
      >
        All countries
      </Link>

      {countries.map((country) => {
        const active = country.value === selected

        return (
          <Link
            key={country.value}
            href={href(country.value)}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              active
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            {country.label}
            <span className={`ml-1.5 text-xs ${active ? 'text-slate-300' : 'text-slate-400'}`}>
              {country.count}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
