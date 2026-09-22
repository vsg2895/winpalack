import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'
import { FORUM_COOKIE } from '@/lib/forumSession'

/**
 * Proxies a forum reply to the API.
 *
 * Exists for one reason: `API_SITE_KEY` is server-only and must never reach a
 * browser. The same pattern as /api/newsletter.
 *
 * ── Two credentials, and they are not interchangeable ───────────────────────
 *
 * `X-Site-Key` identifies the SITE and is added here from the server
 * environment. The MEMBER's token is read from the httpOnly session cookie —
 * not from a header the client supplied, because the client cannot read that
 * cookie and therefore cannot send it. This route never mints or inspects the
 * token; it copies it onto one upstream call.
 *
 * A header is still accepted as a fallback for a non-browser caller, but the
 * cookie wins: it is the one the browser actually has.
 *
 * The honeypot is forwarded VERBATIM, including when empty: the server decides
 * whether a submission looks automated, and a proxy that stripped the field
 * would silently disable the trap.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ message: 'Forum is not configured.' }, { status: 500 })
  }

  const { slug } = await ctx.params

  let body: string
  let parentId: number | null
  let website: string

  try {
    const payload = await req.json()
    body = String(payload.body ?? '')
    website = String(payload.website ?? '')
    // Null for a top-level post. The server validates that the parent belongs
    // to this discussion AND is itself top-level — that second check is what
    // keeps nesting at one level.
    parentId = payload.parent_id === null || payload.parent_id === undefined
      ? null
      : Number(payload.parent_id)
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 })
  }

  const cookieToken = req.cookies.get(FORUM_COOKIE)?.value
  const auth = cookieToken ? `Bearer ${cookieToken}` : req.headers.get('authorization')

  const res = await fetch(`${API}/sites/${SITE}/forum/articles/${encodeURIComponent(slug)}/posts`, {
    method: 'POST',
    headers: {
      'X-Site-Key': KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
    body: JSON.stringify({ body, parent_id: parentId, website }),
  })

  // Status and payload forwarded as-is, so the form can render the real message:
  // 403 "confirm your email", 422 validation, 429 rate limited.
  const json = await res.json().catch(() => ({}))

  return NextResponse.json(json, { status: res.status })
}
