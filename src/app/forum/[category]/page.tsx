import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getForumCategory, getSiteFeatures } from '@/lib/api'
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
  buildWebPageSchema,
  breadcrumbIdFor,
  jsonLdScript,
} from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import { relativeTime } from '@/lib/relativeTime'
import Breadcrumbs from '@/components/forum/Breadcrumbs'
import Pagination from '@/components/Pagination'

/**
 * One board, listing its discussions.
 *
 * Pinned first, then most recently active — served by
 * `forum_articles_category_idx` as a BACKWARD index scan, so the ordering costs
 * no filesort. See the migration for why an ascending index is correct there.
 *
 * OFFSET paginated, and that is deliberate rather than an oversight: a board
 * holds hundreds of discussions and a reader genuinely wants page 7, whereas a
 * thread holds thousands of posts read front-to-back. The table that grows
 * fastest gets keyset; this one gets numbered pages, which are worth more here.
 */

export const revalidate = 3600

type Props = {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string }>
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : 1
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category } = await params
  const page = parsePage((await searchParams).page)

  const res = await getForumCategory(category, page).catch(() => null)

  if (res === null) {
    return { title: COPY.communityForum.title }
  }

  const board = res.data.category
  const title = page > 1 ? `${board.name} — Page ${page}` : board.name

  return {
    title,
    description: board.description ?? COPY.communityForum.metaDescription,
    // Page 2+ keeps its OWN canonical rather than collapsing onto page 1: the
    // pages hold different discussions, so pointing them all at page 1 would ask
    // Google to drop real content. The differing <title> is what keeps them from
    // reading as duplicates.
    alternates: { canonical: page > 1 ? `/forum/${category}?page=${page}` : `/forum/${category}` },
    openGraph: {
      type: 'website',
      url: page > 1 ? `/forum/${category}?page=${page}` : `/forum/${category}`,
      title,
      description: board.description ?? undefined,
    },
  }
}

export default async function ForumCategoryPage({ params, searchParams }: Props) {
  const { community_forum_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const { category } = await params
  const page = parsePage((await searchParams).page)

  const res = await getForumCategory(category, page).catch(() => null)
  if (res === null) notFound()

  const board = res.data.category
  const articles = res.data.articles
  const meta = res.meta
  const now = Date.now()

  const pageUrl = `${SITE_URL}/forum/${category}`

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: COPY.communityForum.title, href: '/forum' },
    { name: board.name, href: `/forum/${category}` },
  ]

  const graph = [
    buildWebPageSchema({
      name: board.name,
      url: pageUrl,
      description: board.description ?? undefined,
      breadcrumbId: breadcrumbIdFor(pageUrl),
    }),
    buildBreadcrumbSchema(
      crumbs.map((c) => ({ name: c.name, url: `${SITE_URL}${c.href === '/' ? '' : c.href}` })),
      pageUrl,
    ),
    buildItemListSchema(
      board.name,
      pageUrl,
      articles.map((a, i) => ({
        position: (page - 1) * 20 + i + 1,
        name: a.title,
        url: `${SITE_URL}/forum/${category}/${a.slug}`,
      })),
    ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Same 90rem measure as the other listings. */}
        <div className="mx-auto max-w-[90rem]">
          <Breadcrumbs crumbs={crumbs} />

          <header className="mb-8">
            <h1 className="font-display text-3xl font-semibold text-slate-900">{board.name}</h1>
            {board.description && <p className="mt-2 max-w-2xl text-slate-500">{board.description}</p>}
            <p className="mt-2 text-sm tabular-nums text-slate-400">
              {COPY.communityForum.boardTotals(board.posts_count, board.articles_count)}
            </p>
          </header>

          {articles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {COPY.communityForum.noDiscussions}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-slate-500">{COPY.communityForum.noDiscussionsBody}</p>
              <Link
                href="/forum"
                className="mt-6 inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
              >
                {COPY.communityForum.cta}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/70 rounded-2xl border border-slate-200 bg-white px-4" role="list">
              {articles.map((article) => (
                <li key={article.id}>
                  {/* Stacks below sm so the counters never push the title into a
                      horizontal scroll at 360px. */}
                  <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {article.pinned && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.06em] text-emerald-700">
                            {COPY.communityForum.pinned}
                          </span>
                        )}
                        {article.locked && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.06em] text-slate-500">
                            {COPY.communityForum.locked}
                          </span>
                        )}
                        <Link
                          href={`/forum/${category}/${article.slug}`}
                          className="inline-block py-3 -my-3 font-display text-base font-bold text-slate-900 transition-colors hover:text-emerald-700"
                        >
                          {article.title}
                        </Link>
                      </div>
                      {article.excerpt && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{article.excerpt}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        {article.author?.name && (
                          <span>{COPY.communityForum.startedBy} {article.author.name}</span>
                        )}
                        {article.last_post_at && (
                          <>
                            {article.author?.name && <span aria-hidden> · </span>}
                            <time dateTime={article.last_post_at}>{relativeTime(article.last_post_at, now)}</time>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-xs tabular-nums text-slate-500 sm:w-32 sm:text-right">
                      <div>{COPY.communityForum.replies(article.posts_count)}</div>
                      <div className="text-slate-400">{COPY.communityForum.views(article.views_count)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {meta.last_page > 1 && (
            <div className="mt-8">
              <Pagination basePath={`/forum/${category}`} current={meta.current_page} last={meta.last_page} />
            </div>
          )}
        </div>
      </main>
    </>
  )
}
