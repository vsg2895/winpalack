import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSiteFeatures, getForumDiscussions } from '@/lib/api'
import { getForumMember, getMyForumPosts } from '@/lib/forumSession'
import { COPY } from '@/constants/copy'
import Breadcrumbs from '@/components/forum/Breadcrumbs'
import SignOutButton from '@/components/forum/SignOutButton'
import MyPosts from '@/components/forum/MyPosts'
import NewPostForm from '@/components/forum/NewPostForm'

/**
 * The member's own page. Signing in and registering live at /login and
 * /register (see components/forum/AuthPage); an anonymous visitor who lands
 * here is sent to /login and brought back afterwards.
 *
 * `noindex`: a per-member page has nothing to rank for.
 */

// Per-visitor. An ISR cache here would serve one member's signed-in view to
// everybody who hit the page.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: true },
  alternates: { canonical: '/forum/account' },
}

export default async function ForumAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { accounts_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const member = await getForumMember()
  if (!member) {
    const { next } = await searchParams
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/forum/account'
    redirect(`/login?next=${encodeURIComponent(safeNext)}`)
  }

  // Both are per-visitor and uncached; the discussion list is public and
  // cached. Fetched together so the page costs one round trip, not three.
  const [posts, discussions] = await Promise.all([
    getMyForumPosts(),
    member.verified ? getForumDiscussions() : Promise.resolve([]),
  ])

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: COPY.communityForum.title, href: '/forum' },
    { name: 'My account', href: '/forum/account' },
  ]

  return (
    <main className="px-4 py-10 sm:py-14">
      <div className="container mx-auto max-w-2xl">
        <Breadcrumbs crumbs={crumbs} />

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="font-display text-xl font-semibold text-slate-900">
              Signed in as {member.display_name}
            </h1>

            {!member.verified && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Confirm your email address before posting — check your inbox for the link.
              </p>
            )}
            {member.verified && member.pre_moderated && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {COPY.communityForum.premoderationNotice}
              </p>
            )}

            <p className="mt-3 text-sm tabular-nums text-slate-500">
              {COPY.communityForum.replies(member.posts_count)} accepted
            </p>

            <div className="mt-5 flex items-center gap-4">
              <Link
                href="/forum"
                className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                {COPY.communityForum.cta}
              </Link>
              <SignOutButton />
            </div>
          </div>

        {/* Writing is gated on a CONFIRMED address, the same condition the API
            enforces. Showing the composer to an unconfirmed member would offer
            a form whose every submission is refused. */}
        {member.verified && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">Write a post</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your post is reviewed by a moderator before it appears in the forum.
            </p>
            <NewPostForm discussions={discussions} />
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-slate-900">My posts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Posts awaiting review can still be edited. Once published they become part of the
            discussion and are fixed.
          </p>
          <MyPosts posts={posts} />
        </section>
      </div>
    </main>
  )
}
