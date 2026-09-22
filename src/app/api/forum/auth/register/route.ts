import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'

/**
 * Register.
 *
 * Deliberately sets NO cookie: the API does not sign a new account in, because
 * the address is unconfirmed and every write endpoint would refuse it. Handing
 * back a session here would make an unusable account look like a working one.
 *
 * The honeypot is forwarded verbatim, empty included — the server decides what
 * looks automated, and a proxy that stripped the field would disable the trap.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function POST(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ message: 'Forum is not configured.' }, { status: 500 })
  }

  let payload: Record<string, unknown>

  try {
    const body = await req.json()
    payload = {
      display_name: String(body.display_name ?? ''),
      email: String(body.email ?? ''),
      password: String(body.password ?? ''),
      password_confirmation: String(body.password_confirmation ?? ''),
      website: String(body.website ?? ''),
    }
  } catch {
    return NextResponse.json({ message: 'Malformed request.' }, { status: 400 })
  }

  const res = await fetch(`${API}/sites/${SITE}/forum/members/register`, {
    method: 'POST',
    headers: { 'X-Site-Key': KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })

  const json = await res.json().catch(() => ({}))

  // Status and validation errors forwarded as-is so the form can show which
  // field was wrong — except that the honeypot is never named, which the API
  // already handles.
  return NextResponse.json(json, { status: res.status })
}
