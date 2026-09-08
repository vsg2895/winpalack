import { after, NextResponse, type NextRequest } from 'next/server'
import { getCasino } from '@/lib/api'
import { API_URL } from '@/lib/config'

/**
 * Outbound affiliate redirect.
 *
 * Every "Visit casino" link points here instead of straight at the operator.
 * Two reasons, both from docs/admin-first.md:
 *
 *  1. the destination lives on the casino_site pivot and can be changed in the
 *     admin — a link that pointed at the operator directly would be baked into
 *     the rendered page and need a rebuild to change;
 *  2. clicks can be counted, which is otherwise unknowable.
 *
 * A ROUTE HANDLER, not a page: this must return a 302, and a React component
 * cannot. It also keeps API_SITE_KEY server-side, which a client-side redirect
 * would not.
 */

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ casinoSlug: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { casinoSlug } = await params
  const offerSlug = request.nextUrl.searchParams.get('offer')

  let destination: string | null = null

  try {
    const { data: casino } = await getCasino(casinoSlug)

    if (offerSlug) {
      // An offer's own link when one is set, falling back to the casino's.
      const offer = (casino.special_offers ?? []).find((o) => o.slug === offerSlug)
      destination = offer?.affiliate_url ?? null
    }

    // `attachment.affiliate_url` is the PER-SITE destination, which is the
    // whole point — the same casino can pay through different links per domain.
    destination ??= casino.attachment.affiliate_url ?? null
  } catch {
    destination = null
  }

  // No destination means the casino is unknown here or has no link configured.
  // Send the visitor somewhere useful rather than showing them an error for a
  // decision that is ours, not theirs.
  if (!destination) {
    return NextResponse.redirect(new URL('/casinos', request.nextUrl.origin), 302)
  }

  // `after()`, not a bare `void promise`. A fire-and-forget promise in a route
  // handler is NOT guaranteed to finish — the runtime may tear the invocation
  // down as soon as the response is sent, and in testing that silently dropped
  // most of the counts. `after` is Next's supported way to run work once the
  // response is out: it still does not block the redirect, but it does complete.
  //
  // Failures stay swallowed inside recordClick: a visitor must never be held up,
  // or shown an error, because an analytics write failed.
  after(() => recordClick(casinoSlug, offerSlug))

  // 302, never 301. A permanent redirect would be cached by the browser, so a
  // destination changed in the admin would keep sending returning visitors to
  // the old operator URL — defeating the reason this route exists.
  return NextResponse.redirect(destination, 302)
}

async function recordClick(casinoSlug: string, offerSlug: string | null): Promise<void> {
  const key = process.env.API_SITE_KEY
  const site = process.env.NEXT_PUBLIC_SITE_SLUG

  if (!key || !site) return

  try {
    await fetch(`${API_URL}/sites/${site}/affiliate-clicks`, {
      method: 'POST',
      headers: {
        'X-Site-Key': key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ casino_slug: casinoSlug, offer_slug: offerSlug }),
      cache: 'no-store',
    })
  } catch {
    // Deliberately silent — see the call site.
  }
}
