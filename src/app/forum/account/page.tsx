import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSiteFeatures } from '@/lib/api'
import { getForumMember } from '@/lib/forumSession'
import { COPY } from '@/constants/copy'
import Breadcrumbs from '@/components/forum/Breadcrumbs'
import AccountForm from '@/components/forum/AccountForm'
import SignOutButton from '@/components/forum/SignOutButton'

/**
 * Sign in, or create a forum account.
 *
 * `noindex`: an authentication form has nothing to rank for, and letting it into
 * the index only competes with the pages that do.
 */

// Per-visitor. An ISR cache here would serve one member's signed-in view to
// everybody who hit the page.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Forum account',
  robots: { index: false, follow: true },
  alternates: { canonical: '/forum/account' },
}

export default async function ForumAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>
}) {
  const { community_forum_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const member = await getForumMember()
  const { next, mode } = await searchParams

  // Only ever a path on this site. An open redirect through `?next=` would let
  // a phishing link land on our sign-in form and bounce to theirs.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: COPY.communityForum.title, href: '/forum' },
    { name: 'Account', href: '/forum/account' },
  ]

  return (
    <main className="px-4 py-10 sm:py-14">
      <div className="container mx-auto max-w-md">
        <Breadcrumbs crumbs={crumbs} />

        {member ? (
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
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold text-slate-900">
              {COPY.communityForum.signInPrompt}
            </h1>
            <p className="mt-2 mb-6 text-slate-500">{COPY.communityForum.signInBody}</p>
            <AccountForm next={safeNext} initialMode={mode === 'register' ? 'register' : 'signin'} />
          </>
        )}
      </div>
    </main>
  )
}
