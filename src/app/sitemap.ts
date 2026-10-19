import type { MetadataRoute } from 'next'
import { getPage, getArticles, getBonusArea, getNews, getCasinos, getCategories, getCountries, getForumIndex, getReviewFeed, getSiteFeatures, getSpecialOffers } from '@/lib/api'
import { SITE_URL } from '@/lib/config'
import { TRUST_PAGE_SLUGS } from '@/constants/legalPages'


// Guard against missing/invalid timestamps so the sitemap never fails to render.
function safeDate(value: string | null | undefined): Date {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [casinosRes, categoriesRes, offersRes, countriesRes, articlesRes, newsRes, forumRes, communityRes, featuresRes, bonusRes] = await Promise.allSettled([
    getCasinos(),
    getCategories(),
    getSpecialOffers(),
    getCountries(),
    getArticles(),
    getNews(),
    getReviewFeed(),
    // The COMMUNITY forum — a different feature from getReviewFeed above, which
    // is the review feed at /reviews. Its boards and discussions are indexable
    // pages and were missing from the sitemap entirely.
    getForumIndex(),
    getSiteFeatures(),
    // The Bonus categories. Each one now has its own paginated page, so each is
    // an indexable URL — and a new indexable route that no sitemap names is the
    // usual reason a section takes months to be discovered. Only categories
    // holding at least one visible offer come back, so the sitemap can never
    // list a page that renders empty.
    getBonusArea(),
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

  /*
   * The per-casino bonus pages — /casinos/<slug>/bonuses.
   *
   * They were missing from this sitemap entirely. The route is indexable and
   * self-canonical, and the only thing linking it is a button part-way down
   * each casino review, so it was reachable in principle and submitted nowhere.
   *
   * THE GATE HAS TO MATCH THE PAGE'S OWN, exactly. app/casinos/[slug]/bonuses
   * 404s unless the operator has at least two offers AND a written intro, so
   * listing a casino that fails that test would submit a URL that answers 404 —
   * the one thing a sitemap must never contain. Both halves are in the listing
   * payload already, so this costs no extra request.
   *
   * Kept at a lower priority than the review it hangs off: it is a supporting
   * page for one operator, not a section of the site.
   */
  const MIN_BONUS_OFFERS = 2
  const bonusPageUrls: MetadataRoute.Sitemap =
    casinosRes.status === 'fulfilled'
      ? casinosRes.value.data
          .filter(
            (c) =>
              (c.special_offers?.length ?? 0) >= MIN_BONUS_OFFERS &&
              (c.bonuses_intro ?? '').trim() !== '',
          )
          .map((c) => ({
            url: `${SITE_URL}/casinos/${c.slug}/bonuses`,
            lastModified: safeDate(c.updated_at),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
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

  /*
   * A SITEMAP MUST NOT CONTRADICT A PAGE HEADER.
   *
   * This mapped every offer the endpoint returned. An offer carrying
   * `seo.noindex` was therefore submitted as "index this" while the page itself
   * said "do not" — the exact conflict Search Console reports, and the sitemap
   * loses that argument every time. Same for an inactive offer, whose page
   * serves the stricter `index: false, follow: false`.
   *
   * Both flags are checked here rather than trusted to the endpoint: the list
   * is built for the public site, not for this file, and a sitemap is the one
   * place where being wrong is a signal rather than a glitch.
   */
  const offerUrls: MetadataRoute.Sitemap =
    offersRes.status === 'fulfilled'
      ? offersRes.value.data
          // `is_indexable` and not `seo.noindex`: the server-side rule already
          // folds the admin flag in, and adds the thin-content test the page's
          // robots tag uses. One definition, so the sitemap and the header
          // cannot disagree.
          .filter((o) => o.active !== false && o.is_indexable !== false)
          .map((o) => ({
            url: `${SITE_URL}/special-offers/${o.slug}`,
            lastModified: safeDate(o.updated_at),
            changeFrequency: 'weekly' as const,
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
        // Same rule as the news posts below: a guide an editor has flagged
        // `noindex` must not be submitted as "index this".
        ...articles
          .filter((a) => a.noindex !== true)
          .map((a) => ({
            url: `${SITE_URL}/guides/${a.slug}`,
            lastModified: safeDate(a.updated_at ?? a.published_at),
            changeFrequency: 'monthly' as const,
            priority: 0.5,
          })),
      ]
    : []


  // News enters the sitemap as soon as a post exists — no threshold, because
  // there is none on the route or in the nav either, and all three must agree or
  // the sitemap advertises a URL that 404s.
  const news = newsRes.status === 'fulfilled' ? newsRes.value : []
  const newsUrls: MetadataRoute.Sitemap = news.length > 0
    ? [
        {
          url: `${SITE_URL}/news`,
          lastModified: safeDate(news[0]?.published_at ?? null),
          changeFrequency: 'daily' as const,
          priority: 0.7,
        },
        // The Most Popular listing — its own indexable page, and the rail on
        // /news is the only thing linking to it.
        {
          url: `${SITE_URL}/news/most-popular`,
          lastModified: safeDate(news[0]?.published_at ?? null),
          changeFrequency: 'daily' as const,
          priority: 0.6,
        },
        /*
         * NOINDEX POSTS ARE NOT SUBMITTED.
         *
         * Every scraped article is written with `noindex = true` — its title
         * and teaser are still the source publisher's words until the rewrite
         * runs (NewsScrapeService), and NewsRewriteService clears the flag once
         * the copy is genuinely original. Submitting one meant asking Google to
         * index a page that asks not to be, which is how ~30 of these ended up
         * in the "Excluded by noindex" report.
         *
         * The /news listing above stays: it is indexable in its own right, and
         * the posts remain reachable through it.
         */
        ...news
          .filter((post) => post.noindex !== true)
          .map((post) => ({
            url: `${SITE_URL}/news/${post.slug}`,
            lastModified: safeDate(post.updated_at ?? post.published_at),
            changeFrequency: 'weekly' as const,
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

  // The reviews feed is submitted only once it holds a published review. Null
  // means the site has reviews switched off and /reviews 404s; zero threads means the
  // page renders nothing but its empty state, which is thin content. Same rule
  // the countries hub and the guides index follow.
  const forumHasThreads =
    forumRes.status === 'fulfilled' &&
    forumRes.value !== null &&
    forumRes.value.data.threads.length > 0

  // The COMMUNITY forum switch — distinct from `forum_enabled`, which is the
  // reviews feed. Read here because both the /register entry below and the
  // board URLs further down depend on it.
  const communityEnabled =
    featuresRes.status === 'fulfilled' && featuresRes.value.community_forum_enabled === true

  // Accounts are their own switch: /register is a real, indexable page on a
  // site that takes sign-ups before its board opens. The board URLs below still
  // follow `communityEnabled`, because those genuinely do not exist without it.
  const accountsEnabled =
    featuresRes.status === 'fulfilled' && featuresRes.value.accounts_enabled === true

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
    // The join page — only while accounts are switched on, since the page 404s
    // otherwise. /login is noindex and deliberately absent.
    ...(accountsEnabled
      ? ([
          {
            url: `${SITE_URL}/register`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.4,
          },
        ] satisfies MetadataRoute.Sitemap)
      : []),
    ...(forumHasThreads
      ? ([
          {
            url: `${SITE_URL}/reviews`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.7,
          },
        ] satisfies MetadataRoute.Sitemap)
      : []),
  ]

  /*
   * THE TRUST PAGES, and only the ones this site actually publishes as
   * indexable.
   *
   * This was `const legalUrls = []` with a comment saying all eleven standard
   * pages are noindex and a sitemap must never contradict a page header. The
   * first half of that is no longer true: six of them are still noindex, but
   * /about, /contact, /responsible-gambling, /affiliate-disclosure and
   * /editorial-policy now carry `index, follow` — Search Console was reporting
   * them as "Excluded by noindex", and on a gambling affiliate they are exactly
   * the pages Google's quality guidance looks for.
   *
   * The second half still holds, which is why this ASKS rather than assumes:
   * each page is fetched and submitted only when the API says it is published
   * and not noindexed. Flip `noindex` on in the admin and the URL leaves this
   * sitemap on the next revalidation, with no deploy and no contradiction.
   *
   * Five cached, tagged fetches — the same `getPage()` the route itself uses,
   * so a warm cache makes this free.
   */
  const trustPages = await Promise.all(
    TRUST_PAGE_SLUGS.map(async (slug) => {
      try {
        const page = await getPage(slug)

        return page !== null && page.noindex !== true ? { slug, page } : null
      } catch {
        // One unreachable page must not empty the whole sitemap.
        return null
      }
    }),
  )

  // `flatMap` with an empty array for the misses, rather than `filter` plus a
  // type predicate: the predicate had to restate the element type, and
  // restating a literal-union slug is how it went out of sync with the source.
  const legalUrls: MetadataRoute.Sitemap = trustPages.flatMap((entry) =>
    entry === null
      ? []
      : [
          {
            url: `${SITE_URL}/${entry.slug}`,
            lastModified: safeDate(entry.page.updated_at),
            changeFrequency: 'monthly' as const,
            priority: 0.4,
          },
        ],
  )

  /*
   * Community forum.
   *
   * Only when the feature is ON and a board actually holds a discussion — an
   * empty board is thin content and submitting it asks Google to crawl a page
   * that says "nothing here yet". Individual THREADS are not listed: they are
   * reached from their board, they churn constantly, and a forum that submits
   * every thread is how a sitemap stops being a signal.
   */

  const forumSections =
    communityEnabled && communityRes.status === 'fulfilled' ? communityRes.value.data.sections : []

  const communityUrls: MetadataRoute.Sitemap = forumSections.length > 0
    ? [
        { url: `${SITE_URL}/forum`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
        ...forumSections.flatMap((section) =>
          section.categories
            .filter((board) => board.articles_count > 0)
            .map((board) => ({
              url: `${SITE_URL}/forum/${board.slug}`,
              lastModified: board.last_post?.at ? safeDate(board.last_post.at) : new Date(),
              changeFrequency: 'daily' as const,
              priority: 0.6,
            })),
        ),
      ]
    : []

  const bonusUrls: MetadataRoute.Sitemap =
    bonusRes.status === 'fulfilled'
      ? bonusRes.value.map((section) => ({
          url: `${SITE_URL}/bonuses/${section.slug}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          // Below /special-offers (0.9), which is the whole area, and level with
          // a category listing: these are the sections that area is made of.
          priority: 0.8,
        }))
      : []

  return [...staticUrls, ...casinoUrls, ...bonusPageUrls, ...categoryUrls, ...countryUrls, ...offerUrls, ...bonusUrls, ...articleUrls, ...newsUrls, ...communityUrls, ...legalUrls]
}
