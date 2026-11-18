import type { Article } from '@shared/types/article'

/**
 * The Google News sitemap: `news:news` entries for recent posts, plain `<url>`
 * entries for the rest.
 *
 * Google's rules, which are what this encodes
 * (developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap):
 *  - only articles published in the last TWO DAYS carry the `<news:news>`
 *    block;
 *  - once a post is older than that, the choice Google offers is "remove the
 *    URL, OR keep the URL and drop its `<news:news>` metadata". This file takes
 *    the SECOND option, and that is the whole point of it — see below;
 *  - at most 1,000 URLs;
 *  - each news entry carries the publication name, its language, the
 *    publication date and the title.
 *
 * WHY THE OLDER POSTS STAY, AS PLAIN ENTRIES. They used to be dropped, which
 * left a site that had not published for 48 hours with NO entries at all — and
 * a `<urlset>` with no `<url>` child is not a valid sitemap, so the route
 * answered 404 instead. Search Console does not treat a submitted sitemap that
 * 404s as "nothing new today": it records "Couldn't fetch — HTTP 404" against
 * the file and reports 0 discovered pages, which is exactly what winpalack.com
 * was showing. Keeping the older URLs (without the news metadata, as Google
 * documents) means the file is a valid, fetchable sitemap for as long as the
 * site has a single indexable post, whatever the publishing schedule does.
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

/** Milliseconds of `published_at`, or null when it is missing or unparseable. */
function publishedAt(post: Article): number | null {
  if (!post.published_at) return null
  const at = Date.parse(post.published_at)

  return Number.isFinite(at) ? at : null
}

/**
 * Every post this sitemap may carry at `now`, newest first.
 *
 * News only, indexable, published, and not scheduled for the future — a
 * scheduled post is not published yet. This is also the predicate robots.txt
 * asks before advertising the file, so the two can never disagree about
 * whether there is a sitemap to fetch.
 */
export function indexableNewsPosts(posts: Article[], now: Date): Article[] {
  const nowMs = now.getTime()

  return posts
    .filter((post) => {
      if (post.type !== 'news' || post.noindex) return false
      const at = publishedAt(post)

      return at !== null && at <= nowMs
    })
    .sort((a, b) => publishedAt(b)! - publishedAt(a)!)
    .slice(0, NEWS_MAX_URLS)
}

/** The posts that carry a `<news:news>` block at `now` — the two-day window. */
export function newsSitemapPosts(posts: Article[], now: Date): Article[] {
  const cutoff = now.getTime() - NEWS_WINDOW_MS

  return indexableNewsPosts(posts, now).filter((post) => publishedAt(post)! >= cutoff)
}

/**
 * The sitemap XML, or NULL when the site has no indexable news post at all.
 *
 * Null rather than an empty `<urlset>`: a urlset with no `<url>` child is not
 * a valid sitemap, and Search Console rejects the whole file for it
 * ("Missing XML tag … parent tag: urlset, tag: url"). The caller answers 404
 * instead, and robots.txt stops advertising the file at the same moment —
 * both read {@link indexableNewsPosts}.
 */
export function buildNewsSitemap(
  posts: Article[],
  options: { siteUrl: string; publicationName: string; language: string; now: Date },
): string | null {
  const all = indexableNewsPosts(posts, options.now)

  if (all.length === 0) {
    return null
  }

  const cutoff = options.now.getTime() - NEWS_WINDOW_MS

  const entries = all
    .map((post) => {
      const loc = `    <loc>${xml(`${options.siteUrl}/news/${post.slug}`)}</loc>`

      // Older than the window: the URL stays, its news metadata does not.
      // `lastmod` in its place, so the entry still tells a crawler something.
      if (publishedAt(post)! < cutoff) {
        const lastmod = post.updated_at ?? post.published_at!
        const at = Date.parse(lastmod)

        return `  <url>
${loc}
    <lastmod>${xml(new Date(Number.isFinite(at) ? at : publishedAt(post)!).toISOString())}</lastmod>
  </url>`
      }

      return `  <url>
${loc}
    <news:news>
      <news:publication>
        <news:name>${xml(options.publicationName)}</news:name>
        <news:language>${xml(options.language)}</news:language>
      </news:publication>
      <news:publication_date>${xml(new Date(publishedAt(post)!).toISOString())}</news:publication_date>
      <news:title>${xml(post.title)}</news:title>
    </news:news>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries}
</urlset>
`
}
