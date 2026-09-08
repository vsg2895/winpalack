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
      disallow: ['/api/', '/go/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
