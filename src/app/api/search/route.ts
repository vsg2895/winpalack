import { NextRequest, NextResponse } from 'next/server'
import { API_URL } from '@/lib/config'

/**
 * Proxies search suggestions so API_SITE_KEY stays server-side only.
 *
 * The overlay is a client component — it has to be, it is a text input — so it
 * cannot call the upstream API directly without shipping the site key into the
 * browser. This handler is the seam: same shape as the newsletter and review
 * proxies, forwarding the upstream status and body verbatim so the client can
 * surface real validation messages rather than a generic failure.
 *
 * Nothing here is site-specific. Copying this file to another site works
 * unchanged, because the slug and key both come from that site's own env.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_SLUG
const API = API_URL
const KEY = process.env.API_SITE_KEY

export async function GET(req: NextRequest) {
  if (!KEY || !SITE || !API) {
    return NextResponse.json({ error: 'Search is unavailable.' }, { status: 500 })
  }

  const params = req.nextUrl.searchParams
  const q = (params.get('q') ?? '').trim()

  // An over-long string never leaves this process; the cap mirrors the API's.
  if (q.length > 100) {
    return NextResponse.json({ query: q, sections: [], total: 0, has_more: false })
  }

  // EMPTY QUERY -> the overlay's idle state: this site's top casinos.
  //
  // Served from /casinos rather than the search index because that endpoint
  // already returns them in the order an admin ranked them for THIS site, which
  // is the only ordering here that means anything. Nothing is claimed about
  // popularity or recency — it is the operator's own list, the same one the
  // homepage shows.
  if (q === '') {
    try {
      const res = await fetch(`${API}/sites/${SITE}/casinos`, {
        headers: { 'X-Site-Key': KEY, Accept: 'application/json' },
        next: { revalidate: 3600, tags: [`site:${SITE}`, 'casinos'] },
        signal: req.signal,
      })

      if (!res.ok) throw new Error(String(res.status))

      const { data } = (await res.json()) as {
        data: Array<{ name: string; slug: string; image_path: string | null }>
      }

      return NextResponse.json({
        featured: data.slice(0, 5).map((c) => ({
          title: c.name,
          url: `/casinos/${c.slug}`,
          image_url: c.image_path,
        })),
      })
    } catch {
      // The idle row is decoration; failing it must not break the overlay.
      return NextResponse.json({ featured: [] })
    }
  }

  // Only the three parameters the API accepts are forwarded. Anything else a
  // caller appends — a site id above all — is dropped here rather than relayed:
  // the upstream resolves the site from the key, and must never be offered an
  // alternative.
  const forwarded = new URLSearchParams({ q })
  const section = params.get('section')
  const page = params.get('page')
  if (section) forwarded.set('section', section)
  if (page) forwarded.set('page', page)

  let res: Response
  try {
    res = await fetch(`${API}/sites/${SITE}/search/suggest?${forwarded}`, {
      headers: { 'X-Site-Key': KEY, Accept: 'application/json' },
      // Never cached by Next: the upstream already caches per query for ~60s,
      // and a second cache here would only add staleness to a live-typing UI.
      cache: 'no-store',
      // The client aborts on every keystroke; propagating that signal lets the
      // upstream request be dropped too instead of running to completion.
      signal: req.signal,
    })
  } catch {
    return NextResponse.json({ error: 'Search is unavailable.' }, { status: 502 })
  }

  const data = await res.json().catch(() => ({}))

  return NextResponse.json(data, { status: res.status })
}
