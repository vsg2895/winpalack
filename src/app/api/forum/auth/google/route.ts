import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'
import { FORUM_COOKIE, forumCookieOptions } from '@/lib/forumSession'

/**
 * Sign in with Google, and put the token somewhere script cannot read it.
 *
 * The browser gets an ID token from Google Identity Services and posts it here;
 * this handler forwards it to the API with the site key — which never leaves the
 * server — and drops the bearer token straight into an httpOnly cookie. Exactly
 * the shape of the password login handler beside it, for exactly the same
 * reason: the token is never returned to the browser, so no client code can
 * read, store or leak it.
 *
 * The ID TOKEN is a credential too, but a short-lived one that is useless
 * without our client id, and it only travels browser → here → API.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ message: 'Sign-in is not configured.' }, { status: 500 })
  }

  let idToken: string

  try {
    const body = await req.json()
    idToken = String(body.id_token ?? '')
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 })
  }

  if (!idToken) {
    return NextResponse.json({ message: 'Missing Google credential.' }, { status: 400 })
  }

  const res = await fetch(`${API}/sites/${SITE}/forum/members/google`, {
    method: 'POST',
    headers: { 'X-Site-Key': KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })

  const json = (await res.json().catch(() => ({}))) as {
    data?: { token?: string; member?: unknown }
    message?: string
  }

  if (!res.ok || !json.data?.token) {
    // Forwarded verbatim: the API answers every verification failure with one
    // generic message on purpose, and rewording it here would undo that.
    return NextResponse.json(
      { message: json.message ?? 'Could not sign in with Google.' },
      { status: res.status || 422 },
    )
  }

  const out = NextResponse.json({ data: { member: json.data.member } })

  out.cookies.set(FORUM_COOKIE, json.data.token, forumCookieOptions)

  return out
}
