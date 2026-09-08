import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'

/**
 * Proxies a review submission so API_SITE_KEY stays server-side only.
 *
 * Same shape as the newsletter route: the browser never sees the site key, and
 * the upstream status and body are forwarded verbatim so the client can surface
 * real validation messages (422 field errors) rather than a generic failure.
 *
 * The upstream 404s when the site has reviews switched off, and that 404 is
 * forwarded too — the form should never appear on such a site, but if it somehow
 * does, it fails visibly rather than pretending to have worked.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  let casinoSlug: string
  let payload: Record<string, unknown>

  try {
    const body = (await req.json()) as Record<string, unknown>
    casinoSlug = String(body.casino_slug ?? '').trim()

    // Only the fields the API accepts are forwarded. `status` is deliberately
    // not among them — a submitter must not be able to publish their own review,
    // and the backend ignores it too, but there is no reason to relay it.
    payload = {
      author_name: body.author_name,
      author_email: body.author_email || null,
      rating: body.rating,
      title: body.title || null,
      body: body.body,
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // A slug is a path segment upstream, so an empty or malformed one must not be
  // interpolated into the URL.
  if (!/^[a-z0-9-]+$/i.test(casinoSlug)) {
    return NextResponse.json({ ok: false, message: 'Unknown casino.' }, { status: 400 })
  }

  const res = await fetch(`${API}/sites/${SITE}/casinos/${casinoSlug}/reviews`, {
    method: 'POST',
    headers: {
      'X-Site-Key': KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
