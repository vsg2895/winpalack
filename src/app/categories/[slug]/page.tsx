import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCategory, getCountries } from '@/lib/api'
import { buildItemListSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'
import CountryNav from '@/components/CountryNav'
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

/*
 * NO generateStaticParams, deliberately — this route renders on demand.
 *
 * Next classifies a dynamic route from what that function RETURNS: a non-empty
 * list builds `f` (dynamic), an EMPTY list builds a fully static route. A
 * static render then throws DYNAMIC_SERVER_USAGE, because the root layout
 * reads the session cookie for the header's account control and a static
 * render may not touch cookies — taking the whole route down with a 500 for
 * every slug, valid or not.
 *
 * Not hypothetical: that is exactly how /special-offers/[slug] broke on the
 * one site with no visible offers. It was reachable here too, because the
 * params lookup failed CLOSED to an empty list, so one API blip was enough to
 * change the build shape.
 *
 * Removing the function pins the route dynamic whatever the data does.
 * `force-dynamic` is deliberately NOT used: it would also downgrade fetchCache
 * to no-store and send every request to the API, where this leaves the
 * existing per-fetch cache and its tags exactly as they were.
 */

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  // Country is the only filter this listing offers, so it is the only thing
  // that can make this a filtered view.
  const isFiltered = Boolean(sp.country)
  try {
    const { data } = await getCategory(slug, page, sp.country)
    // Distinct title per page so paginated views are never reported as duplicates.
    const title = page > 1 ? `${data.category.name} Casinos — Page ${page}` : `${data.category.name} Casinos`
    // Was `Best <name> casinos reviewed by <brand>.` — only ~50 characters and
    // formulaic. Composing the category name with this site's own line gives a
    // description long enough for a real snippet, and distinct per domain.
    const description = `${data.category.name} casinos — ${COPY.categories.categoryMetaSuffix}`
    const canonical = canonicalPathFor(slug, page)

    return {
      title,
      // A country-filtered view stays OUT of the index: it is a near-duplicate
      // of the category page. `follow` is kept so the casinos it links to still
      // receive the links. Same treatment /casinos gives its own country facet.
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

  /*
   * COUNTRY IS THE ONLY FILTER HERE, and it filters WITHIN the category.
   *
   * This page used to carry four facet dropdowns (country, licence, payment
   * method, game provider) driven by /casinos/facets, and filtering through
   * them abandoned pagination: the whole matching set came back at once and the
   * paginator was hidden, so page numbers silently stopped meaning anything.
   *
   * The category endpoint already takes a `country`, which is what the home
   * page and /casinos filter with — so the filter is now the same control, over
   * the same parameter, and the result is still a real page of a category:
   * /categories/most-popular?country=monaco is Most Popular in Monaco, page by
   * page, ranks continuing across pages.
   *
   * An unknown or empty country falls back to the unfiltered category rather
   * than an empty list, so a stale link degrades instead of breaking.
   */
  const continents = (await getCountries())?.data ?? []
  const countries = continents.flatMap((c) => c.countries ?? []).filter((c) => (c.casinos_count ?? 0) > 0)
  const country = sp.country && countries.some((c) => c.slug === sp.country) ? sp.country : undefined

  let payload
  try {
    payload = (await getCategory(slug, page, country)).data
  } catch {
    notFound()
  }

  const { category, meta } = payload
  const casinos = payload.casinos
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
        {/* Same 90rem measure and the same card blocks as /casinos. */}
        <div className="mx-auto max-w-[90rem]">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> / <Link href="/categories" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Categories</Link> / <span className="text-zinc-600">{category.name}</span>
          </nav>
          <h1 className="text-3xl font-bold text-zinc-900">{category.name} Casinos</h1>

          {/* The SAME control as the home page and /casinos — one pill-shaped
              dropdown with flags, grouped by continent and searchable — rather
              than this page's own native <select>. `basePath` is this category,
              so choosing a country narrows the category instead of leaving it.

              Rendered only when some country actually has casinos: a filter
              whose every option returns the same list is noise. */}
          {countries.length > 0 && (
            <div className="mt-6 mb-8">
              <CountryNav continents={continents} selected={country} basePath={`/categories/${slug}`} />
            </div>
          )}

          {casinos.length === 0 ? (
            <p className="mt-6 text-zinc-500">{COPY.casinos.noResults}</p>
          ) : (
            /* The same blocks as the home page and /casinos: two compact cards
               per row from `md` up, one below it. A category page is the same
               kind of list, so it should not be a different kind of card. */
            <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
              {casinos.map((casino, i) => <CasinoCard key={casino.id} casino={casino} rank={offset + i + 1} compact />)}
            </ol>
          )}
          {/* Paginates under the filter too, because the filter is now part of
              the same paginated request. The country rides along in basePath so
              page 2 continues the list page 1 showed rather than dropping back
              to every country. */}
          <Pagination
            basePath={`/categories/${slug}${country ? `?country=${encodeURIComponent(country)}` : ''}`}
            current={meta?.current_page ?? 1}
            last={meta?.last_page ?? 1}
          />
        </div>
      </main>
    </>
  )
}
