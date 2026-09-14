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
    /*
     * EQUAL-WIDTH pills, whatever the labels say.
     *
     * This was `flex flex-wrap`, which sizes every chip to its own content, so
     * the row read as five different buttons rather than one set of options —
     * "Free Spins" came out barely half the width of "Most Popular", and the
     * eye reads that difference as importance rather than as a word count.
     *
     * A grid fixes it at the container level instead of per chip: every track is
     * `1fr`, so the tracks are equal by definition and no chip has to know what
     * the others contain.
     *
     * 11.5rem is measured, not guessed: the widest chip's contents come to 186px
     * ("Online Casinos" + icon + count), and this is the largest minimum that
     * still fits five tracks across the 1024px container the casinos page gives
     * this nav. Raising it to 12.5rem drops the row to four columns and strands
     * the fifth chip on a line of its own.
     *
     * A longer name than any of today's does NOT break the layout: it wraps
     * inside its own chip, and because grid items stretch, every chip on that
     * row grows to match. Nothing overflows and nothing is truncated.
     */
    <nav
      aria-label="Casino categories"
      className=""
      /*
       * The whole layout is an INLINE STYLE, not Tailwind classes.
       *
       * It was `grid-cols-[repeat(auto-fit,minmax(11.5rem,1fr))]`, and when that
       * arbitrary utility is not generated the element is left as a bare `grid`
       * — which means ONE column, and the chips stack full-width down the page.
       * The failure is silent and total, and it is the same shape as the
       * honeypot bug: a class that has to survive a build step is a class that
       * can be missing at runtime. An inline style ships in the HTML and cannot.
       *
       * repeat(auto-fit, …) keeps the count out of the code: five categories or
       * nine, the row divides itself into equal 1fr tracks and wraps only when a
       * track would fall under the minimum.
       */
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(11.5rem, 1fr))',
        // 0.625rem is Tailwind's gap-2.5, inlined with the rest so the layout
        // has ONE source rather than half a rule here and half in a stylesheet.
        gap: '0.625rem',
      }}
    >
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
            // `flex` + centring rather than the old inline box: the chip is now
            // as wide as its grid track, so its contents have to be placed
            // inside that width instead of defining it.
            className={`flex items-center justify-center rounded-full px-5 py-2.5 text-center text-sm font-bold transition-all ${
              active
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
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
