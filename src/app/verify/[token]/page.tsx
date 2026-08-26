import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyEmail } from '@/lib/api'

// Double opt-in verify landing. Confirms the subscriber server-side on load
// (idempotent) and is never indexed.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Email verified',
  robots: { index: false, follow: false },
}

/**
 * Accent panel for this page — THIS site's brand colour, not a shared default.
 */
const ACCENT = '#065f46'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'our newsletter'

// Focus ring shared by both links, so the page stays keyboard-navigable, and
// transitions are dropped under prefers-reduced-motion.
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current'

type Props = { params: Promise<{ token: string }> }

export default async function VerifyPage({ params }: Props) {
  const { token } = await params
  const { ok, bonusEmailExpected } = await verifyEmail(token)

  // The token in this URL is the subscriber's existing subscription token, and
  // the unsubscribe route resolves any of their per-stream tokens — so the
  // opt-out link reuses both rather than minting anything new.
  const unsubscribeHref = `/unsubscribe/${encodeURIComponent(token)}`

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-8 py-7 text-white" style={{ backgroundColor: ACCENT }}>
          {ok && bonusEmailExpected && (
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              <span aria-hidden="true">✓</span> Email verified
            </p>
          )}
          <h1 className="text-xl font-bold">
            {!ok
              ? 'Something went wrong'
              : bonusEmailExpected
                ? 'Your bonus is on its way'
                : '🎉 You’re all set!'}
          </h1>
          <p className="mt-1 text-sm text-white/80">{SITE_NAME}</p>
        </div>

        <div className="px-8 py-7">
          {!ok ? (
            <p className="text-sm leading-relaxed text-zinc-600">
              We couldn’t verify this link. It may be invalid or expired. Please use the link in your
              most recent email, or subscribe again from our homepage.
            </p>
          ) : bonusEmailExpected ? (
            <>
              <p className="text-sm leading-relaxed text-zinc-600">
                Your subscription to <span className="font-semibold text-zinc-900">{SITE_NAME}</span> is
                active. We&apos;re sending your exclusive subscriber bonus to your inbox now.
              </p>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-bold text-amber-900">Don&apos;t see it?</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-900">
                  <li>
                    Check your <span className="font-bold">Promotions</span> tab and your{' '}
                    <span className="font-bold">Spam</span> folder — that&apos;s where it usually
                    lands.
                  </li>
                  <li>
                    Search your mailbox for <span className="font-bold">{SITE_NAME}</span>.
                  </li>
                  <li>
                    Found it in Spam? Mark it <span className="font-bold">Not spam</span> and drag it
                    to your inbox, so future offers reach you.
                  </li>
                  <li>Add us to your contacts so our emails always arrive.</li>
                </ul>
              </div>
            </>
          ) : (
            // Promotion after verification is switched off: confirm the
            // subscription, but never promise an email that will not be sent.
            <p className="text-sm leading-relaxed text-zinc-600">
              Your email is verified and your subscription to{' '}
              <span className="font-semibold text-zinc-900">{SITE_NAME}</span> is now active. You’ll be
              the first to hear about our latest special offers and exclusive bonuses.
            </p>
          )}

          <Link
            href="/"
            className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 motion-reduce:transition-none ${FOCUS}`}
            style={{ backgroundColor: ACCENT }}
          >
            Explore {SITE_NAME}
          </Link>

          {ok && bonusEmailExpected && (
            <>
              <hr className="mt-7 border-zinc-200" />
              <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                18+ only. Gambling can be addictive — play responsibly. You can{' '}
                <Link href={unsubscribeHref} className={`underline ${FOCUS}`}>
                  unsubscribe
                </Link>{' '}
                at any time.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
