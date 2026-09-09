// Fields match SiteResource.php exactly. api_key is never present.
export interface Site {
  id: number
  name: string
  slug: string
  domain: string
  // One short sentence saying what makes this brand different. It is appended to
  // every generated legal page's meta description, so the eleven standard pages
  // stop reading identically across the sibling domains. Null = the previous
  // generic wording.
  positioning: string | null
  revalidation_url: string | null
  settings: Record<string, unknown> | null
  active: boolean
  /**
   * Whether this site mails the people who subscribe to it.
   *
   * Off, the signup form still works and the subscriber is still recorded —
   * only the outbound mail stops, and those subscribers stay unverified because
   * they were never sent a link to click.
   */
  newsletter_emails_enabled: boolean
  /**
   * Does this site publish the countries filter? Opt-in per site, off by
   * default. The public /countries endpoints 404 when it is false, so this is
   * what the front end reads to decide whether to render the nav link at all.
   */
  countries_enabled: boolean
  /**
   * Does this site display AND accept visitor reviews? Opt-in per site, off by
   * default. Gates both directions — the public read and write endpoints 404
   * when it is false.
   */
  reviews_enabled: boolean
  review_auto_publish: boolean
  /** Whether this site renders the casino's factual operator profile. */
  operator_profile_enabled: boolean
  /** Whether reviews carry a named reviewer. Requires author_name to be set. */
  byline_enabled: boolean
  /** Whether this site publishes editorial guides. */
  guides_enabled: boolean
  /**
   * Cache health, denormalised so the sites list needs no aggregate.
   *
   * Null until the first attempt. A `failed` status with an error is the state
   * that matters: it means an editor's save did not reach the public site.
   */
  last_revalidated_at: string | null
  last_revalidation_status: 'success' | 'failed' | null
  last_revalidation_error: string | null
  author_name: string | null
  author_role: string | null
  author_bio: string | null
  author_avatar_path: string | null
  /** Slug of the CMS page describing how reviews are done. */
  methodology_page_slug: string | null
  created_at: string
  updated_at: string
}

// Returned only by POST /admin/sites and POST /admin/sites/{id}/rotate-key.
// The api_key is the plain text value shown exactly once.
export interface SiteRegistrationResponse extends Site {
  api_key: string
  this_key_will_not_be_shown_again: true
}
