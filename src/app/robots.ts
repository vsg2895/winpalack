import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'


export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /go/* are outbound affiliate redirects, not content. Crawling them
      // wastes budget on 302s, inflates the click counts with bot traffic and
      // points crawlers at operator sites we do not control.
      /*
       * /cdn-cgi/ is CLOUDFLARE'S path, not one this app serves.
       *
       * Cloudflare's Email Obfuscation feature rewrites the `mailto:` links in
       * the HTML it proxies into /cdn-cgi/l/email-protection — and this site
       * does emit them: twelve, from the support and compliance addresses on
       * the legal pages (backend App\Support\LegalPageContent). Google crawled
       * the rewritten form while the site sat behind Cloudflare, and Search
       * Console still reports those URLs as 404s now that it does not.
       *
       * THIS LINE DOES NOT FIX THAT, and is not meant to. A 404 is already the
       * correct answer for a URL this app never served, and blocking a path
       * here actually keeps it in the report LONGER, because Google can no
       * longer recrawl to confirm the 404. It is here so that the same URLs are
       * never crawled as content if Cloudflare is put back in front.
       */
      disallow: ['/api/', '/go/', '/cdn-cgi/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
