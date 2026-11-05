import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBonusCategory } from '@/lib/api'
import { buildBreadcrumbSchema, buildItemListSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import Pagination from '@/components/Pagination'
import { SITE_URL } from '@/lib/config'
import { canonicalPath } from '@/lib/seo/canonical'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

/**
 * Canonical PATH for one page of a Bonus category.
 *
 * A path, not an absolute URL: `alternates.canonical` and `openGraph.url` are
 * resolved against `metadataBase`, so the host is named once (lib/config) and
 * cannot drift per page. JSON-LD needs absolute URLs, so those call sites
 * prefix SITE_URL themselves.
 */
function canonicalPathFor(slug: string, page: number): string {
  return canonicalPath(`/bonuses/${slug}`, page)
}

/*
 * NO generateStaticParams, deliberately — this route renders on demand,
 * because it reads `searchParams` (?page / filters), which a static render may
 * not touch: an empty params list would build it static and 500 every slug.
 * The root layout no longer reads the session cookie (SEO audit O1), so the
 * searchParams read is now the only thing keeping this route dynamic; the
 * detail routes without one (/casinos/[slug], /news/[slug] …) are ISR.
 *
 * `force-dynamic` is deliberately NOT used: it would also downgrade fetchCache
 * to no-store and send every request to the API, where this leaves the
 * existing per-fetch cache and its tags exactly as they were.
 */

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  const payload = await getBonusCategory(slug, page)

  if (payload === null) {
    return { title: COPY.errors.notFound }
  }

  const { category, offers } = payload
  // Distinct title per page, so paginated views are never reported as
  // duplicates of each other.
  const title = page > 1 ? `${category.name} — Page ${page}` : category.name
  // The category's own description when the admin wrote one; otherwise this
  // site's line about the Bonus area, composed with the category name so the
  // sentence is still specific to this page rather than boilerplate.
  const description = category.description ?? `${category.name} — ${COPY.bonusCategory.metaSuffix}`
  const canonical = canonicalPathFor(slug, page)

  return {
    title,
    description,
    alternates: { canonical },
    /*
     * An EMPTY bonus type is `noindex, follow`. The page renders its empty state
     * rather than 404ing, because the nav and the sitemap list every published
     * type; but an indexable page saying "no offers" is what Google files as a
     * soft 404. Driven by the data: the first offer makes it indexable on the
     * next regeneration. Past-the-end pages never get here: they 404.
     */
    ...(offers.length === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: 'website', url: canonical, siteName: SITE_NAME, title, description, images: SHARE_IMAGES },
  }
}

export default async function BonusCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  // null covers both an unknown slug and a category the admin has switched off:
  // neither is published, so neither has a page. An empty listing would read as
  // "this exists and holds nothing", which is a different (and wrong) claim.
  const payload = await getBonusCategory(slug, page)

  if (payload === null) {
    notFound()
  }

  const { category, offers, meta } = payload

  /*
   * A PAGE NUMBER PAST THE END IS NOT A PAGE.
   *
   * Without this, /bonuses/<type>?page=999 rendered an empty list with HTTP 200,
   * an `index` robots tag and a self-referencing canonical, so every number a
   * crawler guessed became its own indexable URL claiming to be a real page of
   * the type. Google calls that a soft 404 and reports it as an error.
   *
   * `page > 1` is part of the test on purpose: an empty type still has a
   * legitimate page 1, and it must render its empty state rather than 404.
   */
  if (page > 1 && page > meta.last_page) notFound()
  const pageUrl = `${SITE_URL}${canonicalPathFor(slug, page)}`
  const description = category.description ?? `${category.name} — ${COPY.bonusCategory.metaSuffix}`

  // Position continues across pages, so the ItemList describes the real order
  // of the category rather than restarting at 1 on every page.
  const offset = (meta.current_page - 1) * meta.per_page
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: COPY.nav.specialOffers, url: `${SITE_URL}/special-offers` },
      { name: category.name, url: `${SITE_URL}/bonuses/${slug}` },
    ],
    pageUrl,
  )
  const graph = [
    buildWebPageSchema({
      name: category.name,
      url: pageUrl,
      description,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    breadcrumb,
    buildItemListSchema(
      category.name,
      pageUrl,
      offers.map((offer, i) => ({
        position: offset + i + 1,
        name: offer.title,
        url: `${SITE_URL}/special-offers/${offer.slug}`,
      })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-6 px-4 sm:px-6 sm:py-12 lg:px-8">
        {/* Same 90rem measure and the same compact four-up grid as the home
            page's Bonus strip and /special-offers, so arriving here from either
            one is the same listing with the cap lifted. */}
        <div className="mx-auto max-w-[90rem]">
          <nav className="mb-3 text-sm sm:mb-6 text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link>
            {' / '}
            <Link href="/special-offers" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">{COPY.nav.specialOffers}</Link>
            {' / '}
            <span className="text-zinc-600">{category.name}</span>
          </nav>

          <header className="mb-4 sm:mb-8">
            <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-4xl">{category.name}</h1>
            {category.description && <p className="mt-1 text-sm text-zinc-500 sm:mt-2 sm:text-base">{category.description}</p>}
            {/* The count is the reason a reader can trust the paginator: it says
                how much is behind these eight cards. */}
            {meta.total > 0 && (
              <p className="mt-2 text-sm text-zinc-400">
                {meta.total} {meta.total === 1 ? COPY.bonusCategory.countOne : COPY.bonusCategory.countMany}
              </p>
            )}
          </header>

          {offers.length === 0 ? (
            <p className="text-zinc-500">{COPY.specialOffers.noResults}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} compact />)}
            </div>
          )}

          <Pagination basePath={`/bonuses/${slug}`} current={meta.current_page} last={meta.last_page} />
        </div>
      </main>
    </>
  )
}
