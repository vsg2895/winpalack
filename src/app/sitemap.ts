import type { MetadataRoute } from 'next'
import { getArticles, getCasinos, getCategories, getCountries, getReviewFeed, getSpecialOffers } from '@/lib/api'
import { SITE_URL } from '@/lib/config'


// Guard against missing/invalid timestamps so the sitemap never fails to render.
function safeDate(value: string | null | undefined): Date {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [casinosRes, categoriesRes, offersRes, countriesRes, articlesRes, forumRes] = await Promise.allSettled([
    getCasinos(),
    getCategories(),
    getSpecialOffers(),
    getCountries(),
    getArticles(),
    getReviewFeed(),
  ])

  const casinoUrls: MetadataRoute.Sitemap =
    casinosRes.status === 'fulfilled'
      ? casinosRes.value.data.map((c) => ({
          url: `${SITE_URL}/casinos/${c.slug}`,
          lastModified: safeDate(c.updated_at),
          changeFrequency: 'weekly',
          priority: 0.8,
        }))
      : []

  const categoryUrls: MetadataRoute.Sitemap =
    categoriesRes.status === 'fulfilled'
      ? categoriesRes.value.data.map((c) => ({
          url: `${SITE_URL}/categories/${c.slug}`,
          lastModified: safeDate(c.updated_at),
          changeFrequency: 'weekly',
          priority: 0.6,
        }))
      : []

  const offerUrls: MetadataRoute.Sitemap =
    offersRes.status === 'fulfilled'
      ? offersRes.value.data.map((o) => ({
          url: `${SITE_URL}/special-offers/${o.slug}`,
          lastModified: safeDate(o.updated_at),
          changeFrequency: 'weekly',
          priority: 0.7,
        }))
      : []

  // Countries resolve to null when the SITE has the feature switched off, in
  // which case /countries and every country page 404 — so neither the index nor
  // its children may appear here. Listing a 404 is a worse signal than omitting
  // a page that exists.
  const countries =
    countriesRes.status === 'fulfilled' && countriesRes.value !== null
      ? countriesRes.value.data.flatMap((continent) => continent.countries ?? [])
      : []

  // Guides enter the sitemap only once the section is open — the same
  // three-article threshold the route and the nav apply. Submitting URLs for a
  // section that 404s is the fastest way to lose crawl trust.
  const articles = articlesRes.status === 'fulfilled' ? articlesRes.value : []
  const guidesOpen = articles.length >= 3
  const articleUrls: MetadataRoute.Sitemap = guidesOpen
    ? [
        {
          url: `${SITE_URL}/guides`,
          lastModified: safeDate(articles[0]?.published_at ?? null),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        },
        ...articles.map((a) => ({
          url: `${SITE_URL}/guides/${a.slug}`,
          lastModified: safeDate(a.updated_at ?? a.published_at),
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        })),
      ]
    : []

  // The hub now lists EVERY country, but a country with no casinos is a thin
  // page and must not be submitted for indexing — so the sitemap keeps the
  // stricter rule the hub dropped.
  const countryUrls: MetadataRoute.Sitemap = countries
    .filter((c) => (c.casinos_count ?? 0) > 0)
    .map((c) => ({
      url: `${SITE_URL}/countries/${c.slug}`,
      lastModified: safeDate(c.updated_at),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

  // The forum is submitted only once it holds a published review. Null means
  // the site has reviews switched off and /forum 404s; zero threads means the
  // page renders nothing but its empty state, which is thin content. Same rule
  // the countries hub and the guides index follow.
  const forumHasThreads =
    forumRes.status === 'fulfilled' &&
    forumRes.value !== null &&
    forumRes.value.data.threads.length > 0

  const staticUrls: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/casinos`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/special-offers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    // Only when the feature is on — see countryUrls above.
    // The hub itself is only worth submitting once at least one country has
    // casinos — same rule as countryUrls above.
    ...(countryUrls.length > 0
      ? ([
          {
            url: `${SITE_URL}/countries`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          },
        ] satisfies MetadataRoute.Sitemap)
      : []),
    ...(forumHasThreads
      ? ([
          {
            url: `${SITE_URL}/forum`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
          },
        ] satisfies MetadataRoute.Sitemap)
      : []),
  ]

  // THE LEGAL PAGES ARE DELIBERATELY ABSENT FROM THIS SITEMAP.
  //
  // They are served with `noindex, follow` (see app/[slug]/page.tsx) because
  // all eleven are generated from one template shared by every site in the
  // network. Listing a noindexed URL in a sitemap is a contradictory signal —
  // the sitemap says "index this", the page header says "do not" — and Search
  // Console reports it as an error rather than resolving it.
  //
  // They remain reachable and crawlable: every footer links to all eleven.
  const legalUrls: MetadataRoute.Sitemap = []

  return [...staticUrls, ...casinoUrls, ...categoryUrls, ...countryUrls, ...offerUrls, ...articleUrls, ...legalUrls]
}
