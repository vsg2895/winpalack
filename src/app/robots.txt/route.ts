import { getNews } from '@/lib/api'
import { SITE_URL } from '@/lib/config'
import { isIndexingAllowed } from '@/lib/seo/indexing'
import { newsSitemapPosts } from '@/lib/seo/newsSitemap'
import { buildRobotsTxt } from '@/lib/seo/robots'

/*
 * /robots.txt — a route handler rather than `app/robots.ts`, because the file
 * carries a `Content-Signal` line that MetadataRoute.Robots cannot emit. See
 * lib/seo/robots.ts for why that line, and the AI-crawler list, moved here from
 * Cloudflare's managed robots.txt (SEO audit O6).
 *
 * Static: nothing in it varies per request, and `isIndexingAllowed()` is read
 * at build time like the rest of the NEXT_PUBLIC_ configuration.
 *
 * It does read the news, for one line only: the news sitemap is advertised
 * only while it has entries, because otherwise that route answers 404. The
 * revalidation matches the news sitemap's own, so the line appears and
 * disappears with it — the two-day window moves with the clock, not with any
 * edit.
 */
export const dynamic = 'force-static'
export const revalidate = 900

export async function GET(): Promise<Response> {
  // robots.txt must always be served. A crawler that gets a 500 here may treat
  // the whole site as disallowed, so a news lookup that fails costs the site
  // one Sitemap line and nothing else.
  let hasNews = false

  try {
    hasNews = newsSitemapPosts(await getNews(), new Date()).length > 0
  } catch {
    hasNews = false
  }

  return new Response(buildRobotsTxt({ indexing: isIndexingAllowed(), siteUrl: SITE_URL, hasNews }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
