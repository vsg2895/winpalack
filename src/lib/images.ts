import { API_IMAGE, SITE_URL } from './config'

/** Where uploads are served on THIS domain: app/media/[...path]/route.ts relays `${API_IMAGE}/storage/`. */
const MEDIA_BASE = '/media/'

const STORAGE_BASE = `${API_IMAGE}/storage/`

/**
 * Resolve a stored image path (e.g. "uploads/banner/uuid.webp") to a
 * same-origin URL, `/media/uploads/banner/uuid.webp`.
 *
 * Same-origin on purpose (SEO audit O8): the storage disk's own host is shared
 * by every site in the network, and naming it in the HTML ties them together.
 * A full URL on that host is folded to `/media/…` too; any other absolute URL
 * passes through unchanged (and fails next/image's remotePatterns, as before).
 *
 * Relative, so it suits next/image and <img>. Where a crawler needs an
 * absolute URL — JSON-LD, Open Graph — use absoluteImageUrl().
 */
export function resolveImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith(STORAGE_BASE)) return MEDIA_BASE + path.slice(STORAGE_BASE.length)
  if (/^https?:\/\//.test(path)) return path
  return MEDIA_BASE + path.replace(/^\/+/, '')
}

/** resolveImageUrl() on this site's own origin, for JSON-LD and Open Graph. */
export function absoluteImageUrl(path: string | null | undefined): string | null {
  const url = resolveImageUrl(path)
  return url && url.startsWith('/') ? `${SITE_URL}${url}` : url
}

/**
 * `sizes` for an image spanning the 90rem page measure (casino banner, offer
 * banner, news hero): `main` is `px-4 sm:px-6 lg:px-8` around `max-w-[90rem]`,
 * so the box is the viewport minus 2 / 3 / 4rem, capped at 1440px from 1504px.
 * Measured in the browser at 360–1600px (SEO audit O3). The old value claimed
 * 1440px from 1024px up and fetched up to 40% too many pixels in between.
 * Change it with the padding, or the browser picks the wrong srcset entry.
 */
export const PAGE_WIDE_IMAGE_SIZES =
  '(min-width: 1504px) 1440px, (min-width: 1024px) calc(100vw - 4rem), (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)'

/** `sizes` for the guide hero: `px-4` around a 48rem (768px) article. */
export const ARTICLE_IMAGE_SIZES = '(min-width: 800px) 768px, calc(100vw - 2rem)'
