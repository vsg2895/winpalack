import { API_IMAGE } from '@/lib/config'

/*
 * /media/<path> — the API's public storage (`${API_IMAGE}/storage/<path>`),
 * served from THIS domain (SEO audit O8).
 *
 * Uploads used to be referenced as https://api.idevaffiliation.com/storage/…
 * — over a thousand times on the home page alone, in `_next/image?url=`, in
 * plain <img> SVGs and in JSON-LD. That host is shared by every site in the
 * network, so the HTML tied the domains together. lib/images.ts now builds
 * `/media/…`, and next/image optimises it as a local path.
 *
 * A relay rather than a next.config rewrite: a rewrite forwards the upstream
 * response headers verbatim, and the storage host sits behind its own
 * Cloudflare zone — `cf-ray`, `server`, and a `report-to`/`nel` pair carrying
 * that zone's token came through on every image, the same fingerprint moved
 * into the headers. Only the headers below are passed on.
 *
 * Cloudflare caches `/media/*.webp|png|svg|…` by extension, for as long as the
 * storage disk's own `Cache-Control` allows (`max-age=604800, immutable`).
 */

/**
 * The response headers worth keeping from the storage disk. Not
 * `content-length`: fetch() decodes a gzipped body, so the upstream length
 * would no longer match what is sent.
 */
const PASSED_HEADERS = ['content-type', 'cache-control', 'etag', 'last-modified'] as const

/** Conditional request headers, so a revalidation can end in a 304. */
const FORWARDED_HEADERS = ['if-none-match', 'if-modified-since'] as const

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await params

  // Segments arrive decoded. Anything that could step out of /storage/ — or
  // smuggle a separator back in — is not a file there.
  if (path.length === 0 || path.some((s) => s === '' || s === '.' || s === '..' || /[\\/]/.test(s))) {
    return new Response('Not Found', { status: 404 })
  }

  const upstream = `${API_IMAGE}/storage/${path.map(encodeURIComponent).join('/')}`

  const headers = new Headers()
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  let res: Response
  try {
    // No Next data cache: images can exceed its 2 MB item limit, and the edge
    // and the image optimiser already cache what matters.
    res = await fetch(upstream, { headers, cache: 'no-store', redirect: 'error' })
  } catch {
    return new Response('Bad Gateway', { status: 502 })
  }

  if (res.status !== 200 && res.status !== 304) {
    // A missing upload is a plain 404 here, whatever the storage host said.
    return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'public, max-age=300' } })
  }

  const out = new Headers({
    'X-Content-Type-Options': 'nosniff',
    // An uploaded SVG is now served from the site's own origin; opened
    // directly it must not run script there. The same policy next/image sets.
    'Content-Security-Policy': "script-src 'none'; frame-src 'none'; sandbox;",
  })
  for (const name of PASSED_HEADERS) {
    const value = res.headers.get(name)
    if (value) out.set(name, value)
  }

  return new Response(res.status === 304 ? null : res.body, { status: res.status, headers: out })
}
