import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories, getCategory, getSpecialOffers } from '@/lib/api'
import { buildItemListSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'
import CategoryNav from '@/components/CategoryNav'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SpecialOffer } from '@shared/types/specialOffer'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const YEAR = new Date().getFullYear()

type Props = { searchParams: Promise<{ category?: string }> }

// Resolve the selected category (default = first/highest-priority) for the home casinos section.
async function resolveCategory(searchParams: Props['searchParams']) {
  const sp = await searchParams
  const categories = (await getCategories()).data
  const selected =
    sp.category && categories.some((c) => c.slug === sp.category) ? sp.category : categories[0]?.slug
  return { categories: categories as Category[], selected }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = `Best Online Casinos ${YEAR} | ${SITE_NAME}`
  const description = `Discover the top-rated online casinos for ${YEAR}, reviewed by ${SITE_NAME} for bonuses, safety and game selection.`
  return {
    title,
    description,
    alternates: { canonical: SITE_URL },
    openGraph: { type: 'website', url: SITE_URL, siteName: SITE_NAME, title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function HomePage({ searchParams }: Props) {
  const { categories, selected } = await resolveCategory(searchParams)

  const [categoryRes, offersRes] = await Promise.allSettled([
    selected ? getCategory(selected) : Promise.resolve(null),
    getSpecialOffers(selected, 6),
  ])

  const catData =
    categoryRes.status === 'fulfilled' && categoryRes.value ? categoryRes.value.data : null
  const casinos: CasinoWithAttachment[] = catData?.casinos ?? []
  const activeCategory = catData?.category ?? null
  // Offers are already scoped to the selected category and capped by the backend (?category=&limit=).
  const topOffers: SpecialOffer[] = offersRes.status === 'fulfilled' ? offersRes.value.data : []

  // Organization schema is emitted site-wide from the root layout; the home
  // page only adds its page-specific ItemList of top casinos.
  const listSchema = buildItemListSchema(
    `Top Casinos at ${SITE_NAME}`,
    `${SITE_URL}/casinos`,
    casinos.map((c, i) => ({ position: i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listSchema) }} />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-24">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 backdrop-blur">
              {COPY.home.heroEyebrow}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl">
              The internet&rsquo;s most refined{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text italic text-transparent">casino guide</span>
            </h1>
            {/*<p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">*/}
            {/*  Expert-reviewed, independently rated. Play only at the sites we trust for {YEAR}.*/}
            {/*</p>*/}
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/casinos" className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105">{COPY.home.featuredCasinos}</Link>
              <Link href="/special-offers" className="rounded-full border border-slate-300 bg-white/70 px-8 py-4 font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">{COPY.home.specialOffers}</Link>
            </div>
          </div>
        </section>

        {/* Casinos by category */}
        <section className="px-4 pb-20" aria-labelledby="top-casinos-heading">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="top-casinos-heading" className="font-display text-3xl font-semibold text-slate-900">Top Online Casinos</h2>
                <p className="mt-1 text-slate-500">Browse our highest-rated picks by category.</p>
              </div>
              {selected && (
                <Link href={`/casinos?category=${selected}`} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap">{COPY.home.viewAll} →</Link>
              )}
            </div>

            {categories.length > 0 && selected && (
              <div className="mb-8"><CategoryNav categories={categories} selected={selected} basePath="/" /></div>
            )}

            {casinos.length === 0 ? (
              <p className="text-slate-500">{COPY.casinos.noResults}</p>
            ) : (
              <ol className="flex flex-col gap-4">
                {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={i + 1} />)}
              </ol>
            )}

            {activeCategory && casinos.length > 0 && (
              <div className="mt-8 text-center">
                <Link href={`/casinos?category=${selected}`} aria-label={`See all ${activeCategory.name} casinos`} className="inline-flex rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700">
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
      </main>
    </>
  )
}
