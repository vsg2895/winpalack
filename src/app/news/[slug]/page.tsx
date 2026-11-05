import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getNewsPost, getNewsFeed, getEditorial, getSiteFeatures } from '@/lib/api'
import Byline from '@/components/Byline'
import { relativeTime } from '@/lib/relativeTime'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript, bylinePersonSchema, SHARE_IMAGES } from '@/lib/seo'
import { resolveImageUrl, absoluteImageUrl, PAGE_WIDE_IMAGE_SIZES } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'
import { fitDescription, fitTitle } from '@/lib/seo/meta'
import type { Article } from '@shared/types/article'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { params: Promise<{ slug: string }> }

/*
 * Every slug renders on its first request and is then served from the ISR
 * cache, revalidated by its fetch tags (SEO audit O1). An EMPTY list on
 * purpose: nothing is built ahead, so the build never depends on the API, and
 * the route's shape cannot change with the data.
 *
 * This used to be impossible: the root layout read the session cookie for the
 * header's account control, a static render may not touch cookies, and an
 * empty list here 500'd every slug (how /special-offers/[slug] once broke).
 * The account control now asks /api/forum/me from the browser, so nothing in
 * the layout or this page reads a request-time API. Keep it that way: a
 * cookies(), headers() or searchParams read in this route brings the 500 back.
 */
export function generateStaticParams(): Array<{ slug: string }> {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getNewsPost(slug)

  if (!article) return { title: COPY.errors.notFound }

  const title = article.meta_title ?? article.title
  const description = article.meta_description ?? article.excerpt ?? COPY.news.pageDescription
  const cover = shareableCover(article)

  return {
    // Fitted to what a results page shows (lib/seo/meta.ts). Rewritten news
    // headlines in particular run past 60 characters with the brand appended.
    title: fitTitle(title),
    description: fitDescription(description),
    alternates: { canonical: article.canonical_url ?? `/news/${slug}` },
    // Indexable posts opt in to large image previews (Discover, Top Stories).
    // Without it Google may only show a thumbnail. This replaces the layout's
    // robots, so index/follow are restated.
    robots: article.noindex
      ? { index: false, follow: true }
      : { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'article',
      url: `/news/${slug}`,
      siteName: SITE_NAME,
      title,
      description,
      ...(article.published_at ? { publishedTime: article.published_at } : {}),
      // The article's own cover when it is big enough for a large preview;
      // otherwise the site card, which is 1200×630.
      images: cover
        ? [{ url: cover.url, width: cover.width, height: cover.height, alt: article.title }]
        : SHARE_IMAGES,
    },
  }
}

/**
 * The publication a feed-made post credits, or null for a hand-written one.
 * The URL is used only when it is http(s), so a stored value can never become
 * a `javascript:` link.
 */
function sourceCredit(article: Pick<Article, 'source_name' | 'source_url'>) {
  const name = article.source_name?.trim()
  if (!name) return null
  const url = article.source_url && /^https?:\/\//i.test(article.source_url) ? article.source_url : null
  return { name, url }
}

/** Below this width a cover makes a poor large preview, so the site card is used. */
const SHARE_IMAGE_MIN_WIDTH = 1200

/**
 * The cover as a share image, or null when it cannot be one: no cover, an SVG
 * (no share target renders it), or one under 1200px wide. The API only knows
 * the size of files it stores — see `hero_image_size`.
 */
function shareableCover(article: Pick<Article, 'hero_image_path' | 'hero_image_size'>) {
  const url = absoluteImageUrl(article.hero_image_path)
  const size = article.hero_image_size
  if (!url || !size || size.width < SHARE_IMAGE_MIN_WIDTH) return null
  return { url, width: size.width, height: size.height }
}

export default async function NewsPostPage({ params }: Props) {
  const { slug } = await params

  const { news_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const article = await getNewsPost(slug)
  if (!article) notFound()

  // Reused from 3.10 — the same person named on the casino reviews. Null unless
  // the site configured a byline, and then no author is claimed anywhere.
  const editorial = await getEditorial()
  // A named author of THIS article (with a page of their own) wins over the
  // site-wide editorial name, which stays the fallback.
  const bylinePerson = article.byline?.author ?? article.byline?.reviewer ?? null
  const author = bylinePerson ? null : editorial.author

  // The "most popular" rail from the news index, minus the post being read.
  // Same fetch, same cache tag, so the two surfaces can never disagree.
  const popular = (await getNewsFeed()).popular.filter((post) => post.slug !== slug).slice(0, 5)

  const hero = resolveImageUrl(article.hero_image_path)
  // JSON-LD needs the absolute form; the <Image> below takes the same-origin one.
  const heroAbsolute = absoluteImageUrl(article.hero_image_path)
  const pageUrl = `${SITE_URL}/news/${slug}`
  // The text's last change, not the row's: toggling a post onto the home page
  // is not a modification. Falls back to updated_at on an older API.
  const modifiedAt = article.content_modified_at ?? article.updated_at
  const source = sourceCredit(article)

  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: COPY.news.pageTitle, url: `${SITE_URL}/news` },
      { name: article.title, url: pageUrl },
    ],
    pageUrl,
  )

  // NewsArticle rather than Article: this is dated editorial with a byline,
  // which is what the type describes. `author` is omitted entirely when the site
  // has no named reviewer — an authorship claim we cannot point at is worse than
  // none, the same rule the casino Review schema follows.
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt ?? undefined,
    // An ImageObject with its size when the API knows it, so the 1200px
    // requirement for large previews can be checked by the crawler.
    ...(hero
      ? {
          image: article.hero_image_size
            ? { '@type': 'ImageObject', url: heroAbsolute, width: article.hero_image_size.width, height: article.hero_image_size.height }
            : heroAbsolute,
        }
      : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(modifiedAt ? { dateModified: modifiedAt } : {}),
    ...(bylinePerson
      ? { author: bylinePersonSchema(bylinePerson) }
      : author
        ? { author: { '@type': 'Person', name: author.name } }
        : {}),
    publisher: { '@type': 'Organization', name: SITE_NAME },
    // The report this post's facts come from, credited the same way on the
    // page itself.
    ...(source
      ? {
          isBasedOn: {
            '@type': 'CreativeWork',
            ...(source.url ? { url: source.url } : {}),
            publisher: { '@type': 'Organization', name: source.name },
          },
        }
      : {}),
    mainEntityOfPage: pageUrl,
  }

  const graph = [
    buildWebPageSchema({
      name: article.title,
      url: pageUrl,
      description: article.excerpt ?? COPY.news.pageDescription,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: modifiedAt ?? undefined,
    }),
    breadcrumb,
    articleSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Same 90rem measure and two-column shape as the casino and offer
            pages: the article runs in the main column, the most-popular rail
            beside it. The width is spent on layout, not line length. */}
        <div className="mx-auto max-w-[90rem]">
          <nav className="mb-6 text-sm text-zinc-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link> /{' '}
            <Link href="/news" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">{COPY.news.pageTitle}</Link> /{' '}
            <span className="text-zinc-600">{article.title}</span>
          </nav>

          {hero && (
            <div className="relative mb-8 aspect-[16/7] overflow-hidden rounded-2xl bg-zinc-100 lg:mb-10 lg:aspect-[3/1]">
              <Image src={hero} alt={article.title} fill className="object-cover" sizes={PAGE_WIDE_IMAGE_SIZES} preload fetchPriority="high" />
            </div>
          )}

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <article className="min-w-0">
          <h1 className="font-display text-4xl font-semibold text-slate-900 lg:text-5xl">{article.title}</h1>

          <p className="mt-3 text-sm text-slate-500">
            {author && <span className="font-semibold text-slate-700">{author.name}</span>}
            {author && article.published_at && ' · '}
            {/* "11 days ago", the same wording the listings use. The exact
                instant stays in `dateTime` for crawlers and for anyone who
                needs it; `relativeTime` degrades to an absolute date once
                relative time stops telling a reader anything. */}
            {article.published_at && (
              <time dateTime={article.published_at}>{relativeTime(article.published_at)}</time>
            )}
          </p>
          <Byline byline={article.byline} className="mt-2" />

          {article.excerpt && <p className="mt-6 text-lg text-slate-600 lg:text-xl">{article.excerpt}</p>}

          {article.body && (
            <div className="prose prose-zinc mt-8 max-w-none lg:prose-lg" dangerouslySetInnerHTML={{ __html: article.body }} />
          )}

          {source && (
            <p className="mt-8 border-t border-slate-200 pt-4 text-sm text-slate-500">
              {COPY.news.source}:{' '}
              {source.url ? (
                // Credited, not endorsed: nofollow, and no referrer sent.
                <a
                  href={source.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="font-semibold text-slate-700 underline underline-offset-4 hover:text-emerald-700"
                >
                  {source.name}
                </a>
              ) : (
                <span className="font-semibold text-slate-700">{source.name}</span>
              )}
            </p>
          )}

          <p className="mt-8 text-sm">
            <Link href="/news" className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800">
              {COPY.news.backToIndex}
            </Link>
          </p>
          </article>

          {popular.length > 0 && (
            <aside aria-labelledby="popular-heading" className="lg:sticky lg:top-24 lg:self-start">
              <h2 id="popular-heading" className="font-display text-xl font-semibold text-slate-900">
                {COPY.news.mostPopular}
              </h2>
              <ul className="mt-5 flex flex-col divide-y divide-slate-200/70" role="list">
                {popular.map((post) => {
                  const thumb = resolveImageUrl(post.hero_image_path)
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
                        {thumb && (
                          <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            <Image src={thumb} alt="" fill className="object-cover" sizes="80px" />
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
