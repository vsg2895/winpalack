import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getNewsFeed, getSiteFeatures } from '@/lib/api'
import Pagination from '@/components/Pagination'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'
// ONE implementation of "11 days ago", shared with the article page and the
// home page's news strip. This file carried its own copy with a different
// ladder, so the same post could read "2 months ago" here and "5 Sept 2026"
// two clicks away.
import { relativeTime } from '@/lib/relativeTime'
import type { Article } from '@shared/types/article'
import { canonicalPath } from '@/lib/seo/canonical'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

/**
 * The news page.
 *
 * STRUCTURE borrowed from the audited competitor's news hub: a lead pair, a grid
 * beneath, a "most popular" rail down the right, section labels on every card
 * and topic pills for the taxonomy. That arrangement is how a reader expects a
 * news index to rank things, and it is the part worth taking.
 *
 * The APPEARANCE is this site's own — emerald on a light ground, the display
 * face already used across winpalack. Nothing here is copied from how their
 * page looks.
 *
 * Reading time IS shown, computed at write time from the body and stored on the
 * row — the feed never ships article bodies just to print "3 min read".
 *
 * The 24h / 48h / 7-day tabs are deliberately NOT built: they need view tracking
 * this site does not have, and tabs over an editor's picks would present a
 * measurement we never took.
 */

export const revalidate = 3600

type Props = { searchParams: Promise<{ category?: string; page?: string }> }


function Badge({ post }: { post: Article }) {
  if (!post.news_category) return null

  return (
    <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-[3px] text-xs font-bold uppercase tracking-[0.06em] text-white">
      {post.news_category.name}
    </span>
  )
}

function Meta({ post }: { post: Article }) {
  if (!post.published_at && !post.read_minutes) return null

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
      {post.published_at && (
        <time dateTime={post.published_at}>{relativeTime(post.published_at)}</time>
      )}
      {/* Rendered only when it was calculated. An article with no body yet gets
          no claim about how long it takes to read. */}
      {post.published_at && post.read_minutes ? <span aria-hidden>·</span> : null}
      {post.read_minutes ? (
        <span>{COPY.news.readTime(post.read_minutes)}</span>
      ) : null}
    </p>
  )
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  // A filtered view is the same page narrowed, not a page of its own — so it
  // canonicalises to /news rather than competing with it in the index. A deeper
  // PAGE is different: it holds other stories, so it gets its own canonical and
  // its own title, or the two would be reported as duplicates of each other.
  const title = page > 1 ? `${COPY.news.pageTitle} — Page ${page}` : COPY.news.pageTitle
  const canonical = canonicalPath('/news', page)

  return {
    title,
    description: COPY.news.pageDescription,
    alternates: { canonical },
    // A topic-filtered view gets NO `noindex` — the canonical above names
    // /news as the one copy, which is the signal that consolidates. There is no
    // /news/topics/<slug> route to 301 these at, so the canonical is the whole
    // mechanism here and must not be undercut by a noindex.
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: SITE_NAME,
      title,
      description: COPY.news.pageDescription,
    },
  }
}

export default async function NewsPage({ searchParams }: Props) {
  const { news_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const sp = await searchParams
  const category = sp.category
  const page = Math.max(1, Number(sp.page) || 1)
  const { posts, popular, categories, meta } = await getNewsFeed(category, page)

  // 404 only when the site has no news at all. A filtered view with no matches
  // is a real, explainable state and gets an empty message instead. Asked of
  // page 1, because a page past the end of the feed is empty for a different
  // reason and must not read as "this site has no news".
  const { posts: allPosts } = category || page > 1 ? await getNewsFeed() : { posts }
  if (allPosts.length === 0) notFound()

  // A page past the end is not a page. Without this it rendered the "no posts"
  // message with no paginator under it — a dead end a reader could only leave
  // with the back button, and a thin duplicate for a crawler to index.
  if (meta && page > meta.last_page) notFound()

  /*
   * The two big cards are simply the first two of the feed.
   *
   * They used to be re-sorted here, because the feed was ordered
   * `position, published_at DESC` and an editor's `position` could put last
   * month's story above today's — on the one surface where recency is the whole
   * promise. `position` is gone: the API now returns news strictly newest
   * first, so the first two ARE the newest two and sorting them again would
   * only be a second opinion about an order the server already settled.
   */
  /*
   * The lead pair is the first two posts OF PAGE 1, and page 1 only.
   *
   * The treatment belongs to the top of the feed, not to the top of every
   * page: giving page 3 two big cards would say "these are the newest" about
   * stories that are three pages down. The server sends 22 rows on page 1
   * precisely so the grid under the leads is still a full twenty.
   */
  const leading = page === 1 ? posts.slice(0, 2) : []
  const [leadA, leadB] = leading
  const rest = page === 1 ? posts.slice(2) : posts
  const activeTopic = categories.find((topic) => topic.slug === category)

  /**
   * Base path for the feed's paginator, carrying the chosen topic.
   *
   * Without it, turning the page would silently drop the filter — the pills
   * would still read "Regulation" while the feed showed everything.
   */
  const newsBasePath = category ? `/news?category=${encodeURIComponent(category)}` : '/news'

  const graph = [
    buildWebPageSchema({
      name: COPY.news.pageTitle,
      url: `${SITE_URL}/news`,
      description: COPY.news.pageDescription,
    }),
    buildItemListSchema(
      COPY.news.pageTitle,
      `${SITE_URL}/news`,
      posts.map((p, i) => ({ position: i + 1, name: p.title, url: `${SITE_URL}/news/${p.slug}` })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Same 90rem measure as the other listings. The extra width goes to
            the feed: the rail keeps its fixed 20rem (22rem on very wide
            screens) so headlines there never stretch into long single lines. */}
        <div className="mx-auto max-w-[90rem]">

          {/* Heading only. The standfirst was removed from the page — it still
              serves as the meta description and the JSON-LD description below,
              where it does real work, but on the page it repeated what the topic
              pills and the first two headlines already say. */}
          <header className="mb-8">
            <h1 className="font-display text-4xl font-semibold text-slate-900">
              {activeTopic ? activeTopic.name : COPY.news.pageTitle}
            </h1>
          </header>

          {/* Topic pills. Only sections that actually have a visible post are
              returned, so a pill can never lead to an empty feed. */}
          {categories.length > 0 && (
            <nav aria-label={COPY.news.topics} className="mb-10 flex flex-wrap items-center gap-2">
              <Link
                href="/news"
                aria-current={category ? undefined : 'page'}
                className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                  category
                    ? 'border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                    : 'border-transparent bg-emerald-600 text-white'
                }`}
              >
                {COPY.news.allTopics}
              </Link>
              {categories.map((topic) => {
                const selected = topic.slug === category
                return (
                  <Link
                    key={topic.id}
                    href={`/news?category=${topic.slug}`}
                    aria-current={selected ? 'page' : undefined}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
                      selected
                        ? 'border-transparent bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    {topic.name}
                    {typeof topic.articles_count === 'number' && (
                      <span className={selected ? 'text-emerald-100' : 'text-slate-400'}>
                        {topic.articles_count}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* Feed and rail. The rail drops below the feed on narrow screens
              rather than being hidden — it is the way out of a filtered view. */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-16 2xl:grid-cols-[minmax(0,1fr)_22rem]">

            <div>
              {posts.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
                  {COPY.news.emptyTopic}
                </p>
              ) : (
                <>
                  {/* Lead pair — the newest two, on page 1 only. */}
                  <div className={`grid grid-cols-1 gap-8 sm:grid-cols-2 ${leading.length === 0 ? 'hidden' : ''}`}>
                    {[leadA, leadB].filter(Boolean).map((post, i) => {
                      const hero = resolveImageUrl(post.hero_image_path)
                      return (
                        <article key={post.id}>
                          <Link href={`/news/${post.slug}`} className="group block">
                            {hero && (
                              <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                                <Image
                                  src={hero}
                                  alt={post.title}
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 560px"
                                  priority={i === 0}
                                />
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge post={post} />
                            </div>
                            <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-emerald-700">
                              {post.title}
                            </h2>
                            {post.excerpt && <p className="mt-2 text-slate-500">{post.excerpt}</p>}
                            <Meta post={post} />
                          </Link>
                        </article>
                      )
                    })}
                  </div>

                  {/* The rest, in a tighter grid. */}
                  {rest.length > 0 && (
                    <ul
                      className={`grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 ${
                        // The rule separates the grid from the leads; on a page
                        // that has no leads it would be a line under nothing.
                        leading.length > 0 ? 'mt-12 border-t border-slate-200/70 pt-10' : ''
                      }`}
                      role="list"
                    >
                      {rest.map((post) => {
                        const hero = resolveImageUrl(post.hero_image_path)
                        return (
                          <li key={post.id}>
                            <Link href={`/news/${post.slug}`} className="group block">
                              {hero && (
                                <div className="relative mb-3 aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
                                  <Image
                                    src={hero}
                                    alt={post.title}
                                    fill
                                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px"
                                  />
                                </div>
                              )}
                              <Badge post={post} />
                              <h3 className="mt-2 font-display text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-700">
                                {post.title}
                              </h3>
                              <Meta post={post} />
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {/* The feed paginates in twenties — the grid's size, which is
                      what a reader counts. Page 1 carries the two leads on top
                      of that twenty, so the numbers here always describe the
                      grid. */}
                  {meta && <Pagination basePath={newsBasePath} current={meta.current_page} last={meta.last_page} />}
                </>
              )}
            </div>

            {/* Most popular — the editor's picks. Not filtered with the feed:
                a near-empty rail beside a narrow feed defeats its purpose. */}
            {popular.length > 0 && (
              <aside aria-labelledby="popular-heading">
                <h2 id="popular-heading" className="font-display text-xl font-semibold text-slate-900">
                  {COPY.news.mostPopular}
                </h2>
                <ul className="mt-5 flex flex-col divide-y divide-slate-200/70" role="list">
                  {popular.map((post) => {
                    const hero = resolveImageUrl(post.hero_image_path)
                    return (
                      <li key={post.id} className="py-4 first:pt-0 last:pb-0">
                        <Link href={`/news/${post.slug}`} className="group flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold leading-snug text-slate-800 transition-colors group-hover:text-emerald-700">
                              {post.title}
                            </h3>
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                              {post.published_at && (
                                <time dateTime={post.published_at}>{relativeTime(post.published_at)}</time>
                              )}
                              {post.news_category && (
                                <span className="font-semibold uppercase tracking-[0.06em] text-slate-500">
                                  {post.news_category.name}
                                </span>
                              )}
                            </p>
                          </div>
                          {hero && (
                            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                              <Image src={hero} alt="" fill className="object-cover" sizes="80px" />
                            </div>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                {/* The rail holds ten; this is where the rest of them live.
                    A sidebar is not a listing, and an editor who picks forty
                    stories should not have them silently fall off the end of
                    one. */}
                <Link
                  href="/news/most-popular"
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700"
                >
                  {COPY.news.seeMorePopular} →
                </Link>
              </aside>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
