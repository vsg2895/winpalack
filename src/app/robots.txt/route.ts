import { SITE_URL } from '@/lib/config'
import { isIndexingAllowed } from '@/lib/seo/indexing'
import { buildRobotsTxt } from '@/lib/seo/robots'

/*
 * /robots.txt — a route handler rather than `app/robots.ts`, because the file
 * carries a `Content-Signal` line that MetadataRoute.Robots cannot emit. See
 * lib/seo/robots.ts for why that line, and the AI-crawler list, moved here from
 * Cloudflare's managed robots.txt (SEO audit O6).
 *
 * Static: nothing in it varies per request, and `isIndexingAllowed()` is read
 * at build time like the rest of the NEXT_PUBLIC_ configuration.
 */
export const dynamic = 'force-static'

export function GET(): Response {
  return new Response(buildRobotsTxt({ indexing: isIndexingAllowed(), siteUrl: SITE_URL }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
