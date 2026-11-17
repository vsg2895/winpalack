import { getNews } from '@/lib/api'
import { SITE_URL } from '@/lib/config'
import { isIndexingAllowed } from '@/lib/seo/indexing'
import { buildNewsSitemap } from '@/lib/seo/newsSitemap'

/*
 * /news-sitemap.xml — the Google News sitemap (see lib/seo/newsSitemap.ts).
 *
 * Static with a short revalidation, for two different reasons:
 *  - `getNews()` is tagged `news`, so publishing, editing or hiding a post
 *    through the admin or news:rewrite refreshes this at once (the backend's
 *    RevalidateNextJsSites sends that tag);
 *  - the two-day window moves with the CLOCK, not with any edit, so a post
 *    must also age out when nothing is published at all — hence the 15 min.
 */
export const dynamic = 'force-static'
export const revalidate = 900

export async function GET(): Promise<Response> {
  // Closed deployments (local, staging) advertise nothing, as robots.txt does.
  if (!isIndexingAllowed()) {
    return new Response('Not Found', { status: 404 })
  }

  const body = buildNewsSitemap(await getNews(), {
    siteUrl: SITE_URL,
    publicationName: process.env.NEXT_PUBLIC_SITE_NAME ?? 'Winpalack',
    language: 'en',
    now: new Date(),
  })

  // Nothing published in the window: 404 rather than an empty `<urlset>`.
  // A urlset with no `<url>` is not a valid sitemap, and Search Console
  // rejects the file over it; 404 also matches /news itself, which is not
  // there either while the site publishes nothing.
  if (body === null) {
    return new Response('Not Found', { status: 404 })
  }

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
