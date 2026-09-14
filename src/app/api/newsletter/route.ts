import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'

// Wraps the upstream newsletter subscribe endpoint so API_SITE_KEY stays
// server-side only. Called by the client NewsletterForm component.
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
// Resolved through the same helper lib/api.ts uses. Reading process.env.API_URL
// directly made this route the ONLY thing in the app that hard-required that
// variable: config.ts treats it as an optional override with a real fallback, so
// an environment without it served every page fine and 500'd on every subscribe.
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  let email: string
  let fullName: string
  let website: string
  try {
    const body = await req.json()
    email = String(body.email ?? '')
    // Honeypot. Forwarded verbatim so the SERVER decides — a proxy that
    // silently dropped it would disable the trap for every site at once.
    website = String(body.website ?? '')
    // Optional — only some forms (e.g. the subscribe modal) collect a name.
    fullName = String(body.full_name ?? '').trim()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const res = await fetch(`${API}/sites/${SITE}/newsletter`, {
    method: 'POST',
    headers: {
      'X-Site-Key': KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, ...(fullName ? { full_name: fullName } : {}), ...(website ? { website } : {}) }),
  })

  // Forward the upstream status + body so the client can surface validation
  // messages (e.g. 422 "You are already subscribed.").
  const data = await res.json().catch(() => ({}))
  // The upstream body is forwarded verbatim, which now includes `suggestion`
  // and `suggested_email` on a 422 — the only validation detail a visitor is
  // ever shown, because it is about their own address and turns a dead form
  // into a corrected signup.
  return NextResponse.json(data, { status: res.status })
}
