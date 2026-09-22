import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'
import { FORUM_COOKIE, forumCookieOptions } from '@/lib/forumSession'

/**
 * Sign in, and put the token somewhere script cannot read it.
 *
 * The API returns a bearer token. This handler is the ONLY place it is ever
 * handled, and it goes straight into an httpOnly cookie — it is never returned
 * to the browser in the response body, so no client code can read it, store it
 * or leak it. See lib/forumSession.ts for why that matters on a page that
 * renders other people's text.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ message: 'Forum is not configured.' }, { status: 500 })
  }

  let email: string
  let password: string

  try {
    const body = await req.json()
    email = String(body.email ?? '')
    password = String(body.password ?? '')
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 })
  }

  const res = await fetch(`${API}/sites/${SITE}/forum/members/login`, {
    method: 'POST',
    headers: { 'X-Site-Key': KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const json = (await res.json().catch(() => ({}))) as {
    data?: { token?: string; member?: unknown }
    message?: string
  }

  if (!res.ok || !json.data?.token) {
    // The API returns one generic message for a bad address and a bad password
    // alike, so the endpoint cannot be used to enumerate accounts. Forwarded
    // verbatim rather than reworded, or this layer would undo that.
    return NextResponse.json({ message: json.message ?? 'Could not sign in.' }, { status: res.status || 422 })
  }

  // The member object goes back so the UI can greet them; the TOKEN does not.
  const out = NextResponse.json({ data: { member: json.data.member } })

  out.cookies.set(FORUM_COOKIE, json.data.token, forumCookieOptions)

  return out
}
