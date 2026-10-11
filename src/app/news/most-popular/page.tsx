import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPopularNews, getSiteFeatures } from '@/lib/api'
import { buildBreadcrumbSchema, buildItemListSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { relativeTime } from '@/lib/relativeTime'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'
import Pagination from '@/components/Pagination'
import type { Article } from '@shared/types/article'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

type Props = { searchParams: Promise<{ page?: string }> }

/*
 * A STATIC segment under /news, which wins over /news/[slug] in Next's routing.
 * The only cost is that a post slugged exactly "most-popular" would be
 * unreachable — slugs here are generated from titles with a date, so that is a
 * theoretical collision rather than a practical one, and a listing deserves the
 * readable address.
 *
 * No generateStaticParams and no force-dynamic, for the reason /categories/[slug]
 * documents: the root layout reads the session cookie, so a static render of
 * this route would throw DYNAMIC_SERVER_USAGE. Having no params function at all
 * keeps it dynamic while leaving the per-fetch cache and its tags in place.
 */

function canonicalPathFor(page: number): string {
  return `/news/most-popular${page > 1 ? `?page=${page}` : ''}`
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page: raw } = await searchParams
  const page = Math.max(1, Number(raw) || 1)
  const title = page > 1 ? `${COPY.news.popularTitle} — Page ${page}` : COPY.news.popularTitle
  const canonical = canonicalPathFor(page)

  return {
    title,
    description: COPY.news.popularDescription,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: SITE_NAME,
      title,
      description: COPY.news.popularDescription,
    },
  }
}

function Card({ post }: { post: Article }) {
  const hero = resolveImageUrl(post.hero_image_path)

  return (
    <li>
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
        {post.news_category && (
          <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-[3px] text-xs font-bold uppercase tracking-[0.06em] text-white">
            {post.news_category.name}
          </span>
        )}
        <h2 className="mt-2 font-display text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-emerald-700">
          {post.title}
        </h2>
        {post.published_at && (
          <p className="mt-3 text-xs text-slate-400">
            <time dateTime={post.published_at}>{relativeTime(post.published_at)}</time>
          </p>
        )}
      </Link>
    </li>
  )
}

export default async function MostPopularNewsPage({ searchParams }: Props) {
  const { news_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const { page: raw } = await searchParams
  const page = Math.max(1, Number(raw) || 1)

  const payload = await getPopularNews(page)

  // An unreachable endpoint is not an empty section — a page with no picks at
  // all still renders, and says so.
  if (payload === null) notFound()

  const { posts, meta } = payload

  // A page past the end is not a page — same rule as the feed.
  if (page > meta.last_page && page > 1) notFound()
  const pageUrl = `${SITE_URL}${canonicalPathFor(page)}`
  const offset = (meta.current_page - 1) * meta.per_page

  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: COPY.news.pageTitle, url: `${SITE_URL}/news` },
      { name: COPY.news.popularTitle, url: `${SITE_URL}/news/most-popular` },
    ],
    pageUrl,
  )

  const graph = [
    buildWebPageSchema({
      name: COPY.news.popularTitle,
      url: pageUrl,
      description: COPY.news.popularDescription,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    breadcrumb,
    buildItemListSchema(
      COPY.news.popularTitle,
      pageUrl,
      // Position continues across pages, so the list describes the real order
      // of the picks rather than restarting at 1 on every page.
      posts.map((post, i) => ({
        position: offset + i + 1,
        name: post.title,
        url: `${SITE_URL}/news/${post.slug}`,
      })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        {/* Same 90rem measure as /news, minus the rail: this IS the rail. */}
        <div className="mx-auto max-w-[90rem]">
          <nav className="mb-6 text-sm text-slate-400">
            <Link href="/" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">Home</Link>
            {' / '}
            <Link href="/news" className="inline-block -mx-1 px-1 py-3 -my-3 hover:text-emerald-600">{COPY.news.pageTitle}</Link>
            {' / '}
            <span className="text-slate-600">{COPY.news.popularTitle}</span>
          </nav>

          <header className="mb-10">
            <h1 className="font-display text-4xl font-semibold text-slate-900">{COPY.news.popularTitle}</h1>
            <p className="mt-2 max-w-2xl text-slate-500">{COPY.news.popularDescription}</p>
          </header>

          {posts.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
              {COPY.news.emptyTopic}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" role="list">
              {posts.map((post) => <Card key={post.id} post={post} />)}
            </ul>
          )}

          <Pagination basePath="/news/most-popular" current={meta.current_page} last={meta.last_page} />
        </div>
      </main>
    </>
  )
}
