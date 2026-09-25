import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'
import { FORUM_COOKIE } from '@/lib/forumSession'

/**
 * Proxies an edit of the member's own post.
 *
 * Same reason as /api/forum/[slug]/posts: `API_SITE_KEY` is server-only and
 * must never reach a browser, and the member's token lives in an httpOnly
 * cookie the client cannot read — so the browser could not send either itself.
 *
 * This route decides nothing. Ownership and whether the post is still editable
 * are the API's call; it refuses with 404 for a post that is not the caller's
 * and 422 for one already published, and both are passed straight back.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ message: 'Not configured.' }, { status: 500 })
  }

  const token = req.cookies.get(FORUM_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ message: 'Sign in to edit your post.' }, { status: 401 })
  }

  const { id } = await ctx.params

  // Digits only. The id goes into an upstream URL, and a path segment taken
  // from the request is exactly where a traversal would be attempted.
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ message: 'Unknown post.' }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const res = await fetch(`${API}/sites/${SITE}/forum/posts/${id}`, {
    method: 'PATCH',
    headers: {
      'X-Site-Key': KEY,
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    // The honeypot is forwarded verbatim, empty included — the server decides
    // what looks automated, and stripping it would disable the trap.
    body: JSON.stringify({ body: body.body ?? '', website: body.website ?? '' }),
    cache: 'no-store',
  })

  const payload = await res.json().catch(() => ({}))

  return NextResponse.json(payload, { status: res.status })
}
