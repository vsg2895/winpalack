import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { CLAIMABLE_BONUS_CATEGORY } from '@/components/SpecialOfferCard'
import type { BonusSection } from '@/lib/api'

/**
 * The catch-all heading, which this row deliberately leaves out.
 *
 * Every offer that is not filed under a real type lands under "Special
 * Offers", so it is not a type at all — it is the whole area, and the site
 * already leads there from the nav and from the offers page itself. A chip for
 * it would be a second route to a page the reader can already reach, taking the
 * place of a type they cannot.
 *
 * Hiding it here rather than in the admin is deliberate: the admin's "Shown"
 * switch would remove the heading from the menu and the sections as well, and
 * the heading is still wanted there.
 */
const CATCH_ALL_SLUG = CLAIMABLE_BONUS_CATEGORY

/**
 * The bonus types, as a row of buttons at the top of the home page.
 *
 * One chip per type: its mark, its name, and how many bonuses are actually
 * behind it on THIS site. Pressing one opens that type's own page.
 *
 * ── Why it sits above everything else ───────────────────────────────────────
 *
 * The Bonus sections further down the page are a reading surface — they show
 * the offers themselves, a few per heading. This is a NAVIGATION surface: a
 * visitor who arrived wanting free spins should be able to say so in one press,
 * without scrolling past two screens of casinos to find the heading.
 *
 * ── The counts are the point ────────────────────────────────────────────────
 *
 * A row of unlabelled buttons asks the reader to guess which ones are worth
 * pressing. The number answers that before the press, and it is the SITE's
 * number — the same visibility rule as the cards below (active, claimable,
 * owned by a casino attached to and active here), resolved server-side in one
 * `withCount` beside the listing query, so a chip reading "6" cannot sit above
 * a section showing a different six.
 *
 * ── What it never renders ───────────────────────────────────────────────────
 *
 * Nothing, when the site publishes no Bonus area or every type is empty: the
 * endpoint drops a type with no visible offers, so a chip can never lead to an
 * empty page. That is also why this takes the SAME `bonusSections` array the
 * sections below use rather than fetching its own — two sources would be two
 * chances to disagree, and this costs no extra request.
 */
export default function BonusCategoryNav({ sections }: { sections: BonusSection[] }) {
  if (sections.length === 0) return null

  // The chips name TYPES of bonus; the catch-all is not one. See above.
  const types = sections.filter((section) => section.slug !== CATCH_ALL_SLUG)

  if (types.length === 0) return null

  return (
    /*
     * `aria-labelledby`, not `aria-label`.
     *
     * The heading below is now the visible name of this block, so the
     * landmark points AT it rather than carrying a second, invisible name
     * of its own. Two names for one region is how they drift apart — a
     * screen reader would announce one thing and the page would show
     * another.
     */
    <nav aria-labelledby="bonus-types-heading">
      <h2 id="bonus-types-heading" className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl mb-5">
        {COPY.home.bonusTypesTitle}
      </h2>
      {/*
       * Wraps rather than scrolls sideways.
       *
       * A horizontal scroller would keep the single-row look on a phone at the
       * cost of hiding every chip past the second one behind a gesture nothing
       * on the page advertises — and these are the page's primary filters. Eight
       * of them wrap to three short rows instead, all of them visible and all of
       * them a full-size target.
       *
       * Centred, because the hero above it is centred.
       */}
      {/*
       * EQUAL-WIDTH chips, whatever the labels say.
       *
       * This was `flex flex-wrap`, which sizes every chip to its own content —
       * so on a phone, where each one takes its own row, the column came out
       * ragged: eight buttons of eight different widths, centred, reading as
       * eight unrelated controls rather than one set of options. The eye reads
       * that difference as importance rather than as a word count.
       *
       * A grid fixes it at the CONTAINER level instead of per chip: every track
       * is `1fr`, so the tracks are equal by definition and no chip has to know
       * what the others contain. The same fix, for the same reason, as
       * CategoryNav.
       *
       * `repeat(auto-fit, …)` keeps the breakpoints out of the code: one column
       * on a phone, two or three on a tablet, as many as fit on a desktop, with
       * no media query to keep in step with the chip count.
       *
       * An INLINE STYLE, not Tailwind classes:
       * `grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))]` is an arbitrary
       * utility, and when one of those is not generated the element is left as
       * a bare `grid` — which means ONE column at every width, silently. An
       * inline style ships in the HTML and cannot go missing.
       */}
      <ul
        style={{
          display: 'grid',
          /*
           * 15rem is measured, not guessed. The widest chip's contents — "No
           * Deposit Offers" plus its icon, its count and the chip's own padding
           * — come to ~235px, so a narrower track makes that one label wrap to
           * two lines while its neighbours stay on one. It still leaves a
           * single full-width column at 320px (the narrowest phone in use), so
           * nothing is forced into a cramped second column.
           */
          gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
          // 0.625rem is Tailwind's gap-2.5, inlined with the rest so the layout
          // has ONE source rather than half a rule here and half in a class.
          gap: '0.625rem',
          // EVERY ROW THE SAME HEIGHT. Grid stretches items within a row, so a
          // chip whose label wraps would otherwise pull only its own row taller.
          gridAutoRows: '1fr',
        }}
      >
        {types.map((section) => {
          const icon = resolveImageUrl(section.icon_path)

          return (
            <li key={section.id}>
              <Link
                href={`/bonuses/${section.slug}`}
                className="group flex h-full w-full min-h-12 items-center gap-2.5 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-[0_6px_20px_-12px_rgba(15,23,42,0.4)] ring-1 ring-slate-200/80 transition-all hover:-translate-y-0.5 hover:text-emerald-700 hover:ring-emerald-300 hover:shadow-[0_10px_24px_-12px_rgba(16,185,129,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {icon && (
                  /*
                   * A plain <img>, not next/image: the optimizer refuses SVG
                   * unless `dangerouslyAllowSVG` is on, and an SVG gains nothing
                   * from resizing. Served from the API's storage mount, where it
                   * was sanitised before it was ever written.
                   *
                   * alt="" and aria-hidden: the label beside it already names the
                   * type, and announcing it twice is noise to a screen reader.
                   */
                  <img
                    src={icon}
                    alt=""
                    width={22}
                    height={22}
                    className="h-[22px] w-[22px] shrink-0"
                    aria-hidden
                  />
                )}

                {/* LEFT-aligned, not centred.
                    With the tracks equal and the contents centred, every chip
                    put its icon and its label at a different distance from its
                    own left edge — so the column read as ragged even though the
                    boxes were identical. Starting them all at the same point is
                    what makes a set of equal boxes look like a set. */}
                <span>{section.name}</span>

                {/* The count rides INSIDE the link, as its own pill: it is part
                    of what the button says, not a caption next to it. */}
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-500 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700">
                  {section.offers_count}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
