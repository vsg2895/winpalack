import { redirect } from 'next/navigation'
import { getSiteFeatures } from '@/lib/api'
import { getForumMember } from '@/lib/forumSession'
import { COPY } from '@/constants/copy'
import Breadcrumbs from '@/components/forum/Breadcrumbs'
import AccountForm from '@/components/forum/AccountForm'
import { notFound } from 'next/navigation'

/**
 * The body of /login and /register.
 *
 * Two URLs, one component: the form is shared, but each mode lives at its own
 * clean address so a link can say "/register" rather than
 * "/forum/account?mode=register", and so each page carries its own title.
 * A member who is already signed in is sent straight on — an auth form shown
 * to someone who is authenticated is a dead end.
 */
export default async function AuthPage({
  mode,
  searchParams,
}: {
  mode: 'signin' | 'register'
  searchParams: Promise<{ next?: string }>
}) {
  // Accounts, NOT the board. Signing up is worth offering before the first
  // discussion exists, and gating it on the forum meant a site with no board
  // had no way to let anybody in at all.
  const { accounts_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const { next } = await searchParams

  // Only ever a path on this site. An open redirect through `?next=` would let
  // a phishing link land on our sign-in form and bounce to theirs.
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined

  if (await getForumMember()) {
    redirect(safeNext ?? '/forum/account')
  }

  // NOT COPY.communityForum.signInPrompt ("Sign in to reply") — that belongs on
  // a discussion, where replying is what the visitor was trying to do. Accounts
  // are no longer tied to the board, so this page cannot promise a thread to
  // reply to; it is the site's sign-in page and says so.
  const title = mode === 'signin' ? 'Sign in' : 'Create your account'
  const body = mode === 'signin'
    ? COPY.communityForum.signInBody
    : 'Join the discussion — pick a name, add your email and you are in.'

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: COPY.communityForum.title, href: '/forum' },
    { name: mode === 'signin' ? 'Sign in' : 'Create account', href: mode === 'signin' ? '/login' : '/register' },
  ]

  return (
    <main className="px-4 py-10 sm:py-14">
      <div className="container mx-auto max-w-md">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="font-display text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 mb-6 text-slate-500">{body}</p>
        <AccountForm next={safeNext} initialMode={mode} />
      </div>
    </main>
  )
}
