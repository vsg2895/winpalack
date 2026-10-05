import type { Metadata } from 'next'
import { getCategories, getCategory, getCountries } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'
import CategoryNav from '@/components/CategoryNav'
import CountryNav from '@/components/CountryNav'
import Pagination from '@/components/Pagination'
import type { Category } from '@shared/types/category'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

/**
 * Casinos per page on this listing.
 *
 * Passed explicitly rather than left to the server's own size, exactly as the
 * home page does: this surface shows the same two-up card blocks, and ten fills
 * five rows of them. The server clamps anything above 24, and the OTHER five
 * sites are untouched — `per_page` is a request parameter, not a shared
 * constant, so nothing here changes what /categories/<slug> or the sibling
 * domains paginate by.
 */
const CASINOS_PER_PAGE = 22


type Props = { searchParams: Promise<{ category?: string; page?: string; country?: string }> }

async function resolve(searchParams: Props['searchParams']) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  // Same country-then-category resolution as the home page: the country is the
  // outer filter, so the category list is fetched scoped to it and a category
  // that holds nothing in the chosen country never appears. A country that is
  // not on offer falls back to "all countries" rather than an empty listing.
  const continents = (await getCountries())?.data ?? []
  const countries = continents.flatMap((c) => c.countries ?? []).filter((c) => (c.casinos_count ?? 0) > 0)
  const country =
    sp.country && countries.some((c) => c.slug === sp.country) ? sp.country : undefined

  const categories = (await getCategories(country)).data
  // `requested` is the category the URL actually asked for; `selected` falls back
  // to the first category so the page always renders something. The two must stay
  // distinct: the canonical may only reflect what was requested, or the clean
  // /casinos URL would declare itself a duplicate of /casinos?category=<first>.
  const requested =
    sp.category && categories.some((c) => c.slug === sp.category) ? sp.category : undefined
  const selected = requested ?? categories[0]?.slug
  return { categories, requested, selected, page, continents, countries, country }
}

/**
 * The canonical URL for a listing view, carrying only the parameters that
 * genuinely change the content.
 */
function canonicalPathFor(selected: string | undefined, page: number): string {
  // Under the Option B consolidation /categories/<slug> is the canonical home of
  // a category, and /casinos?category=<slug> 301s there (see next.config). What
  // reaches this page is therefore only the bare /casinos, which renders the
  // default category — so it points at that category's canonical URL rather
  // than competing with it as a second copy of the same list.
  //
  // A PATH, not an absolute URL: Next resolves alternates.canonical and
  // openGraph.url against `metadataBase`, so the host is named once (lib/config)
  // and cannot drift per page. JSON-LD needs absolute URLs and prefixes
  // SITE_URL at its own call site.
  if (!selected) {
    return '/casinos'
  }

  return `/categories/${selected}${page > 1 ? `?page=${page}` : ''}`
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { selected, page, country } = await resolve(searchParams)
  // Page 2+ gets its own title so paginated views are not reported as duplicate
  // titles, and so a searcher landing on one knows where they are.
  const title = page > 1 ? `${COPY.casinos.pageTitle} — Page ${page}` : COPY.casinos.pageTitle
  const canonical = canonicalPathFor(selected, page)

  return {
    title,
    description: COPY.casinos.pageDescription,
    // Self-referencing canonical. Pointing page 3 back at page 1 (the previous
    // behaviour) tells Google the deeper pages are duplicates of the first, so
    // the casinos listed only on those pages never get indexed.
    alternates: { canonical },
    // A country-filtered view is a near-duplicate of the category page — keep
    // it out of the index (follow kept, so the casinos still receive the links),
    // exactly as /categories/<slug> treats its facets.
    ...(country ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: 'website', url: canonical, siteName: SITE_NAME, title, description: COPY.casinos.pageDescription },
  }
}

export default async function CasinosPage({ searchParams }: Props) {
  const { categories, selected, page, continents, countries, country } = await resolve(searchParams)

  if (!selected) {
    return (
      <main className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[90rem]">
          <h1 className="font-display text-4xl font-semibold text-slate-900">{COPY.casinos.pageTitle}</h1>
          {/* The filter stays reachable on the empty state, or a country that
              leaves no categories would be a dead end with no way back. */}
          {countries.length > 0 && (
            <div className="mt-8">
              <CountryNav continents={continents} selected={country} basePath="/casinos" />
            </div>
          )}
          <p className="mt-4 text-slate-500">{COPY.casinos.noResults}</p>
        </div>
      </main>
    )
  }

  const { category, casinos, meta } = (await getCategory(selected, page, country, CASINOS_PER_PAGE)).data
  /*
   * Paginate on THIS route.
   *
   * These links used to point at `/categories/<slug>?page=N`, so clicking "2"
   * on /casinos silently moved the visitor to a different URL — they asked for
   * the next page of the list they were reading and got a different page
   * instead. A listing paginates itself; that is the whole contract of a
   * paginator.
   *
   * `category` is deliberately NOT in the query string: next.config 301s
   * /casinos?category=<slug> to /categories/<slug>, so putting it back would
   * reintroduce the same jump through a redirect. Bare /casinos renders the
   * default category, and `page` and `country` are both carried, so page 2
   * shows the continuation of exactly the list page 1 showed.
   *
   * The SEO consolidation is untouched: `canonicalPathFor` still points every
   * page of this view at /categories/<slug>, which is what stops the two URLs
   * competing. rel=canonical is the right tool for that — moving the visitor
   * was never part of it.
   */
  const basePath = `/casinos${country ? `?country=${encodeURIComponent(country)}` : ''}`
  const cats = categories as Category[]

  const listSchema = buildItemListSchema(
    `${category.name} — ${COPY.casinos.pageTitle}`,
    `${SITE_URL}/categories/${selected}`,
    casinos.map((c, i) => ({ position: (meta.current_page - 1) * meta.per_page + i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )

  const graph = [
    buildWebPageSchema({
      name: COPY.casinos.pageTitle,
      url: `${SITE_URL}${canonicalPathFor(selected, page)}`,
      description: COPY.casinos.pageDescription,
    }),
    listSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />
      <main className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[90rem]">
          <header className="mb-8">
            <h1 className="font-display text-4xl font-semibold text-slate-900">{COPY.casinos.pageTitle}</h1>
            <p className="mt-2 text-slate-500">{COPY.casinos.pageDescription}</p>
          </header>

          {/* Country first, categories nested inside it — the same pair as the
              home page. The country filter renders independently of the
              categories so it stays reachable even when the chosen country
              leaves no categories to show. */}
          {countries.length > 0 && (
            <div className="mb-4">
              <CountryNav continents={continents} selected={country} basePath="/casinos" />
            </div>
          )}
          <div className="mb-8"><CategoryNav categories={cats} selected={selected} country={country} /></div>

          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold text-slate-900">{category.name}</h2>
            <span className="text-sm text-slate-400">{meta.total} casinos</span>
          </div>

          {casinos.length === 0 ? (
            <p className="text-slate-500">{COPY.casinos.noResults}</p>
          ) : (
            /* The home page's blocks: two compact cards per row from `md` up,
               one below it. `compact` is what makes a half-width card stay the
               height of a full-width one — see CasinoCard. */
            <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
              {casinos.map((casino, i) => (
                <CasinoCard key={casino.id} casino={casino} rank={(meta.current_page - 1) * meta.per_page + i + 1} compact />
              ))}
            </ol>
          )}

          <Pagination basePath={basePath} current={meta.current_page} last={meta.last_page} />
        </div>
      </main>
    </>
  )
}
