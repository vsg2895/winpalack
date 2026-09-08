import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { Category } from '@shared/types/category'

/**
 * Idev Affiliation category selector — elegant glass pills with an emerald→teal
 * active state. Works on the home page (basePath="/") and the casinos listing.
 */
export default function CategoryNav({
  categories,
  selected,
  basePath = '/casinos',
  country,
}: {
  categories: Category[]
  selected: string
  basePath?: string
  /** Carried through every chip link, so choosing a category keeps the country. */
  country?: string
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
            href={
              basePath === '/'
                ? `/?category=${c.slug}${country ? `&country=${encodeURIComponent(country)}` : ''}`
                : `/categories/${c.slug}${country ? `?country=${encodeURIComponent(country)}` : ''}`
            }
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
              active
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                : 'border border-slate-200 bg-white/70 text-slate-600 backdrop-blur hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            {/* Icon, label and count as ONE flex row. Everything the chip
                shows lives in here, so alignment does not depend on the Link's
                own display — which is flex on some sites and inline on others. */}
            <span className="inline-flex items-center gap-2">
              {resolveImageUrl(c.logo_path) && (
                // A plain <img>, not next/image: the optimizer refuses SVG
                // unless `dangerouslyAllowSVG` is enabled, and an SVG icon gains
                // nothing from resizing anyway. alt="" because the label beside
                // it already names the category — announcing it twice is noise.
                <img
                  src={resolveImageUrl(c.logo_path)!}
                  alt=""
                  width={18}
                  height={18}
                  // NO filter on the active chip. The icons are gradient tiles
                  // that carry their own background, so they read on the white
                  // chip and the saturated active one alike — inverting them
                  // would flatten the artwork the tile exists to show.
                  className="h-[18px] w-[18px] shrink-0"
                  aria-hidden
                />
              )}
              {c.name}
              {/* INSIDE the flex wrapper, not a sibling of it.
                  As a sibling it aligned on the text BASELINE, and an
                  inline-flex box's baseline is its last line box — which
                  dropped the count below the label and the icon. As a flex
                  item it is centred by `items-center` like everything else. */}
              {typeof c.casinos_count === 'number' && (
                <span className={`text-xs ${active ? 'text-teal-100' : 'text-slate-400'}`}>{c.casinos_count}</span>
              )}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
