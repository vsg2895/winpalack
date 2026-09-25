import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSiteFeatures, verifyForumMember } from '@/lib/api'
import { COPY } from '@/constants/copy'

/**
 * Where the "Confirm my address" button in the registration email lands.
 *
 * The email used to link straight at the signed API route. That route is
 * POST-only — mail clients prefetch GET links, and a prefetch must not confirm
 * an address nobody clicked — so a real click produced a raw JSON error
 * instead of a page, on the shared API domain rather than this site.
 *
 * So the link comes here, and the confirmation POST happens server-side. The
 * same shape the newsletter double opt-in uses at /verify/[token].
 *
 * Lives under /register because that is where the account was created — the
 * confirmation is the last step of registering, not a forum page.
 *
 * Per-visitor and never cached: the result depends entirely on a one-time
 * signature in the query string.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirm your address',
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ member?: string; expires?: string; signature?: string }>
}

export default async function ForumVerifyPage({ searchParams }: Props) {
  const { accounts_enabled: enabled } = await getSiteFeatures()
  if (!enabled) notFound()

  const { member, expires, signature } = await searchParams

  // A link missing any part of the signature was mangled in transit — usually
  // a mail client that wrapped it across lines. Treated as a failure rather
  // than sent to the API, which would only reject it anyway.
  const complete = Boolean(member && expires && signature)
  const result = complete
    ? await verifyForumMember(member as string, expires as string, signature as string)
    : { ok: false, expired: false }

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="bg-emerald-800 px-8 py-7">
          <h1 className="font-display text-xl font-semibold text-white">
            {result.ok ? 'Address confirmed' : 'That link did not work'}
          </h1>
        </div>

        <div className="px-8 py-7">
          {result.ok ? (
            <>
              <p className="text-slate-600">
                Your email address is confirmed. You can post in {COPY.communityForum.title} now.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/forum"
                  className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  {COPY.communityForum.cta}
                </Link>
                <Link
                  href="/forum/account"
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                >
                  My account
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-600">
                {result.expired || !complete
                  ? 'This confirmation link has expired or was incomplete. Sign in and we will send you a new one.'
                  : 'We could not confirm this address. The link may already have been used.'}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Sign in
                </Link>
                <Link
                  href="/forum"
                  className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
                >
                  {COPY.communityForum.title}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
