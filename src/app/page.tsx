import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { resolveImageUrl } from '@/lib/images'
import { getBestNews, getCategories, getCategory, getCountries, getSpecialOffers , getBonusArea } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, buildFaqSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { FAQ_ITEMS } from '@/constants/faq'
import CasinoCard from '@/components/CasinoCard'
import Pagination from '@/components/Pagination'
import CategoryNav from '@/components/CategoryNav'
import CountryNav from '@/components/CountryNav'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SpecialOffer } from '@shared/types/specialOffer'
import type { Article } from '@shared/types/article'
import type { BonusSection } from '@/lib/api'
import { NEWSLETTER_ANCHOR, SITE_URL, SUBSCRIBE_ENABLED } from '@/lib/config'
import { relativeTime } from '@/lib/relativeTime'

/**
 * Grid placement for the FAQ cards. The grid is 2-up on tablets and 3-up on
 * desktop, and the number of questions is whatever the site's faq.ts holds, so
 * the LAST card stretches across whatever the final row leaves empty — five
 * questions fill a 3-column grid exactly instead of leaving a hole.
 */
function faqSpan(i: number): string {
  const last = i === FAQ_ITEMS.length - 1
  if (!last) return ''
  const sm = FAQ_ITEMS.length % 2 === 1 ? 'sm:col-span-2' : 'sm:col-span-1'
  const lg = { 0: 'lg:col-span-1', 1: 'lg:col-span-3', 2: 'lg:col-span-2' }[FAQ_ITEMS.length % 3] ?? ''
  return `${sm} ${lg}`
}

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const YEAR = new Date().getFullYear()

/**
 * Casinos shown in the home page's category section.
 *
 * This surface only. The server's own page size still governs /casinos,
 * /categories/[slug] and the other five sites — it is a shared constant, so
 * changing it there would have moved every listing in the network.
 *
 * "See more" below the list keeps working off the meta totals, so a category
 * holding more than this still leads the visitor to the full catalog.
 */
const HOME_CASINOS_PER_PAGE = 20

/**
 * How many of those a PHONE shows per page.
 *
 * Twenty cards is a reasonable desktop page and a very long scroll on a phone,
 * so a phone paginates in tens: 25 casinos is 2 pages on a desktop (20 + 5) and
 * 3 on a phone (10 + 10 + 5).
 *
 * The SERVER page size stays 20 for everyone — it is one slice, one fetch, one
 * cache entry. Each server page simply holds two phone pages, and which of them
 * a phone shows is a CSS rule chosen by the `half` parameter. Nothing is hidden
 * from the crawler, and nothing is unreachable: every phone page has its own
 * address.
 *
 * It must divide HOME_CASINOS_PER_PAGE. The derivation below reads the page
 * size back from the response rather than assuming it, because the server
 * clamps what it is asked for.
 */
const HOME_CASINOS_ON_MOBILE = 10

/**
 * Bonuses shown under each heading in the home page's Bonus area.
 *
 * Four — one full row of the four-up grid, and a PREVIEW rather than a listing:
 * every category now has its own paginated page, reached from the heading and
 * from the Bonus menu, so the strip's job is to show what a section is like and
 * get out of the way. It used to be sixteen, which made the home page four
 * screens of bonus cards before the news strip.
 *
 * A phone shows the first two of those four — the grid is one column there, so
 * four cards is four full screens of scrolling for one heading. The other two
 * are hidden in CSS rather than dropped from the payload: nothing is lost,
 * because the heading links to the category's own page where all of them are.
 */
const HOME_BONUSES_PER_CATEGORY = 4

/** Of those four, how many a phone shows. The rest are hidden below `sm`. */
const HOME_BONUSES_ON_MOBILE = 2

type Props = { searchParams: Promise<{ category?: string; country?: string; page?: string; half?: string }> }

/**
 * Resolve the country, then the category WITHIN it.
 *
 * Order matters: country is the outer filter, so the category list is fetched
 * scoped to it. A category that holds nothing in the chosen country therefore
 * does not appear at all, and the default selection falls to one that does —
 * which is why a visitor never lands on an empty list after switching country.
 */
async function resolveFilters(searchParams: Props['searchParams']) {
  const sp = await searchParams

  // Countries grouped by continent, each with its flag and its per-site casino
  // count. The facet endpoint carries the same counts but is a flat list with
  // no continent and no flag, and the filter needs both to group and to render.
  // Null means the site has countries switched off — the filter then renders
  // nothing, exactly as an empty list does.
  const continents = (await getCountries())?.data ?? []
  const countries = continents.flatMap((c) => c.countries ?? []).filter((c) => (c.casinos_count ?? 0) > 0)

  // Ignore a country that is not on offer — a stale or hand-edited link must
  // fall back to "all countries" rather than showing an empty site.
  const country =
    sp.country && countries.some((c) => c.slug === sp.country) ? sp.country : undefined

  const categories = (await getCategories(country)).data
  const selected =
    sp.category && categories.some((c) => c.slug === sp.category)
      ? sp.category
      : categories[0]?.slug

  // A page number that is absent, zero, negative or not a number at all falls
  // back to 1 — a hand-edited or stale link must land on the first page rather
  // than on an empty section.
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)

  /*
   * Which HALF of the server page a phone is looking at.
   *
   * The casino list is sliced by the server in twenties, which is a desktop
   * page. A phone shows ten, so each server page is two phone pages, and this
   * says which one. Anything other than "2" is the first half, so a hand-edited
   * value degrades to the top of the page rather than to an empty list.
   *
   * It is a URL parameter rather than component state on purpose: the phone
   * paginator is then made of real links, the markup is identical before and
   * after hydration, and a visitor can share or reload the page they are on.
   */
  const half = sp.half === '2' ? 2 : 1

  return { categories: categories as Category[], selected, continents, countries, country, page, half }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = `${COPY.home.homeTitle} ${YEAR} | ${SITE_NAME}`
  const description = COPY.home.metaDescription
  return {
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', url: '/', siteName: SITE_NAME, title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function HomePage({ searchParams }: Props) {
  const { categories, selected, continents, countries, country, page, half } = await resolveFilters(searchParams)

  const [categoryRes, offersRes, anyOffersRes, bestNewsRes, bonusRes] = await Promise.allSettled([
    selected ? getCategory(selected, page, country, HOME_CASINOS_PER_PAGE) : Promise.resolve(null),
    getSpecialOffers(selected, 6),
    // Site-wide, unfiltered, limit 1 — just "does a visible offer exist at all?".
    // Runs alongside the others, so it costs no extra round-trip of latency, and
    // the public endpoint already excludes offers whose visibility is off.
    getSpecialOffers(undefined, 1),
    // The editor's picks. allSettled, so a news outage cannot take the home
    // page down with it — the strip simply does not render.
    getBestNews(),
    // Drives the Bonus sections below, and the header dropdown above.
    getBonusArea({ limit: HOME_BONUSES_PER_CATEGORY }),
  ])

  const catData =
    categoryRes.status === 'fulfilled' && categoryRes.value ? categoryRes.value.data : null
  const casinos: CasinoWithAttachment[] = catData?.casinos ?? []
  const activeCategory = catData?.category ?? null
  // "See More" is only an affordance when there is actually more: compare the
  // category's full count against the rows this page received, rather than
  // hard-coding the page size on both sides where the two could drift apart.
  // Pagination for the section. Read from the RESPONSE rather than recomputed
  // from HOME_CASINOS_PER_PAGE, so the numbering cannot drift from what the
  // server actually paginated by (it clamps the requested size).
  const casinoPage = catData?.meta?.current_page ?? 1
  const casinoLastPage = catData?.meta?.last_page ?? 1
  const casinoPerPage = catData?.meta?.per_page ?? HOME_CASINOS_PER_PAGE
  // Ranks continue across pages: the first card on page 2 is #21, not #1.
  const rankOffset = (casinoPage - 1) * casinoPerPage

  /*
   * THE PHONE'S OWN PAGINATION, derived from the server's.
   *
   * The server slices in twenties; a phone shows ten. So each server page is
   * two phone pages, and the phone's paginator counts in tens over the whole
   * total: 25 casinos is 2 server pages (20 + 5) and 3 phone pages (10, 10, 5).
   *
   * Nothing is fetched twice for this. The twenty rows of the current server
   * page are rendered once, and which ten of them a phone shows is a CSS rule
   * chosen by `half` — so the phone paginator is links over markup that is
   * already there, and every card stays in the HTML for the crawler and for the
   * ItemList schema.
   *
   * `pagesPerServerPage` is computed rather than assumed to be 2: the server
   * clamps the requested size, so the only honest source for it is the `meta`
   * that came back.
   */
  const casinoTotal = catData?.meta?.total ?? casinos.length
  /*
   * A server page whose rows do not fill two phone pages has only a first half.
   * No link ever asks for the second one, but a hand-edited or stale `half=2`
   * would otherwise hide every card on the last page and show an empty list —
   * the same failure the country and category guards above exist to prevent.
   */
  const casinoHalf = half === 2 && casinos.length > HOME_CASINOS_ON_MOBILE ? 2 : 1
  const pagesPerServerPage = Math.max(1, Math.ceil(casinoPerPage / HOME_CASINOS_ON_MOBILE))
  const casinoMobileLastPage = Math.max(1, Math.ceil(casinoTotal / HOME_CASINOS_ON_MOBILE))
  const casinoMobilePage = Math.min(
    casinoMobileLastPage,
    (casinoPage - 1) * pagesPerServerPage + casinoHalf,
  )

  /**
   * Base URL for the paginator, carrying the current category and country.
   *
   * Without them, paging would silently reset the visitor's filters — the
   * chips would still read "Free Spins" while the list showed Most Popular.
   * Pagination appends its own `page`, and picks the right separator.
   */
  const casinosBasePath = (() => {
    const qs = new URLSearchParams()
    if (selected) qs.set('category', selected)
    if (country) qs.set('country', country)
    const query = qs.toString()
    return query ? `/?${query}` : '/'
  })()
  /**
   * Link for one PHONE page of the casino list.
   *
   * Maps a page counted in tens back onto the server page that contains it,
   * plus which half of that page to show. `half=1` is the default, so it is
   * left out of the URL and the first phone page of a server page is the same
   * address the desktop paginator already uses.
   */
  const casinoMobileHref = (mobilePage: number): string => {
    const serverPage = Math.ceil(mobilePage / pagesPerServerPage)
    const whichHalf = mobilePage - (serverPage - 1) * pagesPerServerPage
    const separator = casinosBasePath.includes('?') ? '&' : '?'

    return `${casinosBasePath}${separator}page=${serverPage}${whichHalf > 1 ? `&half=${whichHalf}` : ''}`
  }

  // Offers are already scoped to the selected category and capped by the backend (?category=&limit=).
  const topOffers: SpecialOffer[] = offersRes.status === 'fulfilled' ? offersRes.value.data : []
  const bonusSections: BonusSection[] = bonusRes.status === 'fulfilled' ? bonusRes.value : []
  const bestNews: Article[] = bestNewsRes.status === 'fulfilled' ? bestNewsRes.value : []

  // Whether ANY special offer is visible on this site. Drives the hero CTA:
  // a button leading to an empty page is worse than no button. On a failed
  // request this stays false, so the CTA hides rather than promising content
  // that may not be there.
  const anyOffersVisible: boolean =
    anyOffersRes.status === 'fulfilled' && anyOffersRes.value.data.length > 0

  // Organization schema is emitted site-wide from the root layout; the home
  // page only adds its page-specific ItemList of top casinos.
  //
  // The list is the SELECTED category, not the whole catalogue, so it is named
  // and addressed as that category — it previously claimed the generic name
  // "Top Casinos at <brand>" and pointed at /casinos, describing neither the
  // rows below it nor a URL that renders them.
  const listSchema = buildItemListSchema(
    activeCategory ? `${activeCategory.name} — ${COPY.home.topCasinosTitle}` : COPY.home.topCasinosTitle,
    selected ? `${SITE_URL}/categories/${selected}` : `${SITE_URL}/casinos`,
    casinos.map((c, i) => ({ position: rankOffset + i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )

  const graph = [
    buildWebPageSchema({
      // Mirrors the actual <title>. The previous "Best Online Casinos <year>"
      // was generic boilerplate shipped identically by the sibling domains and
      // matched neither this page's title nor its H1.
      name: `${COPY.home.homeTitle} ${YEAR}`,
      url: SITE_URL,
      description: COPY.home.metaDescription,
    }),
    listSchema,
    // Same array the section below renders — markup-only FAQ is a violation.
    buildFaqSchema(SITE_URL, FAQ_ITEMS),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main>
        {/* Hero.
            Vertical rhythm is deliberately tight on a phone: py-10 there and
            py-24 at `lg`. A hero that eats the whole first screen on a 375px
            device is a hero nobody scrolls past, and the casino list below it is
            what visitors came for. */}
        <section className="relative isolate overflow-hidden px-4 py-10 sm:px-6 sm:py-16 lg:py-24">
          {/* Atmosphere: concentric rings and faint spokes radiating from behind
              the headline, with an emerald bloom over them. All three are pure
              CSS gradients — no image to download, nothing announced to a screen
              reader. The masks are what keep them from reading as a texture laid
              flat over the page: each fades to nothing well before the section's
              edges, so the eye sees light behind the words rather than a
              pattern. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-[64rem] w-[64rem] max-w-[200%] -translate-x-1/2 -translate-y-1/2 bg-[repeating-radial-gradient(circle,rgba(15,23,42,0.055)_0px,rgba(15,23,42,0.055)_1px,transparent_1px,transparent_58px)] [mask-image:radial-gradient(circle,#000_20%,rgba(0,0,0,0.55)_45%,transparent_72%)]" />
            <div className="absolute left-1/2 top-1/2 h-[64rem] w-[64rem] max-w-[200%] -translate-x-1/2 -translate-y-1/2 bg-[repeating-conic-gradient(from_0deg_at_50%_50%,rgba(15,23,42,0.05)_0deg,rgba(15,23,42,0.05)_0.3deg,transparent_0.3deg,transparent_7.5deg)] [mask-image:radial-gradient(circle,transparent_14%,#000_40%,transparent_70%)]" />
            <div className="absolute left-1/2 top-[-14%] h-[32rem] w-[56rem] max-w-[150%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.22),rgba(13,148,136,0.08)_45%,transparent_70%)] blur-2xl" />
          </div>

          <div className="mx-auto max-w-5xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 sm:px-5 sm:text-xs sm:tracking-[0.2em]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              {COPY.home.heroEyebrow}
            </p>

            {/* A NARROWER measure than the section, so the headline breaks into
                two balanced lines instead of one very long one — at this size a
                single line would run past 1,000px and lose the reader between
                "Play" and "fair". */}
            <h1 className="mx-auto mt-6 max-w-3xl font-display text-[2.25rem] font-semibold leading-[1.06] tracking-tight text-balance text-slate-900 sm:mt-8 sm:text-5xl lg:text-[4rem] xl:text-[4.5rem]">
              {COPY.home.heroHeadline}{' '}
              {/* Two things this span has to survive: `inline-block` so the
                  gradient fill is never split across a line break — a clipped
                  background on a wrapped inline element restarts, and the second
                  line came out pale; and the padding, because `bg-clip-text`
                  paints only INSIDE the element's box. At this leading the box
                  ends above the italic `y`'s tail, so the descender in "plays"
                  was being sliced off. The negative margin gives the paint room
                  back without moving the line. */}
              <span className="inline-block bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text pb-[0.22em] align-baseline italic text-transparent -mb-[0.22em]">
                {COPY.home.heroHighlight}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-500 sm:mt-7 sm:max-w-2xl sm:text-lg">
              {COPY.home.heroSubtitle}
            </p>

            {/* Buttons: full width on a phone, where two half-width pills are
                two cramped targets, and side by side from `sm`. */}
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center">
              <Link
                href="/casinos"
                className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-600/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                {COPY.home.featuredCasinos}
                {/* Decorative: the label already says where this goes. */}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">&rarr;</span>
              </Link>
              {anyOffersVisible && (
                <Link
                  href="/special-offers"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-3.5 font-semibold text-slate-700 shadow-[0_6px_20px_-10px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 transition-colors hover:text-emerald-700 hover:ring-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                >
                  {COPY.home.specialOffers}
                </Link>
              )}

              {/* Third control, and deliberately the quietest of the three: it
                  does not leave the page, it scrolls to the sign-up form at the
                  bottom of it. A plain <a>, not <Link> — Next's router has
                  nothing to do for a same-page fragment, and an anchor is what
                  makes the browser's own jump (and `motion-safe:scroll-smooth`)
                  work. Rendered only when capture is switched on, or it would
                  point at an element the footer never wrote.

                  Arrow DOWN, because that is the direction the page moves. */}
              {SUBSCRIBE_ENABLED && (
                <a
                  href={`#${NEWSLETTER_ANCHOR}`}
                  className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-emerald-50 py-3 pl-7 pr-3 font-semibold text-emerald-700 ring-1 ring-emerald-200 transition-all hover:-translate-y-0.5 hover:bg-emerald-100 hover:ring-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {COPY.home.heroSubscribe}
                  {/* The arrow sits in its own disc, which is what makes this
                      read as a button rather than a link that happens to carry a
                      glyph. A drawn arrow, not the `↓` character: that glyph's
                      weight and height change with the font, so it never quite
                      matched the label beside it. */}
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-sm transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 4.5v11M5.5 11l4.5 4.5 4.5-4.5" />
                    </svg>
                  </span>
                </a>
              )}
            </div>

            {/* What "verified" covers, on its own card — the three checks the
                sentence above names. Wording only: a count or a score here would
                be a measurement nobody took.

                The card is what stops this reading as three loose captions under
                the buttons. It stacks on a phone (no dividers, nothing to
                squeeze) and becomes one row with hairline dividers from `sm`.

                On a PHONE the card is mint rather than white: against the pale
                hero a white panel reads as another empty surface, while the
                site's verified-green says what the three lines are about before
                any of them is read. From `sm` it goes back to white — there it
                is one wide strip under the buttons, and tinting the full width
                would weigh more than the words on it.

                The phone layout is a single-column GRID of `max-content`, not a
                flex column: that makes every row as wide as the WIDEST label, so
                the three ticks share one left edge while the block stays centred
                in the card. Centring each row on its own left three ragged
                starts. */}
            <ul className="mx-auto mt-8 grid w-full max-w-3xl grid-cols-[max-content] justify-center gap-3 rounded-2xl bg-emerald-50 px-5 py-4 text-base font-medium text-emerald-950 shadow-[0_10px_30px_-18px_rgba(6,78,59,0.35)] ring-1 ring-emerald-200/80 backdrop-blur sm:mt-12 sm:flex sm:bg-white/90 sm:text-slate-700 sm:shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] sm:ring-slate-200/70 sm:w-auto sm:flex-row sm:items-center sm:gap-0 sm:px-2" role="list">
              {COPY.home.heroChecks.map((check, i) => (
                <li
                  key={check}
                  className={`flex items-center gap-2.5 sm:px-5 ${i > 0 ? 'sm:border-l sm:border-slate-200' : ''}`}
                >
                  <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 10.5l3.5 3.5L15 6.5" />
                    </svg>
                  </span>
                  {check}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Casinos by category */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8" aria-labelledby="top-casinos-heading">
          {/* The same 90rem measure as Bonus, News and FAQ below, so the four
              strips share their edges; the rows themselves grow with `large`. */}
          <div className="mx-auto max-w-[90rem]">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="top-casinos-heading" className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{COPY.home.topCasinosTitle}</h2>
                <p className="mt-1 text-slate-500">{COPY.home.topCasinosSubtitle}</p>
              </div>
              {selected && (
                <Link href={`/categories/${selected}`} className="inline-block -mx-1 px-1 py-3 -my-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap">{COPY.home.viewAll} →</Link>
              )}
            </div>

            {/* Country first, categories nested inside it. The country filter
                renders independently of the categories: it must stay reachable
                even if the chosen country leaves no categories to show, or a
                visitor could narrow into a dead end with no way back. */}
            {countries.length > 0 && (
              <div className="mb-4">
                <CountryNav continents={continents} selected={country} />
              </div>
            )}

            {categories.length > 0 && selected && (
              <div className="mb-8">
                <CategoryNav categories={categories} selected={selected} basePath="/" country={country} />
              </div>
            )}

            {/* TWO per row from lg up. One card per full 90rem row left a wide
                empty band between the bonus and the buttons — the content is the
                same, so the fix is to give it half the width rather than to
                invent something to fill it.

                `large` is deliberately NOT passed to CasinoCard any more: that
                variant exists for a full-width row (bigger logo, more padding,
                taller minimum) and at half the measure it reads as padding for
                its own sake. The default is the variant built for a narrower
                column — the same one the listing pages use. */}
            {casinos.length === 0 ? (
              <p className="text-slate-500">{COPY.casinos.noResults}</p>
            ) : (
              /* All twenty rows of the server page are rendered; below `sm` a
                 CSS rule shows the ten belonging to the phone page, and the
                 phone paginator below swaps which ten by changing `half`.
                 Both rules are written out as literals because Tailwind scans
                 source text — a class name assembled at runtime is never
                 generated. */
              <ol
                className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 ${
                  casinoHalf === 2 ? 'max-sm:[&>*:nth-child(-n+10)]:hidden' : 'max-sm:[&>*:nth-child(n+11)]:hidden'
                }`}
              >
                {casinos.map((casino, i) => (
                  <CasinoCard key={casino.id} casino={casino} rank={rankOffset + i + 1} compact />
                ))}
              </ol>
            )}

            {/* Two paginators, one per breakpoint, because the two sizes of a
                page are genuinely different: twenty on a desktop, ten on a
                phone. 25 casinos is "1 2" here and "1 2 3" below.

                Replaces the old "See More" button, whose condition was exactly
                "there is more than one page" — the paginator owns that, and
                showing both put two different ways forward under one list. The
                section heading still carries "View All →" for anyone who wants
                the full filterable catalog instead. */}
            <Pagination
              basePath={casinosBasePath}
              current={casinoPage}
              last={casinoLastPage}
              className="max-sm:hidden"
            />
            <Pagination
              basePath={casinosBasePath}
              current={casinoMobilePage}
              last={casinoMobileLastPage}
              hrefFor={casinoMobileHref}
              className="sm:hidden"
            />
          </div>
        </section>

        {/* Bonus — one heading, then a section per category.
        
            This replaced the single Special Offers block. Special Offers did not
            disappear: it is now the first CATEGORY under Bonus, and the migration
            filed every existing offer into it, so what a reader saw here before
            is still here under the same name with a heading above it.
        
            Both the sections and the header dropdown come from the same payload,
            so a menu entry cannot point at a section that is not rendered. */}
        {bonusSections.length > 0 && (
          <section className="border-t border-slate-200/70 bg-white/40 px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="bonus-heading">
            {/* Same 90rem measure and compact four-up grid as the News strip
                below: the section is a menu of offers, and three wide cards
                left a third of a large screen empty on each side. The server
                caps each category at eight — two full rows. */}
            <div className="mx-auto max-w-[90rem]">
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2 id="bonus-heading" className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{COPY.home.bonus}</h2>
                <Link href="/special-offers" className="hidden py-3 -my-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700 sm:block whitespace-nowrap">{COPY.home.viewAll} →</Link>
              </div>
        
              <div className="space-y-12">
                {bonusSections.map((section) => (
                  /* id is what the header dropdown links to (/#bonus-slug), and
                     scroll-mt clears the sticky header so the heading is not hidden
                     under it on arrival. */
                  /* The id stays: /#bonus-<slug> links are in the wild, and
                     scroll-mt clears the sticky header on arrival. The menu no
                     longer uses them — every entry now opens the category's own
                     page, which is what this heading links to as well. */
                  <div key={section.id} id={`bonus-${section.slug}`} className="scroll-mt-24">
                    <div className="mb-5">
                      <h3 className="font-display text-xl font-semibold text-slate-900">
                        {/* The heading IS the way into the section. A title that
                            names a category and leads nowhere is the thing a
                            reader tries to click first. */}
                        <Link
                          href={`/bonuses/${section.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-lg transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                        >
                          {section.name}
                          <span aria-hidden className="text-base text-emerald-600">→</span>
                        </Link>
                      </h3>
                      {section.description && <p className="mt-1 text-slate-500">{section.description}</p>}
                    </div>
                    {/* A phone shows the first two of the four; the rest are in
                        the markup but hidden, and the heading above leads to the
                        page that holds every one of them. */}
                    <div className="grid grid-cols-1 gap-5 max-sm:[&>*:nth-child(n+3)]:hidden sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {section.offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} compact />)}
                    </div>
                    {/* Every category block ends the same way it begins: a link
                        into that category's own page. The heading is the one a
                        reader clicks on the way in, this is the one they reach
                        after reading the cards, and both go to the same place —
                        four cards is a preview, and the page behind them holds
                        the rest, eight at a time.

                        Full width on a phone, where it is also the control that
                        gets past the two visible cards; inline on a desktop,
                        where it is a quiet way on. */}
                    <div className="mt-5">
                      <Link
                        href={`/bonuses/${section.slug}`}
                        aria-label={`${COPY.home.seeMore} — ${section.name}`}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700 sm:w-auto"
                      >
                        {COPY.home.seeMore} →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
        
              <div className="mt-10 text-center">
                {/* Named for where it goes. "See More" sat under six blocks
                    that each now have their own "See more", and the two meant
                    different things: those lead into one category, this one
                    leads to every bonus on the site. */}
                <Link href="/special-offers" aria-label={COPY.home.seeAllBonuses} className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">
                  {COPY.home.seeAllBonuses} →
                </Link>
              </div>
            </div>
          </section>
        )}
        {/* Best News — the editor's picks, directly under Special Offers.
            Renders only when something has been promoted: an empty strip with a
            heading advertises a section nobody is maintaining, which is worse
            than not having one. */}
        {bestNews.length > 0 && (
          <section className="border-t border-slate-200/70 px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="news-heading">
            {/* Same 90rem measure as the FAQ below, and COMPACT cards — four
                across on desktop rather than three wide ones. A news strip is
                a menu of headlines, not the article, so each card only needs a
                thumbnail, a title and two lines of standfirst. The server caps
                the picks at eight: two full rows, never a ragged third. */}
            <div className="mx-auto max-w-[90rem]">
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2 id="news-heading" className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{COPY.home.news}</h2>
                <Link href="/news" className="hidden py-3 -my-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700 sm:block whitespace-nowrap">{COPY.home.viewAll} →</Link>
              </div>

              {/* The strip's own heading, one level down — the same two-tier
                  shape the Bonus block above uses, where the section names
                  itself and each strip inside it says what it is. */}
              <h3 className="mb-5 font-display text-xl font-semibold text-slate-900">{COPY.home.bestNews}</h3>

              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
                {bestNews.map((post) => {
                  const hero = resolveImageUrl(post.hero_image_path)

                  return (
                    <li key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
                      <Link href={`/news/${post.slug}`} className="flex h-full flex-col">
                        {hero && (
                          <div className="relative aspect-[16/9] bg-slate-100">
                            <Image src={hero} alt={post.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 340px" />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col p-4">
                          <h3 className="font-display text-base font-bold leading-snug text-slate-900">{post.title}</h3>
                          {post.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{post.excerpt}</p>}
                          {/* "11 days ago", matching every other place a news
                              card appears. This strip was the one surface still
                              printing an absolute date. */}
                          {post.published_at && (
                            <p className="mt-auto pt-3 text-xs text-slate-400">
                              <time dateTime={post.published_at}>{relativeTime(post.published_at)}</time>
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-8 text-center">
                <Link href="/news" aria-label="See all news" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">{COPY.home.bestNewsAll} →</Link>
              </div>
            </div>
          </section>
        )}

        {/* FAQ — rendered visibly because FAQPage structured data requires it.
            Wider than the rest of the page (90rem, not the 6xl the listings
            use) and with roomier cards on desktop: a block of prose reads better with a
            longer measure than a list of casino cards does, and the old
            max-w-3xl column left a third of the screen empty on each side.
            Three-up card grid, two-up on tablets, one column on phones. */}
        <section className="border-t border-slate-200/70 px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-[90rem]">
            <h2 id="faq-heading" className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{COPY.home.faqTitle}</h2>
            <dl className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
              {FAQ_ITEMS.map((item, i) => (
                <div key={item.question} className={`${faqSpan(i)} rounded-2xl border border-slate-200/70 bg-white/60 p-6 lg:p-8 shadow-sm`}>
                  <dt className="font-semibold text-slate-900 text-base lg:text-lg">{item.question}</dt>
                  <dd className="mt-3 text-sm leading-relaxed text-slate-600 lg:text-base">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </>
  )
}
