import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import MobileCollapse from '@/components/MobileCollapse'
import type { Category } from '@shared/types/category'

/**
 * Idev Affiliation category selector — elegant glass pills with an emerald→teal
 * active state. Mounted on the home page and on the casinos listing; both link
 * at the canonical /categories/<slug> route.
 */
export default function CategoryNav({
  categories,
  selected,
  country,
}: {
  categories: Category[]
  selected: string
  /** Carried through every chip link, so choosing a category keeps the country. */
  country?: string
}) {
  return (
    /*
     * ONE FULL-WIDTH COLUMN ON A PHONE; from 640px up, a grid of EQUAL chips,
     * every one as wide as the widest label.
     *
     * Content-sized chips (the previous rule) gave every tab a different
     * width, so "Free Spins" beside "Crypto Oriented" read as unequal buttons
     * rather than one set of filters. The grid is `w-max`, so its `1fr` tracks
     * resolve to the widest chip's max-content width and every chip shares it
     * — no measured pixel value to go stale when a category is renamed, and no
     * chip stretched past what the longest label needs (an earlier
     * `minmax(11.5rem, 1fr)` grid filled the whole row, which made each chip a
     * slab). The column count steps up with the breakpoints (2 / 3 / 4 / 5) so
     * the widest chip still fits the container at each.
     *
     * `whitespace-nowrap` on the chip keeps every label on one line, so every
     * chip sits at the same 44px floor — the height the country filter above
     * matches.
     *
     * On a phone the chips stack in one column: content-sized they came out
     * 156–187px wide at 390px, so some rows held two and some one, and two
     * equal columns do not fit (a half-width track is ~166px).
     */
    /* On a phone the one-column stack can be folded away — see MobileCollapse. */
    <MobileCollapse label={COPY.collapse.casinoCategories} count={categories.length}>
    <nav aria-label="Casino categories" className="grid grid-cols-1 gap-2 sm:w-max sm:grid-cols-[repeat(2,1fr)] md:grid-cols-[repeat(3,1fr)] lg:grid-cols-[repeat(4,1fr)] xl:grid-cols-[repeat(5,1fr)] sm:gap-2.5">
      {categories.map((c) => {
        const active = c.slug === selected
        return (
          <Link
            key={c.id}
            /*
             * ALWAYS the canonical category route, on every page this nav
             * appears — including the home page, which used to take the query
             * form `/?category=<slug>` and filter in place.
             *
             * That query form is now 301'd to this very URL at the edge (see
             * lib/seo/redirects.ts), so emitting it would mean linking a
             * redirect: one wasted hop for a visitor and, multiplied by the
             * number of categories, a page's worth of crawl budget spent on
             * URLs that resolve to somewhere else. It is also what Search
             * Console was reporting as "Alternate page with proper canonical
             * tag" — the home page existed once per category, each copy
             * canonical-tagged back at `/`.
             *
             * The chips therefore NAVIGATE rather than filter in place. The
             * destination renders the same list, from the same endpoint, under
             * a URL that can be linked, shared and indexed.
             */
            href={`/categories/${c.slug}${country ? `?country=${encodeURIComponent(country)}` : ''}`}
            aria-current={active ? 'page' : undefined}
            // `flex` + centring rather than the old inline box: the chip is now
            // as wide as its grid track, so its contents have to be placed
            // inside that width instead of defining it.
            // The active chip carries a TRANSPARENT border purely so its box model
            // matches the inactive ones, which are bordered. Without it the selected
            // chip is 2px shorter — invisible while chips share a row and are
            // stretched to match, obvious the moment they wrap to one per row.
            //
            // `bg-origin-border` is what that border costs. A gradient is sized to the
            // PADDING box but clipped to the BORDER box, and the leftover strip is
            // filled by the image repeating — so the 1px of border showed the tail of
            // the previous tile, i.e. the gradient's far end, as a dark hairline along
            // the edge of the selected chip. Sizing it to the border box leaves nothing
            // to repeat. This chip is the only bordered button on the site, which is
            // why no other gradient here shows the same line.
            className={`flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-center text-sm font-bold transition-all ${
              active
                ? 'border border-transparent bg-origin-border bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                : 'border border-slate-200 bg-white/70 text-slate-600 backdrop-blur hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            {/* Icon, label and count as ONE flex row. Everything the chip
                shows lives in here, so alignment does not depend on the Link's
                own display — which is flex on some sites and inline on others. */}
            <span className="inline-flex items-center justify-center gap-2">
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
    </MobileCollapse>
  )
}
