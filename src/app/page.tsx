import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { resolveImageUrl } from '@/lib/images'
import { getBestNews, getCategories, getCategory, getCountries, getSpecialOffers , getBonusArea } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, buildFaqSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { FAQ_ITEMS } from '@/constants/faq'
import CasinoCard from '@/components/CasinoCard'
import CategoryNav from '@/components/CategoryNav'
import CountryNav from '@/components/CountryNav'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SpecialOffer } from '@shared/types/specialOffer'
import type { Article } from '@shared/types/article'
import type { BonusSection } from '@/lib/api'
import { SITE_URL } from '@/lib/config'

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

type Props = { searchParams: Promise<{ category?: string; country?: string }> }

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

  return { categories: categories as Category[], selected, continents, countries, country }
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
  const { categories, selected, continents, countries, country } = await resolveFilters(searchParams)

  const [categoryRes, offersRes, anyOffersRes, bestNewsRes, bonusRes] = await Promise.allSettled([
    selected ? getCategory(selected, 1, country) : Promise.resolve(null),
    getSpecialOffers(selected, 6),
    // Site-wide, unfiltered, limit 1 — just "does a visible offer exist at all?".
    // Runs alongside the others, so it costs no extra round-trip of latency, and
    // the public endpoint already excludes offers whose visibility is off.
    getSpecialOffers(undefined, 1),
    // The editor's picks. allSettled, so a news outage cannot take the home
    // page down with it — the strip simply does not render.
    getBestNews(),
    // Drives the Bonus sections below, and the header dropdown above.
    getBonusArea(),
  ])

  const catData =
    categoryRes.status === 'fulfilled' && categoryRes.value ? categoryRes.value.data : null
  const casinos: CasinoWithAttachment[] = catData?.casinos ?? []
  const activeCategory = catData?.category ?? null
  // "See More" is only an affordance when there is actually more: compare the
  // category's full count against the rows this page received, rather than
  // hard-coding the page size on both sides where the two could drift apart.
  const hasMoreCasinos = (catData?.meta?.total ?? 0) > casinos.length
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
    casinos.map((c, i) => ({ position: i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
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
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 backdrop-blur">
              {COPY.home.heroEyebrow}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
              {COPY.home.heroHeadline}{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text italic text-transparent">{COPY.home.heroHighlight}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
              {COPY.home.heroSubtitle}
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/casinos" className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105">{COPY.home.featuredCasinos}</Link>
              {anyOffersVisible && (
                <Link href="/special-offers" className="rounded-full border border-slate-300 bg-white/70 px-8 py-4 font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">{COPY.home.specialOffers}</Link>
              )}
            </div>
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

            {casinos.length === 0 ? (
              <p className="text-slate-500">{COPY.casinos.noResults}</p>
            ) : (
              <ol className="flex flex-col gap-4 lg:gap-5">
                {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={i + 1} large />)}
              </ol>
            )}

            {activeCategory && hasMoreCasinos && (
              <div className="mt-8 text-center">
                <Link href={`/categories/${selected}`} aria-label={`See all ${activeCategory.name} casinos`} className="inline-flex rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">
                  See More →
                </Link>
              </div>
            )}
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
                  <div key={section.id} id={`bonus-${section.slug}`} className="scroll-mt-24">
                    <div className="mb-5">
                      <h3 className="font-display text-xl font-semibold text-slate-900">{section.name}</h3>
                      {section.description && <p className="mt-1 text-slate-500">{section.description}</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {section.offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} compact />)}
                    </div>
                  </div>
                ))}
              </div>
        
              <div className="mt-10 text-center">
                <Link href="/special-offers" aria-label="See all special offers" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">
                  See More →
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
                          {post.published_at && (
                            <p className="mt-auto pt-3 text-xs text-slate-400">
                              <time dateTime={post.published_at}>
                                {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </time>
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
