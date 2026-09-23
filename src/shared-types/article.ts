// Fields match ArticleResource.php — one editorial guide.
//
// The ONLY content type in this application that is not shared between the six
// domains. Casinos, categories and offers are global master data, which is why
// so much effort goes into keeping their pages distinct; an article's text
// belongs to one site, so nothing here needs de-duplicating.

export interface Article {
  id: number
  site_id: number
  /** Which section this belongs to: evergreen guide, or dated news post. */
  type: 'guide' | 'news'
  /**
   * The publication this item's FACTS came from, when it was ingested from a
   * feed rather than written in the admin. Null for everything hand-written.
   *
   * The copy itself is always original — only the facts are borrowed — so this
   * is a credit and a provenance trail, not an authorship claim.
   */
  source_name: string | null
  /** The original article, for the outbound credit link. */
  source_url: string | null
  title: string
  slug: string
  excerpt: string | null
  /** Minutes to read at 200 wpm, computed from the body. Null when empty. */
  read_minutes: number | null
  /**
   * Absent from LISTING responses — twenty cards do not need twenty full
   * articles, and shipping them would make the guides index the heaviest
   * response on the site.
   */
  body?: string | null
  hero_image_path: string | null
  /**
   * ISO-8601. The only publication control: null is a draft, a past date is
   * live, a future date is scheduled. The public API never returns a draft or a
   * future-dated article at all.
   */
  published_at: string | null
  position: number
  /** Shown on the site. Separate from published_at, which is the date. */
  active: boolean
  /** Promoted to the home page's Best News strip. */
  featured: boolean
  /** Editorial section. Null is valid — the post publishes without a badge. */
  news_category_id: number | null
  news_category?: { id: number; name: string; slug: string } | null
  meta_title: string | null
  meta_description: string | null
  canonical_url: string | null
  noindex: boolean
  updated_at: string | null
}

export interface UpsertArticlePayload {
  title: string
  /** Generated from the title when omitted. Ignored on a published article. */
  slug?: string | null
  excerpt?: string | null
  body?: string | null
  hero_image_path?: string | null
  published_at?: string | null
  position?: number
  active?: boolean
  featured?: boolean
  news_category_id?: number | null
  meta_title?: string | null
  meta_description?: string | null
  canonical_url?: string | null
  noindex?: boolean
}
