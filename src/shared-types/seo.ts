// Resolved SEO for one record, plus the per-site patterns behind it.
//
// ADDITIVE to the existing `meta_title` / `meta_description` fields, which are
// unchanged and still mean what they always meant. A site that has not adopted
// stored patterns ignores this block entirely.

export type SeoEntity = 'casino' | 'special_offer' | 'category' | 'page' | 'listing'

/**
 * What the API resolved for this record, server-side.
 *
 * `title` and `description` are null when neither a per-record override nor a
 * site pattern exists — the front end reads that as "use my own wording", which
 * is what keeps the feature invisible until a site adopts it. Patterns and
 * tokens are never sent to the client.
 */
export interface ResolvedSeo {
  title: string | null
  description: string | null
  /** Absolute URL, or null when the page is its own canonical. */
  canonical_url: string | null
  noindex: boolean
}

/** One entity's patterns for one site. Tokens: {{name}}, {{site_name}}, {{year}}, {{month}}. */
export interface SeoTemplate {
  entity: SeoEntity
  title_pattern: string | null
  description_pattern: string | null
}
