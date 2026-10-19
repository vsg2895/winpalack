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
  /**
   * WHERE `description` came from — a per-record override, or the site pattern.
   *
   * Both arrive as a finished string, so without this the front end cannot tell
   * them apart, and that difference matters. A pattern is a sentence with
   * `{{name}}` substituted into it, so it is near-identical on every record of
   * that type: the special-offer pattern produced "Wagering, minimum deposit
   * and withdrawal caps for <title>, written out before you claim." on all 29
   * offers. An override is something a person typed for that one record.
   *
   * So a page can prefer its own written prose over a PATTERN while still
   * yielding to a genuine override. Absent (undefined) on resources that do not
   * publish it.
   */
  description_from_record?: boolean
}

/** One entity's patterns for one site. Tokens: {{name}}, {{site_name}}, {{year}}, {{month}}. */
export interface SeoTemplate {
  entity: SeoEntity
  title_pattern: string | null
  description_pattern: string | null
}
