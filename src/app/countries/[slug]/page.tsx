import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCountries, getCountry } from '@/lib/api'
import { resolveImageUrl } from '@/lib/images'
import {
  buildItemListSchema,
  buildBreadcrumbSchema,
  buildWebPageSchema,
  breadcrumbIdFor,
  jsonLdScript,
} from '@/lib/seo'
import { COPY } from '@/constants/copy'
import CasinoCard from '@/components/CasinoCard'
import Pagination from '@/components/Pagination'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

/**
 * Canonical PATH for a country view — page number only when past the first.
 *
 * A path, not an absolute URL: Next resolves it against `metadataBase`, so the
 * host is named in one place. JSON-LD needs absolute URLs, so those call sites
 * prefix SITE_URL explicitly.
 */
function canonicalPathFor(slug: string, page: number): string {
  return `/countries/${slug}${page > 1 ? `?page=${page}` : ''}`
}

/**
 * Every [slug] route on these sites exports this — see the SEO rules in
 * sites/CLAUDE.md. Returns an empty list when the SITE has countries switched
 * off: there is nothing to pre-render, and the route 404s anyway.
 */
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
    const res = await getCountries()

    if (res === null) return []

    return res.data.flatMap((continent) =>
      (continent.countries ?? []).map((country) => ({ slug: country.slug })),
    )
  } catch {
    return []
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = Math.max(1, Number((await searchParams).page) || 1)

  const res = await getCountry(slug, page).catch(() => null)

  if (res === null) {
    return { title: COPY.errors.notFound, robots: { index: false, follow: false } }
  }

  const { country } = res.data
  // Distinct title per page so paginated views are never reported as duplicates.
  const title = page > 1 ? `Casinos In ${country.name} — Page ${page}` : `Casinos In ${country.name}`
  const description = `Casinos accepting players from ${country.name} — ${COPY.countries.countryMetaSuffix}`
  const canonical = canonicalPathFor(slug, page)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', url: canonical, siteName: SITE_NAME, title, description },
  }
}

export default async function CountryDetailPage({ params, searchParams }: Props) {
  const { slug } = await params
  const page = Math.max(1, Number((await searchParams).page) || 1)

  // Null covers both "feature off on this site" and "no such country"; a thrown
  // error covers a real API failure. Both end at the same 404 here, which is
  // what a visitor should see either way.
  const res = await getCountry(slug, page).catch(() => null)

  if (res === null) notFound()

  const { country, casinos, meta } = res.data
  const flag = resolveImageUrl(country.image_path)

  // Position continues across pages so the ItemList reflects the real ranking
  // rather than restarting at 1 on every page.
  const offset = ((meta?.current_page ?? page) - 1) * (meta?.per_page ?? casinos.length)
  const pageUrl = `${SITE_URL}${canonicalPathFor(slug, page)}`
  const description = `Casinos accepting players from ${country.name} — ${COPY.countries.countryMetaSuffix}`

  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: COPY.countries.pageTitle, url: `${SITE_URL}/countries` },
      { name: country.name, url: `${SITE_URL}/countries/${slug}` },
    ],
    pageUrl,
  )

  const graph = [
    buildWebPageSchema({
      name: `Casinos In ${country.name}`,
      url: pageUrl,
      description,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    breadcrumb,
    buildItemListSchema(
      `Casinos In ${country.name}`,
      pageUrl,
      casinos.map((c, i) => ({
        position: offset + i + 1,
        name: c.name,
        url: `${SITE_URL}/casinos/${c.slug}`,
      })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="px-4 py-12">
        <div className="container mx-auto max-w-5xl">
          <nav className="mb-6 text-sm text-slate-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">
              Home
            </Link>{' '}
            /{' '}
            <Link href="/countries" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">
              {COPY.countries.pageTitle}
            </Link>{' '}
            / <span className="text-slate-600">{country.name}</span>
          </nav>

          <header className="flex items-center gap-4">
            {flag && (
              <Image
                src={flag}
                alt=""
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 rounded-full object-cover shadow-sm"
              />
            )}
            <div>
              <h1 className="font-display text-3xl font-bold text-slate-900">
                Casinos In {country.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {COPY.countries.casinoCount(meta?.total ?? casinos.length)}
              </p>
            </div>
          </header>

          {casinos.length === 0 ? (
            <p className="mt-8 text-slate-500">{COPY.countries.emptyCountry}</p>
          ) : (
            <ol className="mt-8 flex flex-col gap-4">
              {casinos.map((casino, i) => (
                <CasinoCard key={casino.id} casino={casino} rank={offset + i + 1} />
              ))}
            </ol>
          )}

          <Pagination
            basePath={`/countries/${slug}`}
            current={meta?.current_page ?? 1}
            last={meta?.last_page ?? 1}
          />
        </div>
      </main>
    </>
  )
}
