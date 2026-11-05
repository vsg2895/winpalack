import type { Article } from '@shared/types/article'

/**
 * The Google News sitemap: `news:news` entries for recent posts only.
 *
 * Google's rules, which are what this encodes:
 *  - only articles published in the last TWO DAYS (older ones may stay in the
 *    regular sitemap, which still lists every post);
 *  - at most 1,000 URLs;
 *  - each with the publication name, its language, the publication date and
 *    the title.
 *
 * Only posts this site has asked to be indexed: a `noindex` post (still the
 * source's wording, before news:rewrite) is never submitted — the same rule
 * app/sitemap.ts follows. The listing endpoint already leaves out drafts,
 * future-dated posts and any post without a body (Article::scopeVisible).
 */
export const NEWS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000
export const NEWS_MAX_URLS = 1000

/** The five characters XML will not take as text, escaped. */
function xml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** The posts that belong in the news sitemap at `now`, newest first. */
export function newsSitemapPosts(posts: Article[], now: Date): Article[] {
  const cutoff = now.getTime() - NEWS_WINDOW_MS

  return posts
    .filter((post) => {
      if (post.type !== 'news' || post.noindex || !post.published_at) return false
      const at = Date.parse(post.published_at)
      // Not in the future either: a scheduled post is not published yet.
      return Number.isFinite(at) && at >= cutoff && at <= now.getTime()
    })
    .sort((a, b) => Date.parse(b.published_at!) - Date.parse(a.published_at!))
    .slice(0, NEWS_MAX_URLS)
}

export function buildNewsSitemap(
  posts: Article[],
  options: { siteUrl: string; publicationName: string; language: string; now: Date },
): string {
  const entries = newsSitemapPosts(posts, options.now)
    .map(
      (post) => `  <url>
    <loc>${xml(`${options.siteUrl}/news/${post.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xml(options.publicationName)}</news:name>
        <news:language>${xml(options.language)}</news:language>
      </news:publication>
      <news:publication_date>${xml(new Date(post.published_at!).toISOString())}</news:publication_date>
      <news:title>${xml(post.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries}
</urlset>
`
}
