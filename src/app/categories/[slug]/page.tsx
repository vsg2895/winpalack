import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCasinoFacets, getCategories, getCategory, getFilteredCasinos } from '@/lib/api'
import { buildItemListSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'
import CasinoFilters from '@/components/CasinoFilters'
import Pagination from '@/components/Pagination'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = {
  params: Promise<{ slug: string }>
  // Facet values arrive as query params alongside `page`. Unknown keys are
  // ignored by the API, so a stale link cannot break the page.
  searchParams: Promise<Record<string, string | undefined>>
}

/**
 * Canonical PATH for a category view — page number only when past the first.
 *
 * A path, not an absolute URL: `alternates.canonical` and `openGraph.url` are
 * resolved by Next against `metadataBase`, so the host is named in exactly one
 * place (lib/config) and cannot drift per page. JSON-LD needs absolute URLs, so
 * the two call sites below prefix SITE_URL explicitly.
 */
function canonicalPathFor(slug: string, page: number): string {
  return `/categories/${slug}${page > 1 ? `?page=${page}` : ''}`
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  /*
   * Fails CLOSED to an empty list.
   *
   * This runs per request for a slug that was not prerendered, and
   * publicFetch throws on any non-200. Unguarded, a single blip on one
   * endpoint turned the whole route into a 500 — including for slugs that
   * simply do not exist, which should be a plain 404.
   *
   * Returning [] means "nothing is prerendered": the page still renders,
   * still fetches its own data, and still calls notFound() when the record
   * is missing. A build with no params is a slower first hit, not an outage.
   */
  try {
    const res = await getCategories()
    return res.data.map((c) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  // Any facet param means this is a filtered view.
  const isFiltered = ['country', 'licence', 'payment_method', 'provider'].some((k) => sp[k])
  try {
    const { data } = await getCategory(slug, page)
    // Distinct title per page so paginated views are never reported as duplicates.
    const title = page > 1 ? `${data.category.name} Casinos — Page ${page}` : `${data.category.name} Casinos`
    // Was `Best <name> casinos reviewed by <brand>.` — only ~50 characters and
    // formulaic. Composing the category name with this site's own line gives a
    // description long enough for a real snippet, and distinct per domain.
    const description = `${data.category.name} casinos — ${COPY.categories.categoryMetaSuffix}`
    const canonical = canonicalPathFor(slug, page)

    return {
      title,
      // Filtered views stay OUT of the index: the combinations are
      // near-duplicates of the category page. `follow` is kept so the
      // casinos they link to still receive the links.
      ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
      description,
      // Self-referencing canonical: this route is now the canonical home of a
      // category, and /casinos?category=<slug> 301s here (see next.config).
      alternates: { canonical },
      openGraph: { type: 'website', url: canonical, siteName: SITE_NAME, title, description },
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  let payload
  try {
    payload = (await getCategory(slug, page)).data
  } catch {
    notFound()
  }

  const { category, meta } = payload

  // Facets, minus `category` — this page IS a category, so offering it again
  // would let a visitor select a second one and expect both.
  const facets = (await getCasinoFacets()).filter((f) => f.facet !== 'category')

  // Which facet values the URL is asking for.
  const selected: Record<string, string> = {}
  for (const facet of facets) {
    const value = sp[facet.facet]
    if (value) selected[facet.facet] = value
  }
  const isFiltered = Object.keys(selected).length > 0

  // Unfiltered, the paginated category payload is used as-is — same request,
  // same cache entry, no behaviour change. Filtered, the full filtered set is
  // fetched instead: combining server-side pagination with facets would need a
  // paginated filter endpoint, and the honest interim is to filter within the
  // category rather than pretend the page numbers still mean the same thing.
  const casinos = isFiltered
    ? (await getFilteredCasinos({ ...selected, category: slug })).data
    : payload.casinos
  // Position continues across pages so the ItemList reflects the real ranking
  // rather than restarting at 1 on every page.
  const offset = ((meta?.current_page ?? page) - 1) * (meta?.per_page ?? casinos.length)
  const listSchema = buildItemListSchema(
    `${category.name} Casinos`,
    `${SITE_URL}${canonicalPathFor(slug, page)}`,
    casinos.map((c, i) => ({ position: offset + i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )
  const pageUrl = `${SITE_URL}${canonicalPathFor(slug, page)}`
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Categories', url: `${SITE_URL}/categories` },
      { name: category.name, url: `${SITE_URL}/categories/${slug}` },
    ],
    pageUrl,
  )
  const graph = [
    buildWebPageSchema({
      name: `${category.name} Casinos`,
      url: pageUrl,
      // The same sentence generateMetadata puts in the meta description. The
      // formulaic "Best <name> casinos reviewed by <brand>." that was here
      // survived from the template: it contradicted the description actually
      // served in the <head>, and read identically on every sibling domain.
      description: `${category.name} casinos — ${COPY.categories.categoryMetaSuffix}`,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    breadcrumb,
    listSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Same 90rem measure and `large` rows as /casinos. */}
        <div className="mx-auto max-w-[90rem]">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> / <Link href="/categories" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Categories</Link> / <span className="text-zinc-600">{category.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-zinc-900">{category.name} Casinos</h1>

          {/* Only rendered when this site actually has facets with values, so a
              category page never shows an empty control strip. */}
          <div className="mt-6">
            <CasinoFilters facets={facets} />
          </div>

          {casinos.length === 0 ? (
            <p className="mt-6 text-zinc-500">{COPY.casinos.noResults}</p>
          ) : (
            <ol className="mt-8 flex flex-col gap-4 lg:gap-5">
              {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={offset + i + 1} large />)}
            </ol>
          )}
          {/* Pagination applies to the unfiltered category only — see above for
              why a filtered view returns the whole matching set. */}
          {!isFiltered && (
            <Pagination basePath={`/categories/${slug}`} current={meta?.current_page ?? 1} last={meta?.last_page ?? 1} />
          )}
        </div>
      </main>
    </>
  )
}
