import { cookies } from 'next/headers'
import { API_URL } from './config'
import type { ForumMember } from '@shared/types/community-forum'

/**
 * The forum member's session.
 *
 * ── The token lives in an httpOnly cookie, never in JavaScript ──────────────
 *
 * The obvious implementation is `localStorage.setItem('token', …)`, and it is
 * the wrong one here. A forum is a page that renders text other people wrote; if
 * a single sanitisation bug ever lets script run, a token in localStorage is
 * readable by that script and the attacker has the member's account. An httpOnly
 * cookie is not readable by script at all, so the same bug costs far less.
 *
 * It also makes the SERVER the place that knows who is signed in, which is what
 * lets the article page decide between the reply form and the sign-in prompt
 * while staying a Server Component. The alternative — deciding on the client —
 * would flash the wrong one on every load.
 *
 * `sameSite: 'lax'` rather than 'strict': a member following a link to a thread
 * from their email or from search must arrive signed in, and a GET navigation is
 * not a CSRF vector. Writes go through POST route handlers on our own origin.
 */
export const FORUM_COOKIE = 'winpalack_forum_session'

const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

/** Cookie options shared by the login and logout handlers, so they cannot drift. */
export const forumCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Not secure in dev, or the cookie is dropped over plain http and nobody can
  // sign in locally.
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  // Matches Sanctum's practical token lifetime here. A member who has not
  // visited in a month signs in again.
  maxAge: 60 * 60 * 24 * 30,
}

/**
 * The signed-in member, or null.
 *
 * Called from Server Components. Returns null for ANY failure — an expired
 * token, a revoked one, a ban, an unreachable API — because every one of those
 * means the same thing to the page: render the signed-out view. A forum that
 * 500s because the session endpoint is slow would be worse than one that shows
 * a sign-in prompt.
 */
export async function getForumMember(): Promise<ForumMember | null> {
  if (!KEY || !SITE || !API) return null

  const token = (await cookies()).get(FORUM_COOKIE)?.value

  if (!token) return null

  try {
    const res = await fetch(`${API}/sites/${SITE}/forum/members/me`, {
      headers: {
        'X-Site-Key': KEY,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      // NEVER cached. This is per-visitor state; an ISR cache here would serve
      // one member's identity to everybody who hit the same page.
      cache: 'no-store',
    })

    if (!res.ok) return null

    const json = (await res.json()) as { data?: ForumMember }

    return json.data ?? null
  } catch {
    return null
  }
}
