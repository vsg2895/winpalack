import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { unsubscribe } from '@/lib/api'

// One-click unsubscribe landing. Performs the removal server-side on load
// (idempotent) and is never indexed.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
}

/**
 * Accent panel for this page — THIS site's brand colour, not a shared default.
 * emerald-800 — the brand green, darkened so the white/80 subtitle
 * still clears AA (emerald-600 gave only 2.95:1 there). white 7.68:1, white/80 5.55:1.
 * Both figures matter: the heading is large text, but the `text-white/80`
 * subtitle is small and needs the full 4.5:1.
 */
const ACCENT = '#065f46'
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'our newsletter'

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ done?: string }>
}

/**
 * The actual opt-out. A Server Action, so it only ever runs on a POST.
 *
 * This used to happen on page load. Mail-server anti-spam scanners fetch every
 * URL in a message, so a single scan silently unsubscribed the recipient — the
 * page had to be opened by a human for that to be intended. GET now only asks;
 * nothing is recorded until this button is pressed.
 */
async function confirmUnsubscribe(formData: FormData): Promise<void> {
  'use server'
  const token = String(formData.get('token') ?? '')
  const ok = await unsubscribe(token)
  redirect(`/unsubscribe/${encodeURIComponent(token)}?done=${ok ? '1' : '0'}`)
}

export default async function UnsubscribePage({ params, searchParams }: Props) {
  const { token } = await params
  const { done } = await searchParams
  // `done` is only ever present after the action above redirected here.
  const submitted = done !== undefined
  const ok = done === '1'

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-8 py-7 text-white" style={{ backgroundColor: ACCENT }}>
          <h1 className="text-xl font-bold">
            {!submitted
              ? 'Confirm unsubscribe'
              : ok
                ? 'You’ve been unsubscribed'
                : 'Something went wrong'}
          </h1>
          <p className="mt-1 text-sm text-white/80">{SITE_NAME}</p>
        </div>

        <div className="px-8 py-7">
          {!submitted ? (
            <>
              <p className="text-sm leading-relaxed text-zinc-600">
                Click the button below to stop receiving these emails from{' '}
                <span className="font-semibold text-zinc-900">{SITE_NAME}</span>.
              </p>

              <form action={confirmUnsubscribe}>
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: ACCENT }}
                >
                  Unsubscribe me
                </button>
              </form>
            </>
          ) : ok ? (
            <p className="text-sm leading-relaxed text-zinc-600">
              You will no longer receive these emails from{' '}
              <span className="font-semibold text-zinc-900">{SITE_NAME}</span>. Changed your mind?
              You can subscribe again any time from our homepage.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-zinc-600">
              We couldn’t process this unsubscribe link. It may be invalid or expired. Please try the
              link in your most recent email, or contact support.
            </p>
          )}

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  )
}
