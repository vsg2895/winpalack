import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories, getCategory, getCountries, getSpecialOffers } from '@/lib/api'
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
import { SITE_URL } from '@/lib/config'

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

  const [categoryRes, offersRes, anyOffersRes] = await Promise.allSettled([
    selected ? getCategory(selected, 1, country) : Promise.resolve(null),
    getSpecialOffers(selected, 6),
    // Site-wide, unfiltered, limit 1 — just "does a visible offer exist at all?".
    // Runs alongside the others, so it costs no extra round-trip of latency, and
    // the public endpoint already excludes offers whose visibility is off.
    getSpecialOffers(undefined, 1),
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
        <section className="px-4 pb-20" aria-labelledby="top-casinos-heading">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="top-casinos-heading" className="font-display text-3xl font-semibold text-slate-900">{COPY.home.topCasinosTitle}</h2>
                <p className="mt-1 text-slate-500">{COPY.home.topCasinosSubtitle}</p>
              </div>
              {selected && (
                <Link href={`/categories/${selected}`} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap">{COPY.home.viewAll} →</Link>
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
              <ol className="flex flex-col gap-4">
                {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={i + 1} />)}
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

        {/* Special offers */}
        {topOffers.length > 0 && (
          <section className="border-t border-slate-200/70 bg-white/40 px-4 py-20" aria-labelledby="offers-heading">
            <div className="container mx-auto max-w-6xl">
              <div className="mb-10 flex items-end justify-between gap-4">
                <h2 id="offers-heading" className="font-display text-3xl font-semibold text-slate-900">{COPY.home.specialOffers}</h2>
                <Link href="/special-offers" className="hidden text-sm font-semibold text-emerald-600 hover:text-emerald-700 sm:block whitespace-nowrap">{COPY.home.viewAll} →</Link>
              </div>
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {topOffers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} />)}
              </div>

              <div className="mt-8 text-center">
                <Link href="/special-offers" aria-label="See all special offers" className="inline-flex rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">
                  See More →
                </Link>
              </div>
            </div>
          </section>
        )}
        {/* FAQ — rendered visibly because FAQPage structured data requires it. */}
        <section className="border-t border-slate-200/70 px-4 py-20" aria-labelledby="faq-heading">
          <div className="container mx-auto max-w-3xl">
            <h2 id="faq-heading" className="font-display text-3xl font-semibold text-slate-900">{COPY.home.faqTitle}</h2>
            <dl className="mt-8 space-y-6">
              {FAQ_ITEMS.map((item) => (
                <div key={item.question} className="border-b border-slate-200/70 pb-6">
                  <dt className="font-semibold text-slate-900">{item.question}</dt>
                  <dd className="mt-2 text-slate-600">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </>
  )
}
