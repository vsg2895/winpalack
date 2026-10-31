import { SITE_URL } from '../config'

/**
 * Whether search engines may crawl this deployment at all.
 *
 * `NEXT_PUBLIC_ALLOW_INDEXING` decides when it is set:
 *   - "false" closes the site (staging, previews, a copy on a spare domain);
 *   - "true"  opens it.
 *
 * UNSET, the site's own URL decides: open only for a real public https host.
 * That default is the point. A forgotten variable on the production server must
 * not take winpalack.com out of Google, and a forgotten one on a laptop must not
 * expose localhost — so the safe answer differs by environment, and the URL the
 * build already carries is what tells them apart.
 *
 * Read at BUILD time like every NEXT_PUBLIC_ variable: robots.txt is prerendered.
 */
export function isIndexingAllowed(): boolean {
  const flag = process.env.NEXT_PUBLIC_ALLOW_INDEXING?.trim().toLowerCase()

  if (flag === 'false') return false
  if (flag === 'true') return true

  let url: URL
  try {
    url = new URL(SITE_URL)
  } catch {
    return false
  }

  const host = url.hostname
  const isLocal =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.test') ||
    // Any IPv4 or IPv6 literal: no public site is served from a bare address.
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host.includes(':')

  return url.protocol === 'https:' && !isLocal
}
