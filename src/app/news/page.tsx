import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound, permanentRedirect } from 'next/navigation'
import { getNewsFeed, getSiteFeatures } from '@/lib/api'
import Pagination from '@/components/Pagination'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
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
 * beneath and a "most popular" rail down the right. That arrangement is how a reader expects a
 * news index to rank things, and it is the part worth taking.
 *
 * The APPEARANCE is this site's own — emerald on a light ground, the display
 * face already used across winpalack. Nothing here is copied from how their
 * page looks.
 *
 * Reading time IS shown, computed at write time from the body and stored on the
 * row — the feed never ships article bodies just to print "3 min read".
 *
 * No sections or topic pills: every post here is gambling news, so a taxonomy
 * would split one subject into thin, near-duplicate listings.
 *
 * The 24h / 48h / 7-day tabs are deliberately NOT built: they need view tracking
 * this site does not have, and tabs over an editor's picks would present a
 * measurement we never took.
 */

export const revalidate = 3600

type Props = { searchParams: Promise<{ category?: string; page?: string }> }


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
  // A deeper PAGE holds other stories, so it gets its own canonical and its own
  // title, or the two would be reported as duplicates of each other.
  const title = page > 1 ? `${COPY.news.pageTitle} — Page ${page}` : COPY.news.pageTitle
  const canonical = canonicalPath('/news', page)

  return {
    title,
    description: COPY.news.pageDescription,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: SITE_NAME,
      title,
      description: COPY.news.pageDescription,
      images: SHARE_IMAGES,
    },
  }
}

export default async function NewsPage({ searchParams }: Props) {
  const { news_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const sp = await searchParams
  // The topic filter is gone (news has no sections any more). Its old
  // ?category= URLs may be indexed, so they move to the feed for good instead
  // of rendering it again under a second address.
  if (sp.category !== undefined) permanentRedirect('/news')
  const page = Math.max(1, Number(sp.page) || 1)
  const { posts, popular, meta } = await getNewsFeed(page)

  // 404 only when the site has no news at all. Asked of page 1, because a page
  // past the end of the feed is empty for a different reason and must not read
  // as "this site has no news".
  const { posts: allPosts } = page > 1 ? await getNewsFeed() : { posts }
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

  /*
   * The structured data describes THIS page, so it carries the same URL as the
   * canonical tag. It used to say /news on every page, while page 2's canonical
   * said /news?page=2 — two different answers on one document to "what URL is
   * this?". Positions continue across pages: page 1 holds `first_page_size`
   * posts (the two leads plus a full grid), every page after it `per_page`.
   */
  const pageUrl = `${SITE_URL}${canonicalPath('/news', page)}`
  const offset = meta && page > 1 ? meta.first_page_size + (page - 2) * meta.per_page : 0

  const graph = [
    buildWebPageSchema({
      name: COPY.news.pageTitle,
      url: pageUrl,
      description: COPY.news.pageDescription,
    }),
    buildItemListSchema(
      COPY.news.pageTitle,
      pageUrl,
      posts.map((p, i) => ({ position: offset + i + 1, name: p.title, url: `${SITE_URL}/news/${p.slug}` })),
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
              where it does real work, but on the page it repeated what the first
              two headlines already say. */}
          <header className="mb-8">
            <h1 className="font-display text-4xl font-semibold text-slate-900">
              {COPY.news.pageTitle}
            </h1>
          </header>

          {/* Feed and rail. The rail drops below the feed on narrow screens
              rather than being hidden. */}
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-16 2xl:grid-cols-[minmax(0,1fr)_22rem]">

            <div>
              {posts.length === 0 ? (
                <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
                  {COPY.news.emptyPage}
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
                                  preload={i === 0}
                                  fetchPriority={i === 0 ? 'high' : undefined}
                                />
                              </div>
                            )}
                            <h2 className="font-display text-2xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-emerald-700">
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
                              <h3 className="font-display text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-700">
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
                  {meta && <Pagination basePath="/news" current={meta.current_page} last={meta.last_page} />}
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
