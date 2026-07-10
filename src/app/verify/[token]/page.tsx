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

// Accent matches this site's identity (and its unsubscribe page).
const ACCENT = '#4f46e5'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'our newsletter'

type Props = { params: Promise<{ token: string }> }

export default async function VerifyPage({ params }: Props) {
  const { token } = await params
  const ok = await verifyEmail(token)

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-8 py-7 text-white" style={{ backgroundColor: ACCENT }}>
          <h1 className="text-xl font-bold">
            {ok ? '🎉 You’re all set!' : 'Something went wrong'}
          </h1>
          <p className="mt-1 text-sm text-white/80">{SITE_NAME}</p>
        </div>

        <div className="px-8 py-7">
          {ok ? (
            <p className="text-sm leading-relaxed text-zinc-600">
              Your email is verified and your subscription to{' '}
              <span className="font-semibold text-zinc-900">{SITE_NAME}</span> is now active. You’ll
              be the first to hear about our latest special offers and exclusive bonuses.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-600">
              We couldn’t verify this link. It may be invalid or expired. Please use the link in your
              most recent email, or subscribe again from our homepage.
            </p>
          )}

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            Explore {SITE_NAME}
          </Link>
        </div>
      </div>
    </main>
  )
}
