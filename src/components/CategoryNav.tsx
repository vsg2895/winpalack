import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
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
     * CONTENT-SIZED chips in a wrapping row — the same shape all ten sibling
     * sites use, and what this one had before.
      *
     * It briefly ran on `grid-template-columns: repeat(auto-fit, minmax(11.5rem,
     * 1fr))` so every chip filled an equal track. The intent was that unequal
     * widths read as unequal importance; the cost was that every chip became as
     * wide as the widest one could need, so "Most Popular" rendered at ~235px
     * for a 12-character label and the row read as a stack of slabs rather than
     * a set of filters.
      *
     * The grid also existed to stop one wrapping label ("Online Casinos") making
     * its row taller than the rest. `whitespace-nowrap` on the chip settles that
     * at the source: a label that cannot wrap cannot pull a row out of line, so
     * every chip sits at the same 44px floor without the container equalising
     * anything — and 44px is what the country filter above matches.
     *
     * ── ONE COLUMN ON A PHONE ───────────────────────────────────────────────
     *
     * Content sizing is right on a desktop, where the chips sit in one row and
     * their differing widths read as differing words. On a phone the same rule
     * produced a ragged stack: measured at 390px the chips come out 156–187px
     * wide, so some rows held two and some held one, no two edges lined up, and
     * the country filter above was a third width again. A set of filters that
     * looks like that reads as unrelated buttons rather than one control.
     *
     * Two equal columns do not fit: the widest chip needs ~187px and a
     * half-width track at 390px is ~166px, so `whitespace-nowrap` would push the
     * label out of its own chip. One full-width column is the honest answer —
     * every chip identical, nothing clipped, and it matches the bonus-type
     * block directly above it, which is already a single column at this width.
     *
     * `sm:` restores the content-sized row exactly as it was from 640px up, so
     * the desktop treatment that was asked for is untouched.
     */
    <nav aria-label="Casino categories" className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap">
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
            className={`flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-center text-sm font-bold transition-all sm:inline-flex sm:w-auto ${
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
  )
}
