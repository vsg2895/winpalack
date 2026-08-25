import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'

/**
 * RFC 8058 one-click unsubscribe, on this site's own domain.
 *
 * Target of the List-Unsubscribe / List-Unsubscribe-Post headers on the
 * verification email. It exists so that header can advertise the brand domain
 * instead of the API host — a message asking the recipient to trust a link should
 * not point its unsubscribe at somewhere they have never heard of.
 *
 * A pass-through and nothing more: the opt-out itself is still recorded by the
 * upstream endpoint, from the same token, into the same table. No logic is
 * duplicated here and none is replaced.
 *
 * POST-ONLY, deliberately. Mail-server link scanners GET every URL in a message;
 * a GET that unsubscribed would silently empty the list. The human-facing
 * confirmation page lives at /unsubscribe/[token] and asks before acting.
 *
 * No site key is sent: the opaque token is the credential, which is what lets a
 * mailbox provider call this with no knowledge of our auth.
 */
const API = API_URL

// Always 200 — never reveal whether a token is real, and never hand a provider a
// failure it would retry. Mirrors the upstream controller's contract.
const ok = () => NextResponse.json({ ok: true })

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params

  if (!API || !token) {
    return ok()
  }

  try {
    // API is e.g. https://api.example.com/api/v1/public → drop the trailing
    // /public, matching how lib/api.ts reaches the keyless endpoints.
    const base = API.replace(/\/public\/?$/, '')
    await fetch(`${base}/unsubscribe/${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
  } catch {
    // Swallowed on purpose: a provider must not see a 5xx and retry a request
    // that may already have succeeded upstream.
  }

  return ok()
}
