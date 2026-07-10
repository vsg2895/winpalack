import { NextRequest, NextResponse } from 'next/server'

// Wraps the upstream newsletter subscribe endpoint so API_SITE_KEY stays
// server-side only. Called by the client NewsletterForm component.
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = process.env.API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }

  let email: string
  let fullName: string
  try {
    const body = await req.json()
    email = String(body.email ?? '')
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
    body: JSON.stringify(fullName ? { email, full_name: fullName } : { email }),
  })

  // Forward the upstream status + body so the client can surface validation
  // messages (e.g. 422 "You are already subscribed.").
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
