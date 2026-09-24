import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getNewsPost, getNewsFeed, getEditorial, getSiteFeatures } from '@/lib/api'
import { relativeTime } from '@/lib/relativeTime'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { params: Promise<{ slug: string }> }

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getNewsPost(slug)

  if (!article) return { title: COPY.errors.notFound }

  const title = article.meta_title ?? article.title
  const description = article.meta_description ?? article.excerpt ?? COPY.news.pageDescription

  return {
    title,
    description,
    alternates: { canonical: article.canonical_url ?? `/news/${slug}` },
    ...(article.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'article',
      url: `/news/${slug}`,
      siteName: SITE_NAME,
      title,
      description,
      ...(article.published_at ? { publishedTime: article.published_at } : {}),
    },
  }
}

export default async function NewsPostPage({ params }: Props) {
  const { slug } = await params

  const { news_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const article = await getNewsPost(slug)
  if (!article) notFound()

  // Reused from 3.10 — the same person named on the casino reviews. Null unless
  // the site configured a byline, and then no author is claimed anywhere.
  const { author } = await getEditorial()

  // The "most popular" rail from the news index, minus the post being read.
  // Same fetch, same cache tag, so the two surfaces can never disagree.
  const popular = (await getNewsFeed()).popular.filter((post) => post.slug !== slug).slice(0, 5)

  const hero = resolveImageUrl(article.hero_image_path)
  const pageUrl = `${SITE_URL}/news/${slug}`

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
    ...(hero ? { image: hero } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    ...(article.updated_at ? { dateModified: article.updated_at } : {}),
    ...(author ? { author: { '@type': 'Person', name: author.name } } : {}),
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: pageUrl,
  }

  const graph = [
    buildWebPageSchema({
      name: article.title,
      url: pageUrl,
      description: article.excerpt ?? COPY.news.pageDescription,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: article.updated_at ?? undefined,
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
              <Image src={hero} alt={article.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 1440px" priority />
            </div>
          )}

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 2xl:grid-cols-[minmax(0,1fr)_22rem]">
          <article className="min-w-0">
          <h1 className="font-display text-4xl font-semibold text-slate-900 lg:text-5xl">{article.title}</h1>

          <p className="mt-3 text-sm text-slate-500">
            {author && <span className="font-semibold text-slate-700">{author.name}</span>}
            {author && article.published_at && ' · '}
            {article.published_at && (
              <time dateTime={article.published_at}>
                {new Date(article.published_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            )}
          </p>

          {article.excerpt && <p className="mt-6 text-lg text-slate-600 lg:text-xl">{article.excerpt}</p>}

          {article.body && (
            <div className="prose prose-zinc mt-8 max-w-none lg:prose-lg" dangerouslySetInnerHTML={{ __html: article.body }} />
          )}

          {/* Where the FACTS came from, when they came from somewhere.
              
              The words above are this site's own — only the facts are
              borrowed, which is what makes the piece original. Crediting the
              publication that reported them first is the honest way to say so,
              and it gives a reader who wants the original a way to reach it.
              
              `nofollow` because it is an attribution, not an endorsement, and
              `noopener` because it opens elsewhere. Absent entirely on anything
              written here, so a hand-written post carries no stray credit. */}
          {article.source_name && article.source_url && (
            <p className="mt-8 text-sm text-zinc-500">
              {COPY.news.sourceCredit}{' '}
              <a
                href={article.source_url}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
              >
                {article.source_name}
              </a>
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
