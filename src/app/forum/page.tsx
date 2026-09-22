import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getForumIndex, getSiteFeatures } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import { relativeTime } from '@/lib/relativeTime'
import Breadcrumbs from '@/components/forum/Breadcrumbs'
import BoardIcon from '@/components/forum/BoardIcon'
import ForumTabs from '@/components/forum/ForumTabs'
import type { ForumIndexResponse } from '@shared/types/community-forum'

/**
 * The forum index.
 *
 * STRUCTURE follows the audited competitor's forum hub — sections holding
 * boards, each row carrying its totals and its last post, with Categories /
 * Latest Posts / Hot Threads as tabs above. That arrangement is how a reader
 * expects a board index to be organised, and it is the part worth taking.
 *
 * The APPEARANCE is winpalack's own: emerald on a light ground, the display face
 * used across the site. Nothing here is copied from how their page looks.
 *
 * ── The performance contract ────────────────────────────────────────────────
 *
 * Every number on this page comes from a DENORMALISED COLUMN. "2,301 posts in 25
 * discussions" and the last-post line are read off `forum_categories`; the API
 * never touches `forum_posts` to build the board list. Measured at 0.52ms of SQL
 * against a 50,000-post seed.
 */

export const revalidate = 3600

const PAGE_URL = `${SITE_URL}/forum`

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.communityForum.metaTitle,
    description: COPY.communityForum.metaDescription,
    alternates: { canonical: '/forum' },
    openGraph: {
      type: 'website',
      url: '/forum',
      title: COPY.communityForum.metaTitle,
      description: COPY.communityForum.metaDescription,
    },
  }
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-center backdrop-blur">
      <div className="font-display text-xl font-bold tabular-nums text-slate-900">{value.toLocaleString('en-GB')}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

function BoardRow({ board, now }: { board: ForumIndexResponse['sections'][number]['categories'][number]; now: number }) {
  const last = board.last_post

  return (
    <li className="border-t border-slate-200/70 first:border-t-0">
      {/* Stacks on a phone, splits at sm. The last-post column is the part that
          would otherwise force a horizontal scroll at 360px. */}
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <BoardIcon icon={board.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <Link
              href={`/forum/${board.slug}`}
              className="inline-block py-3 -my-3 font-display text-base font-bold text-slate-900 transition-colors hover:text-emerald-700"
            >
              {board.name}
            </Link>
            {board.description && (
              <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{board.description}</p>
            )}
            {/* Straight off the denormalised columns — no COUNT() anywhere. */}
            <p className="mt-1 text-xs text-slate-400 tabular-nums">
              {COPY.communityForum.boardTotals(board.posts_count, board.articles_count)}
            </p>
          </div>
        </div>

        <div className="shrink-0 sm:w-56 sm:text-right">
          {last?.article_slug ? (
            <>
              <Link
                href={`/forum/${board.slug}/${last.article_slug}`}
                className="line-clamp-1 py-3 -my-3 text-sm font-semibold text-slate-700 transition-colors hover:text-emerald-700"
              >
                {last.article_title}
              </Link>
              <p className="mt-0.5 text-xs text-slate-400">
                {last.at && <time dateTime={last.at}>{relativeTime(last.at, now)}</time>}
                {last.author_name && <span> · {last.author_name}</span>}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400">{COPY.communityForum.noPostsYet}</p>
          )}
        </div>
      </div>
    </li>
  )
}

export default async function ForumIndexPage() {
  const { community_forum_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const { data } = await getForumIndex()
  const { sections, stats, latest, hot } = data

  // ONE timestamp for the whole render, passed down. Calling Date.now() per row
  // would let two rows on the same page disagree about what "now" is.
  const now = Date.now()

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: COPY.communityForum.title, href: '/forum' },
  ]

  const graph = [
    buildWebPageSchema({
      name: COPY.communityForum.title,
      url: PAGE_URL,
      description: COPY.communityForum.metaDescription,
      breadcrumbId: breadcrumbIdFor(PAGE_URL),
    }),
    buildBreadcrumbSchema(
      crumbs.map((c) => ({ name: c.name, url: `${SITE_URL}${c.href === '/' ? '' : c.href}` })),
      PAGE_URL,
    ),
  ]

  const hasBoards = sections.length > 0

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Same 90rem measure as the other listings. */}
        <div className="mx-auto max-w-[90rem]">
          <Breadcrumbs crumbs={crumbs} />

          <header className="mb-8">
            <h1 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">
              {COPY.communityForum.title}
            </h1>
            <p className="mt-3 max-w-2xl text-slate-500">{COPY.communityForum.intro}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* The primary CTA. Points at the boards rather than at a
                  "new thread" action, because visitors cannot start threads —
                  only reply to them. */}
              <Link
                href={hasBoards ? `/forum/${sections[0]?.categories[0]?.slug ?? ''}` : '/reviews'}
                className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {COPY.communityForum.cta}
              </Link>
              <Link
                href="/reviews"
                className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white/70 px-6 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:border-emerald-300 hover:text-emerald-700"
              >
                {COPY.communityForum.ctaReviews}
              </Link>
            </div>
          </header>

          {/* Supporting widgets, rendered only where the data genuinely exists.
              "Online now" is a real bounded query over forum_users.last_seen_at,
              not an invented figure. */}
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={stats.posts} label={COPY.communityForum.statPosts} />
            <Stat value={stats.articles} label={COPY.communityForum.statDiscussions} />
            <Stat value={stats.members} label={COPY.communityForum.statMembers} />
            <Stat value={stats.online} label={COPY.communityForum.statOnline} />
          </div>

          {!hasBoards ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
              <h2 className="font-display text-xl font-semibold text-slate-900">
                {COPY.communityForum.emptyTitle}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-slate-500">{COPY.communityForum.emptyBody}</p>
              <Link
                href="/reviews"
                className="mt-6 inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
              >
                {COPY.communityForum.emptyCta}
              </Link>
            </div>
          ) : (
            <ForumTabs
              tabs={[
                {
                  id: 'categories',
                  label: COPY.communityForum.tabCategories,
                  panel: (
                    <div className="space-y-8">
                      {sections.map((section) => (
                        <section key={section.id} aria-labelledby={`section-${section.slug}`}>
                          <h2
                            id={`section-${section.slug}`}
                            className="font-display text-lg font-semibold text-slate-900"
                          >
                            {section.name}
                          </h2>
                          {section.description && (
                            <p className="mt-0.5 text-sm text-slate-500">{section.description}</p>
                          )}
                          <ul className="mt-2 rounded-2xl border border-slate-200 bg-white px-4" role="list">
                            {section.categories.map((board) => (
                              <BoardRow key={board.id} board={board} now={now} />
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ),
                },
                {
                  id: 'latest',
                  label: COPY.communityForum.tabLatest,
                  panel:
                    latest.length === 0 ? (
                      <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
                        {COPY.communityForum.noPostsYet}
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-200/70 rounded-2xl border border-slate-200 bg-white px-4" role="list">
                        {latest.map((post) => (
                          <li key={post.id} className="py-4">
                            {post.article && (
                              <Link
                                href={`/forum/${post.article.category}/${post.article.slug}#post-${post.id}`}
                                className="font-semibold text-slate-800 transition-colors hover:text-emerald-700"
                              >
                                {post.article.title}
                              </Link>
                            )}
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{post.excerpt}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {post.author && <span>{post.author}</span>}
                              {post.created_at && (
                                <>
                                  {post.author && <span aria-hidden> · </span>}
                                  <time dateTime={post.created_at}>{relativeTime(post.created_at, now)}</time>
                                </>
                              )}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ),
                },
                {
                  id: 'hot',
                  label: COPY.communityForum.tabHot,
                  panel:
                    hot.length === 0 ? (
                      <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
                        {COPY.communityForum.noPostsYet}
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-200/70 rounded-2xl border border-slate-200 bg-white px-4" role="list">
                        {hot.map((thread) => (
                          <li key={thread.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4">
                            <Link
                              href={`/forum/${thread.category}/${thread.slug}`}
                              className="min-w-0 flex-1 font-semibold text-slate-800 transition-colors hover:text-emerald-700"
                            >
                              {thread.title}
                            </Link>
                            <span className="text-xs tabular-nums text-slate-400">
                              {COPY.communityForum.threadTotals(thread.posts_count, thread.views_count)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ),
                },
              ]}
            />
          )}
        </div>
      </main>
    </>
  )
}
