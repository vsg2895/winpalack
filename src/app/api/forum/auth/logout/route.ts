import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'
import { FORUM_COOKIE, forumCookieOptions } from '@/lib/forumSession'

/**
 * Sign out.
 *
 * Revokes the token upstream AND clears the cookie. Clearing only the cookie
 * would leave a live token on the server that anyone who had captured it could
 * keep using — a sign-out that does not revoke is a sign-out in name only.
 *
 * The cookie is cleared even when the upstream call fails: the member asked to
 * be signed out on this device, and that must not depend on the API answering.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest) {
  const token = req.cookies.get(FORUM_COOKIE)?.value

  if (token && KEY && SITE && API) {
    try {
      await fetch(`${API}/sites/${SITE}/forum/members/logout`, {
        method: 'POST',
        headers: { 'X-Site-Key': KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
    } catch {
      // Best effort — the cookie still goes.
    }
  }

  const out = NextResponse.json({ data: { signed_out: true } })

  out.cookies.set(FORUM_COOKIE, '', { ...forumCookieOptions, maxAge: 0 })

  return out
}
