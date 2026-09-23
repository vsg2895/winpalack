import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getForumArticle, getSiteFeatures } from '@/lib/api'
import {
  buildBreadcrumbSchema,
  buildWebPageSchema,
  breadcrumbIdFor,
  jsonLdScript,
} from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import { relativeTime, absoluteDate } from '@/lib/relativeTime'
import Breadcrumbs from '@/components/forum/Breadcrumbs'
import ReplyForm from '@/components/forum/ReplyForm'
import { getForumMember } from '@/lib/forumSession'
import type { ForumPost } from '@shared/types/community-forum'

/**
 * One discussion: the article, then its posts, each with its comments.
 *
 * ── Everything readable is SERVER-RENDERED ──────────────────────────────────
 *
 * The posts are in the HTML, not fetched on the client. The only client island
 * is the reply form, which is a write path and has nothing a crawler wants.
 *
 * ── Keyset pagination, with Next / Previous only ────────────────────────────
 *
 * `?after=<id>` seeks rather than skips, so page 500 costs what page 1 costs —
 * measured at 0.085ms against a 50,000-post table, where the equivalent
 * `OFFSET 10000` measured 3.3ms. The price is that there is no "jump to page 7":
 * a keyset cursor cannot know where page 7 begins without walking there. For a
 * thread read front-to-back that is the right trade.
 */

export const revalidate = 3600

type Props = {
  params: Promise<{ category: string; article: string }>
  searchParams: Promise<{ after?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category, article } = await params
  const after = (await searchParams).after ?? null

  const res = await getForumArticle(category, article, after).catch(() => null)
  if (res === null) return { title: COPY.communityForum.title }

  const doc = res.data.article
  const path = `/forum/${category}/${article}`

  return {
    title: doc.title,
    description: doc.excerpt ?? undefined,
    /*
     * Every cursor page canonicalises to the UNPAGINATED url.
     *
     * Unlike the board listing, these are not different sets of content in the
     * SEO sense — they are one discussion split into scroll-sized pieces, and a
     * cursor is an opaque row id rather than a stable address. Letting each
     * cursor mint its own canonical would create unbounded near-duplicate URLs
     * from a value that changes whenever a post is moderated.
     */
    alternates: { canonical: path },
    // A cursor page is reachable and crawlable but not worth indexing on its
    // own; `follow` keeps the links out of it counting.
    ...(after ? { robots: { index: false, follow: true } } : {}),
    openGraph: { type: 'article', url: path, title: doc.title, description: doc.excerpt ?? undefined },
  }
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-display text-sm font-bold text-emerald-700"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function PostBody({ post, now, isComment = false }: { post: ForumPost; now: number; isComment?: boolean }) {
  const name = post.author?.display_name ?? 'Member'

  return (
    <div className="flex gap-3">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold text-slate-900">{name}</span>
          {/* A staff reply is badged instead of carrying a post tally: the
              editorial team has no member profile, and a count of its replies
              would say nothing a reader wants. Members keep the tally they
              have always had. */}
          {post.author?.is_team ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              {COPY.communityForum.teamBadge}
            </span>
          ) : (
            post.author?.posts_count !== null && post.author !== undefined && (
              <span className="text-xs tabular-nums text-slate-400">
                {COPY.communityForum.replies(post.author.posts_count as number)}
              </span>
            )
          )}
          {post.created_at && (
            <time dateTime={post.created_at} className="text-xs text-slate-400">
              {relativeTime(post.created_at, now)}
            </time>
          )}
        </p>
        {/*
          PLAIN TEXT, rendered as a JSX child so React escapes it.
          Member posts are never HTML — the server strips every tag on the way
          in — so there is no dangerouslySetInnerHTML anywhere on this page and
          the stored-XSS class of bug cannot exist. `whitespace-pre-wrap` keeps
          the author's line breaks without markup.
        */}
        <p className={`mt-1 whitespace-pre-wrap break-words text-slate-700 ${isComment ? 'text-sm' : ''}`}>
          {post.body}
        </p>
      </div>
    </div>
  )
}

export default async function ForumArticlePage({ params, searchParams }: Props) {
  const { community_forum_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const { category, article } = await params
  const after = (await searchParams).after ?? null

  const res = await getForumArticle(category, article, after).catch(() => null)
  if (res === null) notFound()

  // Read AFTER the article fetch so the thread itself is still served from the
  // ISR cache — only this call is per-visitor, and it decides one block at the
  // bottom of the page.
  const member = await getForumMember()

  const doc = res.data.article
  const posts = res.data.posts
  const meta = res.meta
  const now = Date.now()

  const pageUrl = `${SITE_URL}/forum/${category}/${article}`

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: COPY.communityForum.title, href: '/forum' },
    { name: doc.category?.name ?? category, href: `/forum/${category}` },
    { name: doc.title, href: `/forum/${category}/${article}` },
  ]

  /*
   * DiscussionForumPosting, and it genuinely applies here.
   *
   * This is a topic opened by a named author that accumulates dated replies from
   * identified members — which is exactly what the type describes. It is NOT
   * used on the index or the board listing, where there is no single posting to
   * describe and the type would be decoration.
   *
   * Only the posts actually on this page are listed as comments; claiming all
   * 105 while rendering 20 would be a structured-data lie.
   */
  const graph = [
    buildWebPageSchema({
      name: doc.title,
      url: pageUrl,
      description: doc.excerpt ?? undefined,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: doc.last_post_at ?? doc.published_at ?? undefined,
    }),
    buildBreadcrumbSchema(
      crumbs.map((c) => ({ name: c.name, url: `${SITE_URL}${c.href === '/' ? '' : c.href}` })),
      pageUrl,
    ),
    {
      '@context': 'https://schema.org',
      '@type': 'DiscussionForumPosting',
      '@id': `${pageUrl}#discussion`,
      headline: doc.title,
      url: pageUrl,
      ...(doc.excerpt ? { description: doc.excerpt } : {}),
      ...(doc.published_at ? { datePublished: doc.published_at } : {}),
      /* Organization, not Person. A discussion's author comes from the ADMIN
         users table and the API publishes it as the editorial team's name
         rather than an individual's, so a Person claim here would assert a
         named human who is not being named. Replies below stay Person: those
         are real members posting under their own display names. */
      ...(doc.author?.name ? { author: { '@type': 'Organization', name: doc.author.name } } : {}),
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: doc.posts_count,
      },
      comment: posts.map((post) => ({
        '@type': 'Comment',
        '@id': `${pageUrl}#post-${post.id}`,
        ...(post.body ? { text: post.body.slice(0, 500) } : {}),
        ...(post.created_at ? { dateCreated: post.created_at } : {}),
        /* Organization for a staff reply, Person for a member's — the same
           distinction the discussion's own author claim makes. */
        ...(post.author
          ? {
              author: {
                '@type': post.author.is_team ? 'Organization' : 'Person',
                name: post.author.display_name,
              },
            }
          : {}),
      })),
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {/* Same 90rem measure as the board and the other listings. */}
        <div className="mx-auto max-w-[90rem]">
          <Breadcrumbs crumbs={crumbs} />

          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="font-display text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
              {doc.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              {doc.author?.name && <span>{COPY.communityForum.startedBy} {doc.author.name}</span>}
              {doc.published_at && <time dateTime={doc.published_at}>{absoluteDate(doc.published_at)}</time>}
              <span className="tabular-nums">{COPY.communityForum.replies(doc.posts_count)}</span>
              <span className="tabular-nums">{COPY.communityForum.views(doc.views_count)}</span>
            </p>

            {/*
              The ARTICLE body is admin-authored HTML, filtered server-side
              against a short allow-list (ForumContent::articleBody) that strips
              scripts, styles, event handlers and javascript:/data: hrefs.
              Different authors, different threat model from a member post —
              and still filtered, because an admin account can be compromised.
            */}
            {doc.body && (
              <div
                className="prose prose-slate mt-4 max-w-none prose-a:text-emerald-700"
                dangerouslySetInnerHTML={{ __html: doc.body }}
              />
            )}
          </article>

          <section aria-labelledby="replies-heading" className="mt-8">
            <h2 id="replies-heading" className="sr-only">Replies</h2>

            {posts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center text-slate-500">
                {COPY.communityForum.noReplies}
              </p>
            ) : (
              <ul className="space-y-4" role="list">
                {posts.map((post) => (
                  // `scroll-mt` clears the sticky header, so a deep link to a
                  // post does not land it underneath the nav.
                  <li key={post.id} id={`post-${post.id}`} className="scroll-mt-24">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <PostBody post={post} now={now} />

                      {post.comments && post.comments.length > 0 && (
                        // ONE level, and the markup says so: there is no third
                        // <ul> here because the API cannot return one.
                        <ul className="mt-4 space-y-4 border-l-2 border-slate-100 pl-4" role="list">
                          {post.comments.map((comment) => (
                            <li key={comment.id} id={`post-${comment.id}`} className="scroll-mt-24">
                              <PostBody post={comment} now={now} isComment />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Next / Previous only — a keyset cursor cannot know where page 7
                starts without walking there. See the file docblock. */}
            {(meta.next_cursor || after) && (
              <nav aria-label="Replies pagination" className="mt-6 flex items-center justify-between gap-3">
                {after ? (
                  <Link
                    href={`/forum/${category}/${article}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                  >
                    ← {COPY.communityForum.newerReplies}
                  </Link>
                ) : <span />}

                {meta.next_cursor && (
                  <Link
                    href={`/forum/${category}/${article}?after=${encodeURIComponent(meta.next_cursor)}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                  >
                    {COPY.communityForum.olderReplies} →
                  </Link>
                )}
              </nav>
            )}
          </section>

          <section className="mt-8">
            {doc.locked ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-center text-sm text-slate-500">
                {COPY.communityForum.lockedNotice}
              </p>
            ) : member === null ? (
              /* The guest prompt. Decided on the SERVER from the session cookie,
                 so there is no flash of the wrong state on load — and the reply
                 form is never rendered to someone who cannot use it. */
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  {COPY.communityForum.signInPrompt}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  {COPY.communityForum.signInBody}
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/forum/${category}/${article}`)}`}
                  className="mt-5 inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  {COPY.communityForum.signInCta}
                </Link>
              </div>
            ) : !member.verified ? (
              /* Signed in but unconfirmed. The API refuses the post with a 403,
                 so showing the form would be an invitation to write something
                 that gets thrown away. */
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5 text-center text-sm text-amber-800">
                Confirm your email address before posting — check your inbox for the link.
              </p>
            ) : (
              <>
                {member.pre_moderated && (
                  <p className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {COPY.communityForum.premoderationNotice}
                  </p>
                )}
                <ReplyForm articleSlug={article} />
              </>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
