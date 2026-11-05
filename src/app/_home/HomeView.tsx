import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { resolveImageUrl } from '@/lib/images'
import { getBestNews, getCategories, getCategory, getCountries, getSpecialOffers , getBonusArea } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, buildFaqSchema, SHARE_IMAGES } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { FAQ_ITEMS } from '@/constants/faq'
import CasinoCard from '@/components/CasinoCard'
import Pagination from '@/components/Pagination'
import { canonicalPath } from '@/lib/seo/canonical'
import BonusCategoryNav from '@/components/BonusCategoryNav'
import CategoryNav from '@/components/CategoryNav'
import CountryNav from '@/components/CountryNav'
import { countryNavContinents } from '@/lib/countryNav'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { Article } from '@shared/types/article'
import type { BonusSection } from '@/lib/api'
import { SITE_URL } from '@/lib/config'
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
 * Casinos shown per page in the home page's category section — on EVERY screen.
 *
 * This surface only. The server's own page size still governs /casinos,
 * /categories/[slug] and the other sites — it is a shared constant, so changing
 * it there would have moved every listing in the network.
 *
 * One number for every device, which is what makes the paginator mean the same
 * thing everywhere: 25 casinos is three pages (10 + 10 + 5) on a phone and on a
 * desktop, and page 2 is the same ten casinos to both. This replaced a 20-row
 * desktop page that a phone split in half through a `half` parameter — two page
 * sizes meant two page numberings for one URL, and a link shared between devices
 * landed on different casinos.
 */
const HOME_CASINOS_PER_PAGE = 10

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

/**
 * What the home page varies by. Read by `app/page.tsx` (`/`, no filter) and by
 * the internal `app/home-view/[country]/[page]` route that `/?page=` and
 * `/?country=` are rewritten to (see lib/seo/homeView.ts) — NEVER from
 * `searchParams`, which would make the home page dynamic again (SEO audit O4).
 *
 * No `category`: `/?category=<slug>` is 301'd to /categories/<slug> before it
 * gets here, so the section always shows the first category.
 */
export type HomeQuery = { country?: string; page: number }

/**
 * Resolve the country, then the category WITHIN it.
 *
 * Order matters: country is the outer filter, so the category list is fetched
 * scoped to it. A category that holds nothing in the chosen country therefore
 * does not appear at all, and the default selection falls to one that does —
 * which is why a visitor never lands on an empty list after switching country.
 */
async function resolveFilters(query: HomeQuery) {

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
    query.country && countries.some((c) => c.slug === query.country) ? query.country : undefined

  const categories = (await getCategories(country)).data
  const selected = categories[0]?.slug

  return { categories: categories as Category[], selected, continents, countries, country, page: query.page }
}

export function homeMetadata(page: number): Metadata {
  const title = `${COPY.home.homeTitle} ${YEAR} | ${SITE_NAME}`
  const description = COPY.home.metaDescription

  /*
   * PAGE 2+ OF THE HOME PAGE IS `noindex, follow`.
   *
   * The paginator under the casino section links /?page=2, /?page=3, … and
   * each answered `index` with the home page's own title and a canonical of
   * `/` — asking Google to index a page while naming another as the original.
   * What those pages add is the next ten casinos, which /casinos already lists
   * as real, self-canonical pages. So the deeper home pages stay crawlable
   * (`follow`, every casino link still counts) but out of the index, and the
   * canonical names the page itself so the two signals agree.
   */
  const canonical = page > 1 ? canonicalPath('/', page) : '/'

  return {
    // Absolute: the title already ends in the site name, and the layout's
    // `%s | <site>` template applies to app/home-view (a child segment) though
    // not to app/page.tsx — `/?page=2` would read "… | Winpalack | Winpalack".
    title: { absolute: title },
    description,
    alternates: { canonical },
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: 'website', url: canonical, siteName: SITE_NAME, title, description, images: SHARE_IMAGES },
    twitter: { card: 'summary_large_image', title, description, images: SHARE_IMAGES },
  }
}

export default async function HomeView(query: HomeQuery) {
  const { categories, selected, continents, countries, country, page } = await resolveFilters(query)

  const [categoryRes, anyOffersRes, bestNewsRes, bonusRes] = await Promise.allSettled([
    selected ? getCategory(selected, page, country, HOME_CASINOS_PER_PAGE) : Promise.resolve(null),
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

  // A page number past the end is not a page: /?page=999 rendered the home page
  // with an empty casino section, 200 and `index` — a soft 404. `page > 1` keeps
  // page 1 rendering whatever the section holds.
  if (page > 1 && page > casinoLastPage) notFound()

  /**
   * Base URL for the paginator, carrying the country filter.
   *
   * NO `category`. The home page is no longer a per-category view: the chips
   * navigate to /categories/<slug>, and `/?category=<slug>` is 301'd there at
   * the edge, so a paginator that re-added the parameter would link straight
   * into a redirect. Country stays, because paging must not silently reset the
   * visitor's filter — the nav would still read "Germany" while the list showed
   * everything.
   *
   * `Pagination` appends its own `page` through `pageHref`, which also decides
   * the separator and omits the parameter entirely for page 1.
   */
  const casinosBasePath = country ? `/?country=${encodeURIComponent(country)}` : '/'
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
            Vertical rhythm is deliberately tight on a phone: py-7 there and
            py-20 at `lg`. A hero that eats the whole first screen on a 375px
            device is a hero nobody scrolls past, and the casino list below it is
            what visitors came for. */}
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-emerald-50/30 px-4 py-7 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          {/* Atmosphere: soft concentric rings low on the right, under the
              check card, with a faint emerald bloom. Pure CSS — nothing to
              download, nothing announced. The ring mask fades well before the
              edges, so it reads as light rather than a pattern. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute bottom-[-30rem] right-[-22rem] h-[56rem] w-[56rem] bg-[repeating-radial-gradient(circle,rgba(15,118,110,0.07)_0px,rgba(15,118,110,0.07)_1px,transparent_1px,transparent_68px)] [mask-image:radial-gradient(circle,#000_25%,rgba(0,0,0,0.5)_50%,transparent_70%)] lg:bottom-[-34rem] lg:right-[-14rem]" />
            <div className="absolute bottom-[-6rem] right-[-4rem] h-[26rem] w-[34rem] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.10),transparent_70%)] blur-2xl" />
          </div>

          {/* Two columns from `xl`: the pitch on the left, the check card at
              the top right, level with the eyebrow. Below `xl` they stack,
              card under the buttons, so a phone reads headline -> action ->
              proof. Not from `lg`: at 1024px the 40rem card left the headline
              a ~250px column, one word per line. */}
          <div className="mx-auto grid max-w-[90rem] items-start gap-6 sm:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,40rem)] xl:gap-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800 ring-1 ring-emerald-200/80 sm:gap-2.5 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.2em]">
                {/* Dot with a soft halo, a live-status mark. */}
                <span aria-hidden className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-emerald-200/70">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                {COPY.home.heroEyebrow}
              </p>

              {/* The highlight runs INLINE after "house", and the measure is
                  capped in `ch`, so the headline breaks as "Play where the /
                  house plays fair" at every width that fits two lines. The
                  padding and negative margin give `bg-clip-text` room for the
                  italic descenders, which it would otherwise slice off. */}
              <h1 className="mt-4 max-w-[11ch] font-display text-[2.25rem] font-semibold leading-[1.04] tracking-tight text-slate-900 sm:mt-6 sm:text-6xl lg:text-[4.25rem] xl:text-[4.75rem]">
                {COPY.home.heroHeadline}{' '}
                <span className="bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text pb-[0.18em] pr-[0.06em] italic text-transparent -mb-[0.18em]">
                  {COPY.home.heroHighlight}
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-pretty text-[15px] leading-relaxed text-slate-600 sm:mt-6 sm:text-xl">
                {COPY.home.heroSubtitle}
              </p>

              {/* Stacked full-width on a phone so each label fits on one line at a
                  readable size; side by side from `sm`, where both share one
                  fixed width (`sm:w-64`) so neither reads as the lesser choice.
                  The primary button jumps to the list on this page, hence the
                  down arrow. */}
              <div className="mt-5 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:items-center sm:gap-3">
                <Link
                  href="#verified-casinos"
                  className="group inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold sm:min-h-14 sm:w-64 sm:flex-none sm:gap-3 sm:px-6 sm:text-lg text-white shadow-[0_14px_30px_-12px_rgba(15,23,42,0.55)] transition-all hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {COPY.home.featuredCasinos}
                  {/* Decorative: the label already says where this goes. */}
                  <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-emerald-400 sm:h-5 sm:w-5 transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 4v12M5 11l5 5 5-5" />
                  </svg>
                </Link>
                {anyOffersVisible && (
                  <Link
                    href="/special-offers"
                    className="inline-flex min-h-[3.25rem] w-full items-center justify-center whitespace-nowrap rounded-xl bg-white px-6 py-3 text-base font-semibold sm:min-h-14 sm:w-64 sm:flex-none sm:px-6 sm:text-lg text-slate-900 ring-1 ring-slate-200 transition-colors hover:text-emerald-700 hover:ring-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  >
                    {COPY.home.heroOffersCta}
                  </Link>
                )}
              </div>
            </div>

            {/* The check card: what "verified" covers, as the listing rule
                every casino on this site passed — so "3/3" is a property of the
                list, not a score measured for any one casino. Three chips side
                by side below `lg`; on a phone each stacks its tick over its label
                so three fit in one row. At `lg` the card spans the hero, wide
                enough for three one-line chips. From `xl` it shares the row with
                the pitch and is too narrow for that, so they become a list of
                full-width rows instead — every label still on ONE line, and the
                card grows to match the headline beside it. */}
            <div className="rounded-2xl bg-white p-4 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.30)] ring-1 ring-slate-200/70 sm:rounded-3xl sm:p-6 lg:p-8 xl:p-10">
              <div className="flex items-center gap-3 sm:gap-3.5 lg:gap-4">
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 lg:h-14 lg:w-14 lg:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/25">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l7 3v5.5c0 4.3-2.9 7.2-7 8.5-4.1-1.3-7-4.2-7-8.5V6l7-3z" />
                    <path d="M9 12l2.2 2.2L15.5 10" />
                  </svg>
                </span>
                <p className="min-w-0 flex-1 font-display text-lg font-semibold text-slate-900 sm:text-2xl lg:text-3xl">{COPY.home.heroCard.title}</p>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold sm:px-3 sm:py-1 sm:text-sm lg:px-3.5 lg:py-1.5 lg:text-base text-emerald-800 tabular-nums ring-1 ring-emerald-100">
                  <span className="sr-only">{COPY.home.heroCard.badgeLabel} </span>
                  {COPY.home.heroChecks.length}/{COPY.home.heroChecks.length}
                </span>
              </div>

              <ul className="mt-3 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-2.5 lg:mt-7 lg:gap-3 xl:grid-cols-1" role="list">
                {COPY.home.heroChecks.map((check) => (
                  <li key={check} className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-2.5 text-center text-[13px] font-medium leading-tight text-slate-800 sm:flex-row sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3.5 sm:text-left sm:text-base sm:leading-snug lg:gap-4 lg:whitespace-nowrap lg:px-5 lg:py-4 xl:px-6 xl:py-5 xl:text-xl">
                    <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-white sm:h-6 sm:w-6 lg:h-8 lg:w-8">
                      <svg viewBox="0 0 20 20" className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 10.5l3.5 3.5L15 6.5" />
                      </svg>
                    </span>
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Casinos by category */}
        <section id="verified-casinos" className="scroll-mt-24 px-4 pb-10 pt-6 sm:px-6 sm:pb-20 sm:pt-0 lg:px-8" aria-labelledby="top-casinos-heading">
          {/* The same 90rem measure as Bonus, News and FAQ below, so the four
              strips share their edges; the rows themselves grow with `large`. */}
          <div className="mx-auto max-w-[90rem]">
            <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
              <div>
                <h2 id="top-casinos-heading" className="font-display text-2xl font-semibold text-slate-900 sm:text-4xl">{COPY.home.topCasinosTitle}</h2>
                <p className="mt-1 text-sm text-slate-500 sm:text-base">{COPY.home.topCasinosSubtitle}</p>
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
              <div className="mb-3 sm:mb-4">
                <CountryNav continents={countryNavContinents(continents)} selected={country} />
              </div>
            )}

            {categories.length > 0 && selected && (
              <div className="mb-5 sm:mb-8">
                <CategoryNav categories={categories} selected={selected} country={country} />
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
              <>
              <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
                {casinos.map((casino, i) => (
                  <CasinoCard key={casino.id} casino={casino} rank={rankOffset + i + 1} compact />
                ))}
              </ol>
              </>
            )}

            {/* One paginator, counting the same tens on every screen — so a
                link to page 2 is the same ten casinos whoever opens it.

                Replaces the old "See More" button, whose condition was exactly
                "there is more than one page" — the paginator owns that, and
                showing both put two different ways forward under one list. The
                section heading still carries "View All →" for anyone who wants
                the full filterable catalog instead. */}
            <Pagination basePath={casinosBasePath} current={casinoPage} last={casinoLastPage} />
          </div>
        </section>

        {/* Bonus types — directly under the casino list.

            The casinos are what visitors came for, so they come first under
            the hero; the bonus-type chips follow as the next way in, just
            above the Bonus sections they lead to.

            It renders nothing when the site publishes no Bonus area or every
            type is empty, so the band collapses rather than leaving a gap. */}
        {bonusSections.length > 0 && (
          <section className="px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
            <div className="mx-auto max-w-[90rem]">
              {/*
                * The chips sit on their own tinted panel rather than on the bare
                * page.
                *
                * On the plain ground the row read as six loose buttons left over
                * from the hero; a panel makes it one control surface, which is
                * what it is. The tint is the site's own emerald→teal, kept to a
                * 50-weight wash so the WHITE chips stay the brightest thing in
                * the band — a saturated panel would turn them grey by contrast.
                *
                * The two blurred discs are the hero's radial wash, scaled down
                * and pushed into opposite corners, so this band reads as part of
                * the same surface rather than a card dropped onto it.
                */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-6 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)] ring-1 ring-emerald-100/80 sm:px-8 sm:py-8">
                {/* Decoration only. No -z-10: the panel paints its own
                    background, and a layer sent behind it would never be seen. */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.20),transparent_70%)] blur-2xl" />
                  <div className="absolute -right-20 -bottom-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.18),transparent_70%)] blur-2xl" />
                </div>

                <div className="relative">
                  <BonusCategoryNav sections={bonusSections} />
                </div>
              </div>
            </div>
          </section>
        )}

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
                {/* The section title IS a way in — it names the page it leads
                    to, so a reader who aims at it should arrive rather than
                    click nothing. No arrow or marker on it: a heading that
                    changes colour under the pointer already reads as a link,
                    and a symbol in a title competes with the word. The "View
                    all" link beside it keeps its arrow — that one is a control,
                    not a title. */}
                <h2 id="bonus-heading" className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
                  <Link href="/special-offers" className="rounded transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">{COPY.home.bonus}</Link>
                </h2>
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
                            reader tries to click first.

                            No arrow: the title carries the category's name and
                            nothing else, like the section titles above it. The
                            "See more" link under the cards is where an explicit
                            marker belongs. */}
                        <Link
                          href={`/bonuses/${section.slug}`}
                          className="rounded-lg transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                        >
                          {section.name}
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
                {/* The section title IS a way in — it names the page it leads
                    to, so a reader who aims at it should arrive rather than
                    click nothing. No arrow or marker on it: a heading that
                    changes colour under the pointer already reads as a link,
                    and a symbol in a title competes with the word. The "View
                    all" link beside it keeps its arrow — that one is a control,
                    not a title. */}
                <h2 id="news-heading" className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
                  <Link href="/news" className="rounded transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40">{COPY.home.news}</Link>
                </h2>
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
