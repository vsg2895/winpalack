import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getNewsFeed, getSiteFeatures } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'
import type { Article } from '@shared/types/article'

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

type Props = { searchParams: Promise<{ category?: string }> }

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * "6 days ago" for anything recent, an absolute date after that.
 *
 * Relative time is useful while it is short and becomes useless quickly —
 * "14 months ago" tells a reader less than the month would. The <time> element
 * carries the machine-readable value either way.
 */
function relativeTime(value: string): string {
  const then = new Date(value).getTime()
  const days = Math.floor((Date.now() - then) / 86_400_000)

  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 60) return 'last month'
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return formatDate(value)
}

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
  const { category } = await searchParams
  // A filtered view is the same page narrowed, not a page of its own — so it
  // canonicalises to /news rather than competing with it in the index.
  const title = COPY.news.pageTitle

  return {
    title,
    description: COPY.news.pageDescription,
    alternates: { canonical: '/news' },
    ...(category ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'website',
      url: '/news',
      siteName: SITE_NAME,
      title,
      description: COPY.news.pageDescription,
    },
  }
}

export default async function NewsPage({ searchParams }: Props) {
  const { news_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const { category } = await searchParams
  const { posts, popular, categories } = await getNewsFeed(category)

  // 404 only when the site has no news at all. A filtered view with no matches
  // is a real, explainable state and gets an empty message instead.
  const { posts: allPosts } = category ? await getNewsFeed() : { posts }
  if (allPosts.length === 0) notFound()

  const [leadA, leadB, ...rest] = posts
  const activeTopic = categories.find((topic) => topic.slug === category)

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
                  {/* Lead pair — the two the editor put first. */}
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
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
                    <ul className="mt-12 grid grid-cols-1 gap-8 border-t border-slate-200/70 pt-10 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" role="list">
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
              </aside>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
